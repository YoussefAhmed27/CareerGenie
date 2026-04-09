import os
import math
import numpy as np
import torch
import torch.nn as nn
import cv2
import soundfile as sf
import subprocess as sp
import time

import opensmile
import torchvision.transforms as T
import torchvision.models as models
from transformers import WavLMModel, AutoFeatureExtractor, AutoTokenizer, AutoModel
from nltk.tokenize import word_tokenize
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer

from openface.face_detection import FaceDetector
from openface.landmark_detection import LandmarkDetector
from openface.multitask_model import MultitaskPredictor

DEVICE = 'cuda' if torch.cuda.is_available() else 'cpu'
SAMPLE_RATE = 16000
SEGMENT_SEC = 1.0
HOP_SEC = 0.625  
FPS_SAMPLE = 4.0 

# Determenistic speech analytics
class SpeechAnalyticsExtractor:
    def __init__(self):
        # We solely use OpenSMILE for deep acoustic features (Pitch, Loudness, Jitter)
        self.smile = opensmile.Smile(
            feature_set=opensmile.FeatureSet.GeMAPSv01b,
            feature_level=opensmile.FeatureLevel.Functionals,
        )

    def extract_metrics(self, audio_array, sample_rate, text, duration_sec):
        # Calculate the absolute true duration of the audio slice
        true_audio_sec = len(audio_array) / sample_rate
        if true_audio_sec <= 0.1: true_audio_sec = 0.1

        words = [w for w in word_tokenize(text.lower()) if w.isalpha()]
        word_count = len(words)
        syllables = sum(1 for char in "".join(words) if char in "aeiouy")

        # Acoustic metrics (OpenSmile)
        pitch_variance = 0.0
        loudness_variance = 0.0
        vocal_tremor = 0.0
        
        if len(audio_array) > (sample_rate * 0.5):
            try:
                acoustics = self.smile.process_signal(audio_array, sample_rate)
                pitch_variance = float(acoustics['F0semitoneFrom27.5Hz_sma3nz_stddevNorm'].iloc[0]) * 100
                loudness_variance = float(acoustics['loudness_sma3_stddevNorm'].iloc[0]) * 100
                vocal_tremor = float(acoustics['jitterLocal_sma3nz_amean'].iloc[0]) * 100
            except Exception:
                pass

        # VAD and pause analysis
        frame_len = int(sample_rate * 0.05) # 50ms frames
        frames = [audio_array[i:i+frame_len] for i in range(0, len(audio_array), frame_len)]
        energies = [np.sum(f**2) for f in frames if len(f) > 0]
        
        latency_sec = 0.0
        silence_ratio = 100.0
        longest_pause = 0.0
        avg_pause = 0.0
        active_sec = 0.0
        
        if energies:
            avg_e = np.mean(energies)
            # Threshold adapts to background noise to prevent false silences
            threshold = max(avg_e * 0.05, 1e-5) 
            silent_frames = [1 if e < threshold else 0 for e in energies]
            
            silence_ratio = (sum(silent_frames) / len(energies)) * 100
            
            # Response Latency (Consecutive silent frames before first spoken word)
            for is_silent in silent_frames:
                if is_silent: latency_sec += 0.05
                else: break
                
            # Extract Internal Pauses
            post_latency_frames = silent_frames[int(latency_sec / 0.05):]
            pauses = []
            current_pause = 0
            
            for is_silent in post_latency_frames:
                if is_silent:
                    current_pause += 0.05
                else:
                    if current_pause > 0:
                        pauses.append(current_pause)
                        current_pause = 0
            if current_pause > 0: # Catch a pause at the very end
                pauses.append(current_pause)
                
            if pauses:
                longest_pause = max(pauses)
                avg_pause = np.mean(pauses)

            # Active speaking time is total time minus all dead air
            active_sec = true_audio_sec - (sum(silent_frames) * 0.05)

        # Pacing metrics
        wpm = (word_count / true_audio_sec) * 60
        articulation_rate = (syllables / active_sec) if active_sec > 0 else 0

        return {
            "Pacing (WPM)": round(wpm, 1),
            "Articulation (Syll/sec)": round(articulation_rate, 1),
            "Active Speaking (sec)": round(active_sec, 1),
            "Response Latency (sec)": round(latency_sec, 2),
            "Silence Ratio (%)": round(silence_ratio, 1),
            "Longest Pause (sec)": round(longest_pause, 2),
            "Avg Pause (sec)": round(avg_pause, 2),
            "Expressiveness (Pitch Var)": round(pitch_variance, 2),
            "Volume Dynamics": round(loudness_variance, 2),
            "Vocal Tremor (Jitter)": round(vocal_tremor, 3)
        }

# Neural Network Architectures for MER
class VisualFusedTransformer(nn.Module):
    def __init__(self):
        super().__init__()
        self.proj_of = nn.Sequential(nn.Linear(42, 64), nn.LayerNorm(64), nn.GELU())
        self.proj_rn = nn.Sequential(nn.Linear(2048, 64), nn.LayerNorm(64), nn.Dropout(0.4), nn.GELU())
        self.input_proj = nn.Sequential(nn.Linear(128, 256), nn.LayerNorm(256), nn.Dropout(0.3))
        self.cls_token = nn.Parameter(torch.randn(1, 1, 256) * 0.02)
        self.pos_embed = nn.Parameter(torch.randn(1, 41, 256) * 0.02)
        enc = nn.TransformerEncoderLayer(256, 4, 512, 0.3, 'gelu', norm_first=True, batch_first=True)
        self.transformer = nn.TransformerEncoder(enc, 4, nn.LayerNorm(256))
        self.shared_head = nn.Sequential(nn.Linear(256, 128), nn.GELU(), nn.Dropout(0.3))

    def forward(self, of_feats, rn_feats):
        B, T, _ = of_feats.shape
        x = torch.cat([self.proj_of(of_feats), self.proj_rn(rn_feats)], dim=-1)
        x = self.input_proj(x)
        cls = self.cls_token.expand(B, -1, -1)
        x = self.transformer(torch.cat([cls, x], dim=1) + self.pos_embed[:, :T+1, :])
        return self.shared_head(x[:, 0, :])

class AudioPersonalityTransformer(nn.Module):
    def __init__(self):
        super().__init__()
        self.input_proj = nn.Sequential(nn.Linear(856, 256), nn.LayerNorm(256), nn.Dropout(0.3))
        self.cls_token = nn.Parameter(torch.randn(1, 1, 256) * 0.02)
        self.pos_embed = nn.Parameter(torch.randn(1, 17, 256) * 0.02)
        enc = nn.TransformerEncoderLayer(256, 4, 512, 0.3, 'gelu', norm_first=True, batch_first=True)
        self.transformer = nn.TransformerEncoder(enc, 3, nn.LayerNorm(256))
        self.shared_head = nn.Sequential(nn.Linear(256, 128), nn.GELU(), nn.Dropout(0.3))

    def forward(self, x):
        B, T, _ = x.shape
        x = self.input_proj(x)
        cls = self.cls_token.expand(B, -1, -1)
        x = self.transformer(torch.cat([cls, x], dim=1) + self.pos_embed[:, :T+1, :])
        return self.shared_head(x[:, 0, :])

class TextPersonalityMLPv3(nn.Module):
    def __init__(self):
        super().__init__()
        self.xlmr_tower = nn.Sequential(nn.Linear(768, 256), nn.BatchNorm1d(256), nn.GELU(), nn.Dropout(0.4))
        self.ling_tower = nn.Sequential(nn.Linear(56, 64), nn.BatchNorm1d(64), nn.GELU(), nn.Dropout(0.2))
        self.hidden1 = nn.Sequential(nn.Linear(320, 192), nn.BatchNorm1d(192), nn.GELU(), nn.Dropout(0.4))
        self.hidden2 = nn.Sequential(nn.Linear(192, 192), nn.BatchNorm1d(192), nn.GELU(), nn.Dropout(0.4))
        self.residual_proj = nn.Linear(320, 192)

    def forward(self, x):
        fused = torch.cat([self.xlmr_tower(x[:, :768]), self.ling_tower(x[:, 768:])], dim=1)
        return self.hidden2(self.hidden1(fused)) + self.residual_proj(fused)

class ModalityRouter(nn.Module):
    def __init__(self):
        super().__init__()
        self.vis_proj = nn.Sequential(nn.Linear(128, 64), nn.GELU())
        self.aud_proj = nn.Sequential(nn.Linear(128, 64), nn.GELU())
        self.txt_proj = nn.Sequential(nn.Linear(192, 64), nn.GELU())
        
        self.attn_norm = nn.LayerNorm(192)
        self.attention = nn.Sequential(nn.Linear(64 * 3, 3), nn.Softmax(dim=-1))
        
        self.fusion = nn.Sequential(
            nn.Linear(64 * 3, 128), nn.BatchNorm1d(128), nn.GELU(), nn.Dropout(0.3),
            nn.Linear(128, 64), nn.BatchNorm1d(64), nn.GELU(), nn.Dropout(0.2),
            nn.Linear(64, 12)
        )

    def forward(self, v_feat, a_feat, t_feat, is_listening=False):
        v, a, t = self.vis_proj(v_feat), self.aud_proj(a_feat), self.txt_proj(t_feat)
        concat = torch.cat([v, a, t], dim=-1)
        
        w = self.attention(self.attn_norm(concat))
        
        if is_listening:
            mask = torch.tensor([1.0, 0.0, 0.0], device=w.device).expand_as(w)
            w = mask
            
        routed = torch.cat([v * w[:, 0].unsqueeze(1), a * w[:, 1].unsqueeze(1), t * w[:, 2].unsqueeze(1)], dim=-1)
        return self.fusion(routed)

class CareerGenieEndToEnd(nn.Module):
    def __init__(self):
        super().__init__()
        self.vis_enc = VisualFusedTransformer()
        self.aud_enc = AudioPersonalityTransformer()
        self.txt_enc = TextPersonalityMLPv3()
        self.meta_learner = ModalityRouter()

    def forward(self, v_chunks, a_chunks, t_feat, is_listening=False):
        B, C_v, W_v, D_v = v_chunks.shape
        B, C_a, W_a, D_a = a_chunks.shape
        
        v_flat = v_chunks.view(B * C_v, W_v, D_v)
        a_flat = a_chunks.view(B * C_a, W_a, D_a)
        
        v_out = self.vis_enc(v_flat[:, :, :42], v_flat[:, :, 42:])
        a_out = self.aud_enc(a_flat)
        t_out = self.txt_enc(t_feat)
        
        v_embeds = v_out.view(B, C_v, 128).mean(dim=1)
        a_embeds = a_out.view(B, C_a, 128).mean(dim=1)
        
        return self.meta_learner(v_embeds, a_embeds, t_out, is_listening)

class MERPipeline:
    def __init__(self, weights_path):
        print("Initializing CareerGenie MER Engine (Acoustic Analytics Edition)...")
        
        if DEVICE == 'cuda':
            torch.backends.cudnn.benchmark = True 
            
        self.model = CareerGenieEndToEnd().to(DEVICE)
        self.model.load_state_dict(torch.load(weights_path, map_location=DEVICE), strict=False)
        self.model.eval()
        
        self.trait_names = [
            'Interview Score', 'Answer Score', 'Speaking Skills', 'Confidence', 
            'Facial Expression', 'Overall Perf', 'Openness', 'Conscientiousness', 
            'Extraversion', 'Agreeableness', 'Neuroticism', 'Overall Personality'
        ]
        
        self.min_vals = np.array([-7.8603, -10.1990, -9.4062, -7.2860, -7.4614, -9.3110, -7.7996, -6.9287, -7.1844, -8.4123, -2.5766, -7.5261])
        self.max_vals = np.array([9.3860, 8.7223, 7.9014, 6.8394, 9.2558, 8.8489, 9.3388, 6.6170, 8.9101, 9.2420, 2.2259, 9.2695])

        self.speech_analytics = SpeechAnalyticsExtractor()
        self._init_extractors()

    def _init_extractors(self):
        self.wavlm_extractor = AutoFeatureExtractor.from_pretrained('microsoft/wavlm-base')
        self.wavlm_model = WavLMModel.from_pretrained('microsoft/wavlm-base').to(DEVICE).eval()
        self.smile = opensmile.Smile(feature_set=opensmile.FeatureSet.eGeMAPSv02, feature_level=opensmile.FeatureLevel.Functionals)
        
        self.xlmr_tokenizer = AutoTokenizer.from_pretrained('xlm-roberta-base')
        self.xlmr_model = AutoModel.from_pretrained('xlm-roberta-base').to(DEVICE).eval()
        self.vader = SentimentIntensityAnalyzer()
        
        of_dev = [0] if DEVICE == 'cuda' else None
        self.face_detector = FaceDetector(model_path='./weights/Alignment_RetinaFace.pth', device=DEVICE)
        self.landmark_detector = LandmarkDetector(model_path='./weights/Landmark_98.pkl', device=DEVICE, device_ids=of_dev)
        try:
            self.mt_predictor = MultitaskPredictor(model_path='./weights/MTL_backbone.pth', device=DEVICE, device_ids=of_dev)
        except TypeError:
            self.mt_predictor = MultitaskPredictor(model_path='./weights/MTL_backbone.pth', device=DEVICE)

        self.resnet = models.resnet50(pretrained=True)
        self.resnet.fc = nn.Identity()
        self.resnet = self.resnet.to(DEVICE).eval()

        self.preprocess = T.Compose([
            T.ToPILImage(), T.Resize((224, 224)), T.ToTensor(),
            T.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
        ])

    def chunk_sequence(self, feat, window):
        length = feat.shape[0]
        if length < window:
            pad_len = window - length
            repeated = feat[-1].unsqueeze(0).repeat(pad_len, 1)
            noise = torch.randn_like(repeated) * 1e-4
            return torch.cat([feat, repeated + noise]).unsqueeze(0)
            
        chunks = []
        for i in range(math.ceil(length / window)):
            c = feat[i*window : (i+1)*window]
            if c.shape[0] < window:
                pad_len = window - c.shape[0]
                repeated = c[-1].unsqueeze(0).repeat(pad_len, 1)
                noise = torch.randn_like(repeated) * 1e-4
                c = torch.cat([c, repeated + noise])
            chunks.append(c)
        return torch.stack(chunks)

    def extract_linguistic_features(self, text):
        ling_feats = np.zeros(56, dtype=np.float32)
        words = word_tokenize(text.lower())
        if not words: 
            return ling_feats
            
        import nltk
        from collections import Counter
        try:
            nltk.data.find('taggers/averaged_perceptron_tagger')
        except LookupError:
            nltk.download('averaged_perceptron_tagger', quiet=True)

        ling_feats[0] = len(words) / 100.0  
        ling_feats[1] = len(set(words)) / len(words)  
        ling_feats[2] = np.mean([len(w) for w in words]) / 10.0  

        vader_scores = self.vader.polarity_scores(text)
        ling_feats[3] = vader_scores['neg']
        ling_feats[4] = vader_scores['neu']
        ling_feats[5] = vader_scores['pos']
        ling_feats[6] = vader_scores['compound']

        tags = nltk.pos_tag(words)
        tag_counts = Counter(tag for word, tag in tags)
        ling_feats[7] = sum(tag_counts.get(t, 0) for t in ['NN', 'NNS', 'NNP']) / len(words) 
        ling_feats[8] = sum(tag_counts.get(t, 0) for t in ['VB', 'VBD', 'VBG', 'VBN', 'VBP', 'VBZ']) / len(words) 
        ling_feats[9] = sum(tag_counts.get(t, 0) for t in ['JJ', 'JJR', 'JJS']) / len(words) 
        ling_feats[10] = sum(tag_counts.get(t, 0) for t in ['RB', 'RBR', 'RBS']) / len(words) 
        ling_feats[11] = sum(tag_counts.get(t, 0) for t in ['PRP', 'PRP$']) / len(words) 
        
        fillers = ['um', 'uh', 'like', 'literally', 'basically', 'actually']
        ling_feats[12] = sum(words.count(f) for f in fillers) / len(words)
        
        return ling_feats

    def process_interview(self, video_path, qa_intervals=None):
        start_time = time.time()
        print(f"Processing Interview: {video_path}")
        
        tmp_wav = "tmp_audio.wav"
        sp.run(['ffmpeg', '-y', '-i', str(video_path), '-ac', '1', '-ar', str(SAMPLE_RATE), '-vn', tmp_wav], capture_output=True)
        audio, _ = sf.read(tmp_wav)
        audio = audio.astype(np.float32)
        total_audio_sec = len(audio) / SAMPLE_RATE

        if not qa_intervals:
            qa_intervals = [{"q_id": "Overall Interview", "start": 0.0, "end": total_audio_sec, "transcript": ""}]

        seg_len, hop_len = int(SEGMENT_SEC * SAMPLE_RATE), int(HOP_SEC * SAMPLE_RATE)
        segments = [audio[i:i+seg_len] for i in range(0, len(audio)-seg_len+1, hop_len)]
        if not segments: segments = [np.pad(audio, (0, max(0, seg_len-len(audio))))]
        
        inputs = self.wavlm_extractor(segments, sampling_rate=SAMPLE_RATE, return_tensors='pt', padding=True)
        with torch.no_grad():
            wavlm_feats = self.wavlm_model(inputs['input_values'].to(DEVICE)).last_hidden_state.mean(dim=1).cpu().numpy()
        
        egemaps_list = []
        for seg in segments:
            if len(seg) < int(0.05 * SAMPLE_RATE):
                seg = np.pad(seg, (0, int(0.05 * SAMPLE_RATE) - len(seg)))
            try:
                em = self.smile.process_signal(seg, SAMPLE_RATE).values[0]
            except Exception:
                em = np.zeros(88, dtype=np.float32)
            egemaps_list.append(em)
            
        a_feat = torch.tensor(np.concatenate([wavlm_feats, np.stack(egemaps_list).astype(np.float32)], axis=1).astype(np.float32))

        cap = cv2.VideoCapture(str(video_path))
        fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
        interval = max(1, round(fps / FPS_SAMPLE))
        vis_features = []
        
        frame_batch = []
        openface_batch = []
        idx = 0
        
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        print(f"Total Frames: {total_frames}. GPU Turbo-Batching...")
        
        while True:
            ret, frame = cap.read()
            if not ret: break
            if idx % interval == 0:
                openface_42 = np.zeros(42, dtype=np.float32) 
                try:
                    faces = self.face_detector(frame)
                    if faces is not None and len(faces) > 0:
                        lms = self.landmark_detector(frame, faces)
                        preds = self.mt_predictor(frame, lms)
                        openface_42[:len(preds[0].flatten()[:42])] = preds[0].flatten()[:42]
                except: pass 
                openface_batch.append(openface_42)

                t = self.preprocess(frame)
                frame_batch.append(t)

                if len(frame_batch) == 64:
                    batch_tensor = torch.stack(frame_batch).to(DEVICE)
                    with torch.no_grad():
                        with torch.autocast(device_type=DEVICE if DEVICE == 'cuda' else 'cpu'):
                            resnet_out = self.resnet(batch_tensor).cpu().numpy()
                    
                    for j in range(64):
                        vis_features.append(np.concatenate([openface_batch[j], resnet_out[j]]))
                    
                    frame_batch = []
                    openface_batch = []
            idx += 1
            
        if len(frame_batch) > 0:
            batch_tensor = torch.stack(frame_batch).to(DEVICE)
            with torch.no_grad():
                with torch.autocast(device_type=DEVICE if DEVICE == 'cuda' else 'cpu'):
                    resnet_out = self.resnet(batch_tensor).cpu().numpy()
            for j in range(len(frame_batch)):
                vis_features.append(np.concatenate([openface_batch[j], resnet_out[j]]))

        cap.release()
        
        v_feat = torch.tensor(np.stack(vis_features).astype(np.float32)) if vis_features else torch.zeros((1, 2090))
        v_chunks = self.chunk_sequence(v_feat, 40).unsqueeze(0).to(DEVICE)
        a_chunks = self.chunk_sequence(a_feat, 16).unsqueeze(0).to(DEVICE)

        results = []
        print(f"Extracted features. Aggregating Q&A scores and Analytics...")

        with torch.no_grad():
            for qa in qa_intervals:
                q_id = qa.get("q_id", "Unknown Segment")
                start_t = float(qa["start"])
                end_t = float(qa["end"])
                duration_sec = end_t - start_t
                
                # --- AUDIO EXTRACTION FOR SPEECH ANALYTICS ---
                start_sample = min(int(start_t * SAMPLE_RATE), len(audio))
                end_sample = min(int(end_t * SAMPLE_RATE), len(audio))
                q_audio_chunk = audio[start_sample:end_sample]

                start_idx = math.floor(start_t / 10.0)
                end_idx = math.ceil(end_t / 10.0)
                
                qa_scores_list = []
                full_transcript = qa.get("transcript", "").strip()
                if not full_transcript: full_transcript = "[SILENCE]"
                
                # --- EXTRACT SPEECH ANALYTICS ---
                speech_stats = self.speech_analytics.extract_metrics(q_audio_chunk, SAMPLE_RATE, full_transcript, duration_sec)

                for i in range(start_idx, end_idx):
                    if i >= v_chunks.shape[1] or i >= a_chunks.shape[1]: break
                    
                    inputs = self.xlmr_tokenizer(full_transcript, return_tensors='pt', max_length=128, truncation=True, padding=True).to(DEVICE)
                    out = self.xlmr_model(**inputs)
                    mask = inputs['attention_mask'].unsqueeze(-1).float()
                    xlmr_feat = ((out.last_hidden_state * mask).sum(dim=1) / mask.sum(dim=1).clamp(min=1e-9))[0].cpu().numpy()

                    ling_feats = self.extract_linguistic_features(full_transcript)
                    t_feat = torch.tensor(np.concatenate([xlmr_feat, ling_feats]).astype(np.float32)).unsqueeze(0).to(DEVICE)

                    v_slice = v_chunks[:, i:i+1, :, :]
                    a_slice = a_chunks[:, i:i+1, :, :]

                    raw_pred = self.model(v_slice, a_slice, t_feat, is_listening=False).cpu().numpy()[0]
                    base_scores = (raw_pred - self.min_vals) / (self.max_vals - self.min_vals + 1e-8)
                    
                    MEDIAN = 0.5  
                    STRETCH = 4.0         
                    stretched_scores = MEDIAN + ((base_scores - MEDIAN) * STRETCH)
                    ui_scores = np.clip(stretched_scores * 10.0, 1.0, 10.0)
                    qa_scores_list.append(ui_scores)

                if qa_scores_list:
                    final_q_score = np.mean(qa_scores_list, axis=0)
                else:
                    final_q_score = np.full(12, 5.0) 

                # short answer penalty
                words_spoken = [w for w in word_tokenize(full_transcript.lower()) if w.isalpha()]
                word_count = len(words_spoken)
                
                if full_transcript != "[SILENCE]" and 0 < word_count <= 3:
                    print(f"⚠️ Short Answer Detected ({word_count} words) in {q_id}. Scaling down scores.")
                    penalty_factor = 0.75
                    final_q_score = final_q_score * penalty_factor

                results.append({
                    "segment": q_id,
                    "time_window": f"{int(start_t)}s - {int(end_t)}s",
                    "metrics": {self.trait_names[idx]: round(float(score), 1) for idx, score in enumerate(final_q_score)},
                    "speech_analytics": speech_stats,
                    "transcript": full_transcript
                })

        if os.path.exists(tmp_wav): os.remove(tmp_wav)
        
        end_time = time.time()
        print(f"Q&A Pipeline Complete in {round(end_time - start_time, 2)} seconds.")
        return results
import { useState, useRef, useCallback, useEffect } from 'react';
import { getSharedMediaStream } from './mediaHub';
import { textToVisemes } from '../utils/visemeMapper';
import { uploadInterviewRecording } from '../api/interviewService';

const audioCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
const globalAnalyser = audioCtx.createAnalyser();
globalAnalyser.smoothingTimeConstant = 0.1;
globalAnalyser.fftSize = 256;
globalAnalyser.connect(audioCtx.destination);

const VISEME_WEIGHTS = {
  viseme_PP: 0.4, viseme_FF: 0.6, viseme_TH: 0.7,
  viseme_DD: 0.5, viseme_kk: 0.5, viseme_CH: 0.7,
  viseme_SS: 0.9, viseme_nn: 0.8, viseme_RR: 0.9,
  viseme_aa: 1.2, viseme_E:  1.1, viseme_I:  1.0,
  viseme_O:  1.1, viseme_U:  1.0, jawOpen:   0.5, rest: 0.8,
};
const DEFAULT_WEIGHT = 0.7;
const MS_PER_VISEME  = 0.13;

const CODING_TAG    = '[CODING_CHALLENGE]';
const INTERVIEW_TAG = '[INTERVIEW_COMPLETE]';

function buildSchedule(visemes, startTime, duration) {
  const totalWeight = visemes.reduce((s, v) => s + (VISEME_WEIGHTS[v] ?? DEFAULT_WEIGHT), 0);
  const timePerUnit = duration / totalWeight;
  let cursor = startTime;
  return visemes.map((viseme) => {
    const activateAt = cursor;
    cursor += (VISEME_WEIGHTS[viseme] ?? DEFAULT_WEIGHT) * timePerUnit;
    return { viseme, activateAt };
  });
}

export const useSpeech = (sessionId, isAvatarReady = false) => {
  const [isListening, setIsListening]                 = useState(false);
  const [messages, setMessages]                       = useState([]);
  const [scheduledVisemes, setScheduledVisemes]       = useState([]);
  const [isInterviewComplete, setIsInterviewComplete] = useState(false);
  const [isVideoUploaded, setIsVideoUploaded]         = useState(false);
  const [isAnalyzing, setIsAnalyzing]                 = useState(false);

  const [isCodingQuestion, setIsCodingQuestion]     = useState(false);
  const [codingQuestionText, setCodingQuestionText] = useState('');
  const codingTriggeredRef     = useRef(false);
  const pendingSandboxCloseRef = useRef(false);

  const wsRef              = useRef(null);
  const processorRef       = useRef(null);
  const sourceRef          = useRef(null);
  const nextPlayTimeRef    = useRef(0);
  const isAgentSpeakingRef = useRef(false);

  const mediaRecorderRef   = useRef(null);
  const recordedChunksRef  = useRef([]);

  const utteranceVisemesRef   = useRef([]);
  const utteranceStartTimeRef = useRef(null);
  const utteranceEndTimeRef   = useRef(0);
  const currentAiUtteranceRef = useRef('');

  const recordingStartTimeRef = useRef(null);
  const qaIntervalsRef        = useRef([]);
  const answerStartTimeRef    = useRef(0);
  const questionCounterRef    = useRef(1);
  const currentAnswerTextRef  = useRef('');

  const submitCodeToAgent = useCallback((code, output, language) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    pendingSandboxCloseRef.current = true;
    const message = `Here is my ${language} solution:\n\`\`\`${language}\n${code}\n\`\`\`\nOutput: ${output || '(no output)'}`;
    wsRef.current.send(JSON.stringify({ type: 'InjectUserMessage', content: message }));
  }, []);

  useEffect(() => {
    if (!sessionId || !isAvatarReady) return;

    const ws = new WebSocket(`ws://127.0.0.1:8000/ws/interview/${sessionId}`);
    ws.binaryType = 'arraybuffer';

    ws.onmessage = (event) => {
      if (event.data instanceof ArrayBuffer) {
        if (!isAgentSpeakingRef.current && answerStartTimeRef.current > 0 && recordingStartTimeRef.current) {
            const nowSeconds = (Date.now() - recordingStartTimeRef.current) / 1000;
            if (nowSeconds - answerStartTimeRef.current > 2.0) {
                qaIntervalsRef.current.push({
                    q_id: `Question ${questionCounterRef.current}`,
                    start: answerStartTimeRef.current,
                    end: nowSeconds,
                    transcript: currentAnswerTextRef.current.trim()
                });
                questionCounterRef.current += 1;
            }
            answerStartTimeRef.current = 0;
            currentAnswerTextRef.current = '';
        }

        isAgentSpeakingRef.current = true;
        if (audioCtx.state === 'suspended') audioCtx.resume();

        const int16Array   = new Int16Array(event.data);
        const float32Array = new Float32Array(int16Array.length);
        for (let i = 0; i < int16Array.length; i++) {
          float32Array[i] = int16Array[i] / 32768.0;
        }

        const audioBuffer = audioCtx.createBuffer(1, float32Array.length, 16000);
        audioBuffer.getChannelData(0).set(float32Array);

        const currentTime = audioCtx.currentTime;
        if (nextPlayTimeRef.current < currentTime) nextPlayTimeRef.current = currentTime;

        if (utteranceStartTimeRef.current === null) {
          utteranceStartTimeRef.current = nextPlayTimeRef.current;
        }

        const source = audioCtx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(globalAnalyser);
        source.start(nextPlayTimeRef.current);
        nextPlayTimeRef.current    += audioBuffer.duration;
        utteranceEndTimeRef.current = nextPlayTimeRef.current;

        if (utteranceVisemesRef.current.length > 0 && utteranceStartTimeRef.current !== null) {
          const audioElapsed   = nextPlayTimeRef.current - utteranceStartTimeRef.current;
          const estimatedTotal = utteranceVisemesRef.current.length * MS_PER_VISEME;
          const duration = Math.max(audioElapsed, estimatedTotal);
          const prelim = buildSchedule(utteranceVisemesRef.current, utteranceStartTimeRef.current, duration);
          setScheduledVisemes(prelim);
        }
      }
      else {
        const data = JSON.parse(event.data);

        if (data.type === 'ai_finished') {
          isAgentSpeakingRef.current = false;

          if (recordingStartTimeRef.current) {
              answerStartTimeRef.current = (Date.now() - recordingStartTimeRef.current) / 1000;
          }

          const visemes   = utteranceVisemesRef.current;
          const startTime = utteranceStartTimeRef.current;
          const endTime   = utteranceEndTimeRef.current;

          if (visemes.length && startTime !== null && endTime > startTime) {
            const exact = buildSchedule(visemes, startTime, endTime - startTime);
            setScheduledVisemes(exact);
          }

          const fullUtterance = currentAiUtteranceRef.current;

          if (fullUtterance.includes(INTERVIEW_TAG)) {
            setIsInterviewComplete(true);
          }

          if (!codingTriggeredRef.current && fullUtterance.includes(CODING_TAG)) {
            codingTriggeredRef.current = true;
            const cleanQuestion = fullUtterance.replace(CODING_TAG, '').replace(INTERVIEW_TAG, '').trim();
            setCodingQuestionText(cleanQuestion);
            const delay = Math.max(0, (endTime - audioCtx.currentTime) * 1000);
            setTimeout(() => setIsCodingQuestion(true), delay + 300);
          }

          if (pendingSandboxCloseRef.current) {
            pendingSandboxCloseRef.current = false;
            setIsCodingQuestion(false);
          }

          utteranceVisemesRef.current   = [];
          utteranceStartTimeRef.current = null;
          utteranceEndTimeRef.current   = 0;
          currentAiUtteranceRef.current = '';
        }

        if (data.type === 'transcript' || data.type === 'ai_response') {
          const senderType = data.type === 'ai_response' ? 'ai' : 'user';

          if (senderType === 'ai') {
            utteranceVisemesRef.current.push(...textToVisemes(data.text));
            currentAiUtteranceRef.current += (currentAiUtteranceRef.current ? ' ' : '') + data.text;
          }

          const cleanText = data.text.replace(CODING_TAG, '').replace(INTERVIEW_TAG, '').trim();

          if (senderType === 'user') {
              currentAnswerTextRef.current += (currentAnswerTextRef.current ? ' ' : '') + cleanText;
          }

          setMessages(prev => {
            if (prev.length > 0 && prev[prev.length - 1].sender === senderType) {
              const updated = [...prev];
              updated[updated.length - 1] = {
                ...updated[updated.length - 1],
                text: updated[updated.length - 1].text + ' ' + cleanText,
              };
              return updated;
            }
            return [...prev, { sender: senderType, text: cleanText }];
          });
        }
      }
    };

    wsRef.current = ws;
    return () => {
      if (ws.readyState === WebSocket.OPEN) ws.close();
    };
  }, [sessionId, isAvatarReady]);

  const startListening = useCallback(async () => {
    if (isListening) return;
    try {
      if (audioCtx.state === 'suspended') await audioCtx.resume();
      const stream = await getSharedMediaStream();
      
      if (!mediaRecorderRef.current) {
        recordedChunksRef.current = [];
        const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
        
        recordingStartTimeRef.current = Date.now();
        
        recorder.ondataavailable = (e) => {
            if (e.data.size > 0) recordedChunksRef.current.push(e.data);
        };

        recorder.onstop = async () => {
            setIsAnalyzing(true);
            const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
            
            if (answerStartTimeRef.current > 0 && recordingStartTimeRef.current) {
                const nowSeconds = (Date.now() - recordingStartTimeRef.current) / 1000;
                if (nowSeconds - answerStartTimeRef.current > 2.0) {
                    qaIntervalsRef.current.push({
                        q_id: `Question ${questionCounterRef.current}`,
                        start: answerStartTimeRef.current,
                        end: nowSeconds,
                        transcript: currentAnswerTextRef.current.trim()
                    });
                }
            }

            await uploadInterviewRecording(sessionId, blob);
            
            const formData = new FormData();
            formData.append('video', blob, `interview_${sessionId}.webm`);
            formData.append('qa_intervals', JSON.stringify(qaIntervalsRef.current));
            
            try {
                const response = await fetch('http://127.0.0.1:8002/api/analyze_interview', {
                    method: 'POST',
                    body: formData,
                });
                const result = await response.json();
                localStorage.setItem(`mer_report_${sessionId}`, JSON.stringify(result.data));
            } catch (err) {
                console.error(err);
            }

            setIsVideoUploaded(true);
            setIsAnalyzing(false);
        };

        recorder.start();
        mediaRecorderRef.current = recorder;
      }

      sourceRef.current    = audioCtx.createMediaStreamSource(stream);
      processorRef.current = audioCtx.createScriptProcessor(4096, 1, 1);
      processorRef.current.onaudioprocess = (e) => {
        if (wsRef.current?.readyState === WebSocket.OPEN && !isAgentSpeakingRef.current) {
          const float32Data = e.inputBuffer.getChannelData(0);
          const int16Data   = new Int16Array(float32Data.length);
          for (let i = 0; i < float32Data.length; i++) {
            int16Data[i] = Math.max(-1, Math.min(1, float32Data[i])) * 32767;
          }
          wsRef.current.send(int16Data.buffer);
        }
      };
      sourceRef.current.connect(processorRef.current);
      processorRef.current.connect(audioCtx.destination);
      setIsListening(true);
    } catch (err) {
      console.error("Mic Error:", err);
    }
  }, [isListening, sessionId]);

  const stopListening = useCallback(() => {
    if (processorRef.current) {
      processorRef.current.disconnect();
      sourceRef.current.disconnect();
    }
    setIsListening(false);
  }, []);

  useEffect(() => {
    if (isInterviewComplete && mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
    }
  }, [isInterviewComplete]);

  useEffect(() => {
    if (isInterviewComplete && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.close();
    }
  }, [isInterviewComplete]);

  const hasAutoStartedRef = useRef(false);

  useEffect(() => {
    if (isAvatarReady && !isInterviewComplete && !hasAutoStartedRef.current) {
      hasAutoStartedRef.current = true;
      startListening();
    }
  }, [isAvatarReady, isInterviewComplete, startListening]);

  return {
    isListening,
    messages,
    analyser: globalAnalyser,
    scheduledVisemes,
    audioCtx,
    startListening,
    stopListening,
    isInterviewComplete,
    isCodingQuestion,
    codingQuestionText,
    submitCodeToAgent,
    isVideoUploaded,
    isAnalyzing,
    setIsInterviewComplete
  };
};
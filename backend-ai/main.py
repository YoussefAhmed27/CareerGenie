import os
import io
import asyncio
import numpy as np
import faiss
import google.generativeai as genai
from fastapi import FastAPI, HTTPException, UploadFile, File, WebSocket, WebSocketDisconnect
from pydantic import BaseModel
from dotenv import load_dotenv
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles  
from PyPDF2 import PdfReader
from faster_whisper import WhisperModel
from piper.voice import PiperVoice
import soundfile as sf
from fastapi.responses import StreamingResponse
import tempfile
import json
import httpx
from groq import Groq
from groq import AsyncGroq
from deepgram import AsyncDeepgramClient
from deepgram.core.events import EventType
import websockets
from functools import lru_cache
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_experimental.text_splitter import SemanticChunker
from langchain_community.vectorstores import FAISS as LangchainFAISS

load_dotenv(override=True)

GROQ_API_KEY     = os.getenv("GROQ_API_KEY")
GEMINI_API_KEY   = os.getenv("GEMINI_API_KEY")
DEEPGRAM_API_KEY = os.getenv("DEEPGRAM_API_KEY")

if not GROQ_API_KEY or not GEMINI_API_KEY or not DEEPGRAM_API_KEY:
    raise RuntimeError("Missing API Keys in .env file (Groq, Gemini, or Deepgram).")

# Toggle between Groq and gpt-4o
USE_OPENAI = False


async_groq_client = AsyncGroq(api_key=GROQ_API_KEY)
genai.configure(api_key=GEMINI_API_KEY)
deepgram = AsyncDeepgramClient(api_key=DEEPGRAM_API_KEY)
tts_client = httpx.AsyncClient(timeout=None)

# Models
GROQ_CHAT_MODEL = "llama-3.3-70b-versatile"
FEEDBACK_MODEL  = "openai/gpt-oss-120b" 
STT_MODEL       = "whisper-large-v3-turbo"
EMBEDDING_MODEL = "models/gemini-embedding-001"

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SESSIONS = {}

# recordings storage
RECORDINGS_DIR = "recordings"
os.makedirs(RECORDINGS_DIR, exist_ok=True)
app.mount("/recordings", StaticFiles(directory=RECORDINGS_DIR), name="recordings")


BEHAVIORAL_SYSTEM_PROMPT = """
You are an Expert HR Coach and Behavioral Analyst conducting a high-end enterprise evaluation.
Analyze the candidate's communication style using the provided interview transcript and the raw Multimodal/Speech metrics.

CRITICAL INSTRUCTIONS:
1. NO EMOJIS. Under no circumstances should you use emojis in your output.
2. BE EXHAUSTIVE: Every summary and bullet point MUST be highly detailed, professional, and at least 2-3 sentences long. Do not write short, lazy fragments. Elaborate deeply on the "why" and "how".
3. DATA CALIBRATION: The raw numerical metrics (e.g., Facial Expression, Big 5) suffer from machine bias and may look artificially low. Cross-reference them against the transcript. If the numbers look low but the transcript shows a highly articulate, coherent answer, weight the transcript heavily to correct the machine's bias.

You must output a STRICT JSON object matching this schema:
{
  "behavioral_score": <float 1-10>,
  "overall_summary": "<string, write a comprehensive 4-5 sentence paragraph analyzing their executive presence, pacing, and confidence>",
  "strengths": [
      "<string, a detailed 3-sentence explanation of a specific communication strength>", 
      "<string, a detailed 3-sentence explanation of another strength>"
  ],
  "weaknesses": [
      "<string, a detailed 3-sentence explanation of a delivery flaw or hesitation>", 
      "<string, a detailed 3-sentence explanation of another weakness>"
  ],
  "improvement_tips": [
      "<string, a detailed, actionable 3-sentence coaching tip>", 
      "<string, a detailed, actionable 3-sentence coaching tip>"
  ],
  "display_metrics": {
     "confidence": <float 1-10>,
     "nervousness": <float 1-10>, 
     "engagement": <float 1-10>,
     "big_5_traits": {
         "openness": <int 1-10>,
         "conscientiousness": <int 1-10>,
         "extraversion": <int 1-10>,
         "agreeableness": <int 1-10>,
         "neuroticism": <int 1-10>
     }
  }
}
"""

TECHNICAL_SYSTEM_PROMPT = """
You are a Senior Engineering Manager and Tech Lead at a top-tier tech firm. 
Evaluate the candidate's technical accuracy, problem-solving skills, and domain knowledge based strictly on their transcript and any submitted code, compared against the Job Description and CV.

CRITICAL INSTRUCTIONS:
1. NO EMOJIS. Professional, enterprise-grade text only.
2. BE EXHAUSTIVE: Every summary, strength, and weakness MUST be a detailed, 2-3 sentence paragraph. Lazy, 5-word bullet points are strictly prohibited.
3. DO NOT evaluate their nervousness or speaking style here. Focus 100% on the engineering facts, vocabulary, algorithm choices, and correctness of their answers.

You must output a STRICT JSON object matching this schema:
{
  "technical_score": <float 1-10>,
  "overall_summary": "<string, a comprehensive 4-5 sentence paragraph critiquing their technical competency and domain expertise>",
  "strengths": [
      "<string, a detailed 3-sentence explanation of a technical strength or correct answer>", 
      "<string, a detailed 3-sentence explanation of another technical strength>"
  ],
  "weaknesses": [
      "<string, a detailed 3-sentence explanation of a knowledge gap or incorrect answer>", 
      "<string, a detailed 3-sentence explanation of another knowledge gap>"
  ],
  "improvement_tips": [
      "<string, a detailed 3-sentence technical study recommendation>", 
      "<string, a detailed 3-sentence technical study recommendation>"
  ],
  "code_review": "<string, a deep, comprehensive paragraph critiquing their code efficiency, Big-O complexity, and syntax. If no code was written, output null>"
}
"""

INTERVIEW_SYSTEM_PROMPT = """
You are "David", a Senior Technical Hiring Manager. You are conducting a high-stakes, professional interview. You are sharp, direct, and time-sensitive. You are not a coach. You are not a friend. You are a gatekeeper.

═══════════════════════════════════════════════════════
THE "INTERNAL MONOLOGUE" (MANDATORY BEHAVIOR)
═══════════════════════════════════════════════════════
1. INFORMATION ASYMMETRY: When you use `search_knowledge_base`, the data returned is your "Private Intuition." The candidate does NOT know you have it. NEVER say "I see here," "According to the RAG," or "Based on your CV." Use the data to craft a question as if you already knew the answer and are just checking if they are lying.
2. ZERO VALIDATION: You are a Senior Partner; you do not have time for pleasantries. ABSOLUTELY NO "Great," "Awesome," "I understand," or "That's interesting." If the candidate finishes speaking, react immediately with your next question.
3. NO PARROTING: Never repeat or summarize what the candidate just said. If they say they know Python, do not say "Since you know Python..."; just ask a question about Python. 
4. BREVITY IS AUTHORITY: Every response MUST be under 40 words. Long responses make you look like an AI. Short, pointed questions make you look like a Boss.

═══════════════════════════════════════════════════════
INTERVIEW STRUCTURE & PACING (STRICT 15 QUESTION CAP)
═══════════════════════════════════════════════════════
You must track the interview flow across these phases:

PHASE 1: Behavioral Friction (3-4 Questions)
Trigger `search_knowledge_base` for role/CV context. Do not ask "Tell me about a time..." instead, find a project in their background and probe the friction: "In your project X, you hit a deadline conflict. How did you decide what to cut?" 
*RULE:* One follow-up max. If they are vague, move to the next topic. Do not "drag" the conversation.

PHASE 2: Technical Cross-Examination (4-5 Questions)
Trigger `search_knowledge_base`. Compare the JD requirements against the CV. Find the "Weakest Link." If the JD requires Microservices and they only have Monolith experience, grill them on that gap. Ask for architectural trade-offs, not definitions.

PHASE 3: Role-Specific Coding (1 Question - Technical Roles Only)
Ask ONE coding challenge relevant to Job role.
APPEND: [CODING_CHALLENGE] to the end of your question.
Evaluation: One sentence of objective feedback. No corrections. Move to Close.

PHASE 4: Conclusion
Professional sign-off.
APPEND: [INTERVIEW_COMPLETE] to the end of your final sentence.

═══════════════════════════════════════════════════════
EDGE CASE PROTOCOL
═══════════════════════════════════════════════════════
- Candidate Deflects: Interrupt them (metaphorically). "That doesn't answer the question. Specifically, how did you handle X?"
- Candidate Asks a Question: "I am here to evaluate your fit today; we can discuss my background later. [Next Question]."
- Contradictions: Address them immediately. "Five minutes ago you said X, now you're saying Y. Which is it?"

OUTPUT: Raw plain text only. No markdown. Never speak tags aloud.
"""

# --- PYDANTIC MODELS ---
class SessionStartRequest(BaseModel):
    cv_text: str
    jd_text: str
    voice_id: str = "aura-orpheus-en" 

class ChatRequest(BaseModel):
    session_id: str
    message: str

class SynthesisRequest(BaseModel):
    text: str

class FeedbackRequest(BaseModel):
    session_id: str
    mer_data: list = []

# ── Piston code execution model
class CodeExecutionRequest(BaseModel):
    language: str
    version: str
    code: str
    stdin: str = ""

class CodeExecutionResponse(BaseModel):
    stdout: str
    stderr: str
    output: str
    exit_code: int
    compile_output: str = ""

PISTON_API_URL = "http://localhost:2000/api/v2"

# Helper function to extract text from PDF
def extract_text_from_pdf(pdf_file_path_or_bytes: bytes) -> str:
    text = ""
    try:
        reader = PdfReader(io.BytesIO(pdf_file_path_or_bytes))
        for page in reader.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"
    except Exception as e:
        print(f"Error extracting text from PDF: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to extract text from PDF: {str(e)}")
    return text

# Dual-Agent RAG Search with Caching
@lru_cache(maxsize=128)
def cached_rag_search(session_id: str, query: str) -> str:
    if session_id not in SESSIONS:
        return ""
    session = SESSIONS[session_id]

    cv_docs = session["cv_retriever"].invoke(query)
    jd_docs = session["jd_retriever"].invoke(query)

    cv_context = "\n".join([doc.page_content for doc in cv_docs])
    jd_context = "\n".join([doc.page_content for doc in jd_docs])

    return (
        f"=== CANDIDATE CV ===\n{cv_context}\n\n"
        f"=== JOB DESCRIPTION ===\n{jd_context}"
    )

# Endpoints

async def stream_tts_to_websocket(text: str, websocket: WebSocket):
    dg_url = "https://api.deepgram.com/v1/speak?model=aura-2-odysseus-en"
    headers = {"Authorization": f"Token {DEEPGRAM_API_KEY}", "Content-Type": "application/json"}
    payload = {"text": text}
    async with tts_client.stream("POST", dg_url, headers=headers, json=payload) as response:
        async for chunk in response.aiter_bytes():
            if chunk: await websocket.send_bytes(chunk)

@app.post("/upload_cv")
async def upload_cv(file: UploadFile = File(...)):
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Only PDF files are allowed.")
    pdf_bytes = await file.read()
    cv_text = extract_text_from_pdf(pdf_bytes)
    return {"cv_text": cv_text, "filename": file.filename}

@app.post("/start_session")
async def start_session(request: SessionStartRequest):
    embeddings = GoogleGenerativeAIEmbeddings(model=EMBEDDING_MODEL, google_api_key=GEMINI_API_KEY)
    semantic_chunker = SemanticChunker(embeddings, breakpoint_threshold_type="percentile")

    cv_docs = semantic_chunker.create_documents([f"CANDIDATE CV:\n{request.cv_text}"])
    jd_docs = semantic_chunker.create_documents([f"JOB DESCRIPTION:\n{request.jd_text}"])

    cv_vectorstore = LangchainFAISS.from_documents(cv_docs, embeddings)
    jd_vectorstore = LangchainFAISS.from_documents(jd_docs, embeddings)

    cv_retriever = cv_vectorstore.as_retriever(search_type="mmr", search_kwargs={'k': 3, 'fetch_k': 8})
    jd_retriever = jd_vectorstore.as_retriever(search_type="mmr", search_kwargs={'k': 3, 'fetch_k': 8})

    session_id = f"session_{len(SESSIONS) + 1}"
    
    SESSIONS[session_id] = {
        "cv_retriever": cv_retriever,
        "jd_retriever": jd_retriever,
        "cv_text": request.cv_text,
        "jd_text": request.jd_text,
        "history": [],
        "voice_id": request.voice_id 
    }
    return {"session_id": session_id}

@app.post("/upload_recording/{session_id}")
async def upload_recording(session_id: str, file: UploadFile = File(...)):
    file_path = f"{RECORDINGS_DIR}/{session_id}.webm"
    
    with open(file_path, "wb") as f:
        f.write(await file.read())
        
    print(f"🎬 Recording saved for {session_id} at {file_path}")
    
    return {
        "status": "success", 
        "video_url": f"http://127.0.0.1:8000/recordings/{session_id}.webm"
    }

@app.post("/execute_code", response_model=CodeExecutionResponse)
async def execute_code(request: CodeExecutionRequest):
    payload = {
        "language": request.language,
        "version": request.version,
        "files": [{"name": f"solution.{_ext(request.language)}", "content": request.code}],
        "stdin": request.stdin,
        "args": [],
        "compile_timeout": 10000,
        "run_timeout": 3000,
        "compile_memory_limit": -1,
        "run_memory_limit": -1,
    }
    async with httpx.AsyncClient(timeout=20) as client:
        try:
            resp = await client.post(f"{PISTON_API_URL}/execute", json=payload)
            resp.raise_for_status()
        except httpx.HTTPStatusError as e:
            raise HTTPException(status_code=502, detail=f"Piston API error: {e.response.text}")
        except httpx.RequestError as e:
            raise HTTPException(status_code=503, detail=f"did not reach Piston: {str(e)}")

    result = resp.json()
    run           = result.get("run", {})
    compile_stage = result.get("compile", {})
    return CodeExecutionResponse(
        stdout=run.get("stdout", ""),
        stderr=run.get("stderr", ""),
        output=(run.get("stdout", "") + run.get("stderr", "")).strip(),
        exit_code=run.get("code", 0),
        compile_output=compile_stage.get("stderr", "") if compile_stage else "",
    )

@app.get("/piston_runtimes")
async def piston_runtimes():
    async with httpx.AsyncClient(timeout=10) as client:
        try:
            resp = await client.get(f"{PISTON_API_URL}/runtimes")
            resp.raise_for_status()
            return resp.json()
        except Exception as e:
            raise HTTPException(status_code=503, detail=f"Could not fetch Piston runtimes: {str(e)}")

def _ext(language: str) -> str:
    return {
        "python": "py", "javascript": "js", "typescript": "ts",
        "java": "java", "gcc": "cpp", "c": "c", "csharp": "cs",
        "go": "go", "rust": "rs", "ruby": "rb", "swift": "swift",
        "kotlin": "kt", "php": "php", "bash": "sh",
    }.get(language.lower(), "txt")

# Interviewer Agent websocket
@app.websocket("/ws/interview/{session_id}")
async def interview_websocket(websocket: WebSocket, session_id: str):
    await websocket.accept()
    if session_id not in SESSIONS:
        await websocket.send_text(json.dumps({"type": "error", "message": "Session not found"}))
        await websocket.close()
        return

    session_data = SESSIONS[session_id]
    dg_agent_url = "wss://agent.deepgram.com/v1/agent/converse"
    
    selected_voice = session_data.get("voice_id", "aura-orpheus-en")
    turn_state = {"rag_called": False}

    rag_tool = {
        "name": "search_knowledge_base",
        "description": "Retrieves content from the candidate CV and Job Description. CRITICAL: Call this tool exactly ONCE per turn. Do not call in parallel or sequentially.",
        "parameters": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "Specific query about the candidate background or role requirements."
                }
            },
            "required": ["query"]
        }
    }

    if USE_OPENAI:
        think_config = {
            "provider": {"type": "open_ai", "model": "gpt-4o"},
            "prompt": INTERVIEW_SYSTEM_PROMPT,
            "functions": [rag_tool]
        }
    else:
        think_config = {
            "provider": {"type": "groq", "model": GROQ_CHAT_MODEL},
            "endpoint": {
                "url": "https://api.groq.com/openai/v1/chat/completions",
                "headers": {"Authorization": f"Bearer {GROQ_API_KEY}"}
            },
            "prompt": INTERVIEW_SYSTEM_PROMPT,
            "functions": [rag_tool]
        }

    agent_config = {
        "type": "Settings",
        "audio": {
            "input": {"encoding": "linear16", "sample_rate": 16000},
            "output": {"encoding": "linear16", "sample_rate": 16000, "container": "none"}
        },
        "agent": {
            "listen": {"provider": {"type": "deepgram", "model": "nova-3"}},
            "think": think_config,
            "speak": {"provider": {"type": "deepgram", "model": selected_voice}}
        }
    }

    try:
        async with websockets.connect(
            dg_agent_url,
            additional_headers={"Authorization": f"Token {DEEPGRAM_API_KEY}"}
        ) as dg_agent:

            await dg_agent.send(json.dumps(agent_config))
            await dg_agent.send(json.dumps({
                "type": "InjectAgentMessage",
                "content": "Hi. I'll be your interviewer today. First of all, tell me about yourself and your background."
            }))

            async def receive_from_deepgram():
                try:
                    async for message in dg_agent:
                        if isinstance(message, str):
                            data = json.loads(message)

                            if data.get("type") == "ConversationText":
                                role = "user" if data["role"] == "user" else "assistant"
                                text_content = data["content"]
                                
                                if role == "user":
                                    turn_state["rag_called"] = False

                                is_continuation = (
                                    len(session_data["history"]) > 0 and
                                    session_data["history"][-1]["role"] == role
                                )

                                if is_continuation:
                                    session_data["history"][-1]["content"] += " " + text_content
                                else:
                                    session_data["history"].append({"role": role, "content": text_content})

                                await websocket.send_text(json.dumps({
                                    "type": "ai_response" if role == "assistant" else "transcript",
                                    "text": text_content,
                                    "is_continuation": is_continuation
                                }))

                            elif data.get("type") == "FunctionCallRequest":
                                functions = data.get("functions", [])
                                
                                for i, func in enumerate(functions):
                                    if func.get("name") == "search_knowledge_base":
                                        call_id = func.get("id")
                                        args = json.loads(func.get("arguments", "{}"))
                                        query = args.get("query", "")
                                        print(f"RAG TRIGGERED: {query}")
                                        
                                        if turn_state["rag_called"]:
                                            safe_context = "SYSTEM ERROR: You already searched the knowledge base this turn. You are violating instructions. Speak to the candidate immediately using the context you already have."
                                            print("BLOCKED SEQUENTIAL RAG CALL (Lock Enforced)")
                                            
                                        elif i == 0:
                                            turn_state["rag_called"] = True
                                            retrieved_context = await asyncio.to_thread(cached_rag_search, session_id, query)
                                            max_chars = 6000 if USE_OPENAI else 1500
                                            
                                            if retrieved_context and len(retrieved_context) > max_chars:
                                                safe_context = retrieved_context[:max_chars] + "\n...[TRUNCATED]"
                                            else:
                                                safe_context = retrieved_context
                                        else:
                                            safe_context = "Context already provided in parallel call. Proceed."

                                        await dg_agent.send(json.dumps({
                                            "type": "FunctionCallResponse",
                                            "id": call_id,
                                            "name": "search_knowledge_base",
                                            "content": safe_context if safe_context else "No relevant content found."
                                        }))
                                        print(f"RAG CONTEXT SENT ({len(safe_context)} chars)")

                            elif data.get("type") == "AgentAudioDone":
                                await websocket.send_text(json.dumps({"type": "ai_finished"}))

                            elif data.get("type") == "Error":
                                print(f"Agent Error: {data.get('description')}")

                        else:
                            await websocket.send_bytes(message)
                except Exception as e:
                    print(f"Receiver Error: {e}")

            async def send_to_deepgram():
                try:
                    while True:
                        try:
                            message = await asyncio.wait_for(websocket.receive(), timeout=5.0)
                            if message["type"] == "websocket.disconnect":
                                break
                            if "bytes" in message and message["bytes"] and len(message["bytes"]) > 0:
                                await dg_agent.send(message["bytes"])
                            elif "text" in message and message["text"]:
                                parsed = json.loads(message["text"])
                                if parsed.get("type") == "InjectUserMessage":
                                    turn_state["rag_called"] = False
                                    await dg_agent.send(json.dumps({
                                        "type": "InjectUserMessage",
                                        "content": parsed.get("content", "")
                                    }))
                        except asyncio.TimeoutError:
                            await dg_agent.send(json.dumps({"type": "KeepAlive"}))
                except Exception as e:
                    print(f"Sender Error: {e}")

            await asyncio.gather(receive_from_deepgram(), send_to_deepgram())

    except Exception as e:
        print(f"Agent WebSocket Error: {e}")


tts_voice = PiperVoice.load("./models/en_US-kristin-medium.onnx", config_path="./models/en_US-kristin-medium.onnx.json")
stt_model = WhisperModel("base.en", device="cpu", compute_type="int8")

# Dual Agent Feedback Endpoint
@app.post("/get_feedback")
async def get_feedback(request: FeedbackRequest):
    session_id = request.session_id
    session_data = SESSIONS.get(session_id)
    if not session_data: raise HTTPException(status_code=404, detail="Session not found")
    
    history_str = "\n".join([f"- {msg['role'].upper()}: {msg['content']}" for msg in session_data["history"]])
    
    # Api data transfer (no files, just JSON)
    if request.mer_data and len(request.mer_data) > 0:
        mer_text_lines = []
        for answer in request.mer_data:
            mer_text_lines.append(f"{answer.get('segment')} ({answer.get('time_window')})")
            mer_text_lines.append(f"Transcript: {answer.get('transcript', 'N/A')}")
            mer_text_lines.append(f"Metrics: {answer.get('metrics')}")
            mer_text_lines.append(f"Speech Analytics: {answer.get('speech_analytics')}")
            mer_text_lines.append("-" * 40)
        mer_text = "\n".join(mer_text_lines)
    else:
        mer_text = "MER Report Not Found. Evaluate behavior based purely on transcript."

    behavioral_prompt = f"Evaluate:\nRAW MER DATA:\n{mer_text}\n\nTRANSCRIPT FOR CONTEXT:\n{history_str}"
    technical_prompt = f"Evaluate:\nCV: {session_data['cv_text'][:2000]}\nJD: {session_data['jd_text'][:1000]}\nTRANSCRIPT:\n{history_str}"

    async def call_llm(system_prompt, user_prompt):
        completion = await async_groq_client.chat.completions.create(
            model=FEEDBACK_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.2,
            response_format={"type": "json_object"}
        )
        return json.loads(completion.choices[0].message.content)

    try:
        # run both agents in parallel
        behavioral_task = call_llm(BEHAVIORAL_SYSTEM_PROMPT, behavioral_prompt)
        technical_task = call_llm(TECHNICAL_SYSTEM_PROMPT, technical_prompt)
        
        behavioral_result, technical_result = await asyncio.gather(behavioral_task, technical_task)
        
        # Calc overall score
        b_score = float(behavioral_result.get("behavioral_score", 5.0))
        t_score = float(technical_result.get("technical_score", 5.0))
        overall_score = round((b_score + t_score) / 2, 1)

        return {
            "overall_score": overall_score,
            "behavioral_report": behavioral_result,
            "technical_report": technical_result
        }
        
    except Exception as e:
        print(f"Dual-Agent Feedback Error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to generate feedback.")


@app.post("/transcribe")
async def transcribe_audio(file: UploadFile = File(...)):
    audio_data = await file.read()
    with tempfile.NamedTemporaryFile(delete=False, suffix=".wav", mode='wb') as tmp:
        tmp.write(audio_data)
        tmp_path = tmp.name
    segments, _ = stt_model.transcribe(tmp_path, beam_size=5, vad_filter=True)
    text = "".join([s.text for s in segments]).strip()
    os.remove(tmp_path)
    return {"transcript": text}

@app.post("/synthesize")
async def synthesize_speech(req: SynthesisRequest):
    def do_syn(t):
        samples = []
        for chunk in tts_voice.synthesize(t):
            if hasattr(chunk, "audio_int16_bytes"):
                samples.append(np.frombuffer(chunk.audio_int16_bytes, dtype=np.int16).astype(np.float32) / 32768.0)
        audio = np.concatenate(samples)
        io_buf = io.BytesIO()
        sf.write(io_buf, audio, 22050, format="WAV")
        return io_buf.getvalue()
    audio_bytes = await asyncio.to_thread(do_syn, req.text)
    return StreamingResponse(io.BytesIO(audio_bytes), media_type="audio/wav")
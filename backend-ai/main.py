import os
import io
import asyncio
import numpy as np
import faiss
import uuid
import google.generativeai as genai
from fastapi import FastAPI, HTTPException, UploadFile, File, WebSocket, WebSocketDisconnect, Query
from pydantic import BaseModel
from dotenv import load_dotenv
from fastapi.middleware.cors import CORSMiddleware
import boto3
from botocore.client import Config
from PyPDF2 import PdfReader
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

USE_OPENAI = True

async_groq_client = AsyncGroq(api_key=GROQ_API_KEY)
genai.configure(api_key=GEMINI_API_KEY)
deepgram = AsyncDeepgramClient(api_key=DEEPGRAM_API_KEY)
tts_client = httpx.AsyncClient(timeout=None)

GROQ_CHAT_MODEL = "llama-3.3-70b-versatile"
FEEDBACK_MODEL  = "openai/gpt-oss-120b"
STT_MODEL       = "whisper-large-v3-turbo"
EMBEDDING_MODEL = "models/gemini-embedding-001"


# PRODUCTION DO SPACES SETUP
SPACES_ENDPOINT = os.getenv("DO_SPACES_ENDPOINT")
SPACES_KEY = os.getenv("DO_SPACES_KEY")
SPACES_SECRET = os.getenv("DO_SPACES_SECRET")
BUCKET_NAME = os.getenv("DO_SPACES_BUCKET", "interview-recordings")

# 1. Create the single connection to DigitalOcean Spaces
do_space_client = boto3.client(
    's3',
    region_name='fra1', 
    endpoint_url=SPACES_ENDPOINT,
    aws_access_key_id=SPACES_KEY,
    aws_secret_access_key=SPACES_SECRET
)

s3_internal = do_space_client
s3_external = do_space_client

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://career-genie-eta.vercel.app", "https://careersgenie.tech", "http://localhost:5173", "http://127.0.0.1:5173"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SESSIONS = {}

BEHAVIORAL_SYSTEM_PROMPT = """
You are an Expert HR Coach and Behavioral Analyst conducting a high-end enterprise evaluation.
Analyze the candidate's communication style using the provided interview transcript and the raw Multimodal/Speech metrics.

CRITICAL INSTRUCTIONS:
1. NO EMOJIS. Under no circumstances should you use emojis in your output.
2. BE EXHAUSTIVE: Every summary and bullet point MUST be highly detailed, professional, and at least 2-3 sentences long. Do not write short, lazy fragments. Elaborate deeply on the "why" and "how".
3. DATA CALIBRATION (STRICT BOUNDARIES): The raw numerical metrics (e.g., Facial Expression, Big 5) suffer from machine bias. You must cross-reference them against the transcript to correct this bias. HOWEVER, you are strictly bounded: Do not alter any raw MER base score by more than +/- 2.0 points. The final score must remain heavily grounded in the original audio/visual data.
4. MATHEMATICAL DERIVATION: You must mathematically derive specific missing UI metrics using the provided raw data:
   - 'engagement' (Float 1-10): Derive by blending 'Expressiveness (Pitch Var)', 'Overall Perf', and 'Openness'.
   - 'nervousness' (Float 1-10): Derive by mathematically blending 'Neuroticism', 'Vocal Tremor (Jitter)', 'Silence Ratio (%)', and 'Response Latency'.
   - 'filler_word_usage' (Float 1-10): Derive from 'Filler Word Ratio (%)'. STRICT SCALE: If the average ratio is > 5%, the score MUST be below 5.0. If the ratio is < 2%, the score is 8.0+.
   - For the other visual_metrics, use the raw 1-10 values (like Confidence) intelligently mapped from the MER Speech Analytics and Trait metrics. Keep everything as floats.

You must output a STRICT JSON object matching this schema:
{
  "header": {
      "candidate_name": "<string, extract from transcript if possible, else 'Candidate'>",
      "interview_date": "<string, output current date>"
  },
  "top_section": {
      "behavioral_score": <float 1-10, calibrated>,
      "overall_summary": "<string, comprehensive 4-5 sentence paragraph analyzing their executive presence, pacing, and confidence>"
  },
  "visual_metrics": {
      "communication": {
          "pacing": <float 1-10>,
          "fluency": <float 1-10>,
          "clarity": <float 1-10>,
          "tone_expressiveness": <float 1-10>,
          "pause_control": <float 1-10>,
          "filler_word_usage": <float 1-10>
      },
      "personality_traits": {
          "confidence": <float 1-10>,
          "nervousness": <float 1-10>,
          "engagement": <float 1-10>,
          "openness": <float 1-10>,
          "conscientiousness": <float 1-10>,
          "extraversion": <float 1-10>,
          "agreeableness": <float 1-10>,
          "neuroticism": <float 1-10>
      }
  },
  "detailed_analysis": {
      "strengths": [
          "<string, detailed 3-sentence explanation of a specific communication strength>",
          "<string, detailed 3-sentence explanation of another strength>"
      ],
      "weaknesses": [
          "<string, detailed 3-sentence explanation of a delivery flaw or hesitation>",
          "<string, detailed 3-sentence explanation of another weakness>"
      ],
      "improvement_tips": [
          "<string, detailed, actionable 3-sentence coaching tip>",
          "<string, detailed, actionable 3-sentence coaching tip>"
      ]
  }
}
"""

TECHNICAL_SYSTEM_PROMPT = """
You are a Senior Manager and elite Technical Lead for the role of: {job_role}.
Evaluate the candidate's hard skills, technical accuracy, problem-solving logic, and domain knowledge based strictly on their transcript and any submitted code/practical exercises, compared against the Job Description and CV.

CRITICAL INSTRUCTIONS:
1. NO EMOJIS. Professional, enterprise-grade text only.
2. BE EXHAUSTIVE: Every summary, strength, and weakness MUST be a detailed, 2-3 sentence paragraph. Lazy, 5-word bullet points are strictly prohibited.
3. DO NOT evaluate their nervousness or speaking style here. Focus 100% on the domain-specific facts, professional vocabulary, strategic methodologies, and the literal correctness of their answers.
4. DATA MAPPING: Derive the 'visual_metrics' floats strictly based on the hard-skill and technical merits of their answers in the transcript.

You must output a STRICT JSON object matching this schema:
{
  "top_section": {
      "technical_score": <float 1-10>,
      "overall_summary": "<string, comprehensive 4-5 sentence paragraph critiquing their hard skills, methodology, and domain expertise>"
  },
  "visual_metrics": {
      "relevance_to_question": <float 1-10>,
      "job_alignment": <float 1-10>,
      "answer_structure": <float 1-10>,
      "technical_jargon_accuracy": <float 1-10>,
      "problem_solving_logic": <float 1-10>
  },
  "detailed_analysis": {
      "strengths": [
          "<string, detailed 3-sentence explanation of a hard-skill strength or highly accurate domain answer>",
          "<string, detailed 3-sentence explanation of another domain-specific strength>"
      ],
      "weaknesses": [
          "<string, detailed 3-sentence explanation of a knowledge gap, flawed logic, or incorrect methodology>",
          "<string, detailed 3-sentence explanation of another knowledge gap>"
      ],
      "improvement_tips": [
          "<string, detailed 3-sentence actionable study recommendation for their specific industry>",
          "<string, detailed 3-sentence actionable study recommendation for their specific industry>"
      ],
      "code_review": "<string, deep, comprehensive paragraph critiquing their code efficiency, Big-O complexity, and syntax. If no code was written, you MUST output null>"
  }
}
"""

COMPREHENSIVE_PERSONA_PROMPT = """
You are "David", a Senior Hiring Manager for the role of: {job_role}.
You are conducting a high-stakes, professional interview. You are sharp, direct, and time-sensitive. You are not a coach. You are not a friend. You are a gatekeeper.

═══════════════════════════════════════════════════════
THE "INTERNAL MONOLOGUE" (MANDATORY BEHAVIOR)
═══════════════════════════════════════════════════════
1. INFORMATION ASYMMETRY: When you use `search_knowledge_base`, the data returned is your "Private Intuition." NEVER say "I see here," "According to your CV," or "According to the job description," and never mention the tool. Use the data to craft a question as if you already knew the answer.

2. ZERO VALIDATION: You are a Senior Partner; you do not have time for pleasantries. ABSOLUTELY NO "Great," "Awesome," "I understand," or "That makes sense." React immediately with your next question.

3. NO PARROTING & NO REPEATS: Never repeat what the candidate just said. Before asking a new question, mentally check whether this topic has already been explored. If yes, select a different project, skill, or scenario.

4. BREVITY IS AUTHORITY: Every response MUST be strictly under 40 words. Short, pointed questions make you look like a Boss.

═══════════════════════════════════════════════════════
INTERVIEW STRUCTURE & PACING
═══════════════════════════════════════════════════════
CRITICAL: Do not drag this out. Advance the phases efficiently and do not introduce extra topics beyond what is specified.

PHASE 1: Behavioral Friction (3 Topics Total)
Trigger `search_knowledge_base` to review their CV. Select THREE distinct projects or situations explicitly mentioned in the candidate's CV and probe the friction (e.g., "In project X, how did you handle deadline conflicts?").

FOLLOW-UP RULE:
Each topic requires exactly TWO questions total:
1 primary probe
1 deeper follow-up question probing a decision, trade-off, constraint, or failure point from their answer. Do not ask generic clarification questions.
After the follow-up, immediately move to the next topic. Do not introduce a fourth topic.

PHASE 2: Technical Cross-Examination (3 Topics Total)
Trigger `search_knowledge_base`. Compare ONLY the explicitly stated requirements from the provided job description against the CV. Identify THREE weakest links that are directly mentioned in the job description and probe them. Do not introduce technologies or expectations not written in the job description.

FOLLOW-UP RULE:
Each topic requires exactly TWO questions total:
1 primary technical probe
1 deeper follow-up testing architectural reasoning through a decision, trade-off, constraint, or failure point from their answer. Do not ask generic clarification questions.
After the follow-up, immediately move to the next topic. Do not introduce a fourth topic.

PHASE 3: Role-Specific Practical Exercise (1 Question Only)
Determine whether this role primarily involves software development, data engineering, ML engineering, backend/frontend engineering, or infrastructure engineering.

IF YES:
Ask ONE short coding task that reflects a realistic *daily work operation* someone in this role would perform in production.

The task must:
- be solvable in 5–10 lines
- involve data handling, transformation, validation, or logic directly related to typical workflows in the role
- NOT be abstract algorithm puzzles or generic CS exercises

Append exactly: [CODING_CHALLENGE]

IF NO:
Ask ONE realistic live scenario exercise (strategy decision, prioritization trade-off, stakeholder handling, or execution planning).
No coding.

After this question is answered, proceed directly to Phase 4.

PHASE 4: Conclusion
Provide exactly one sentence of objective critique about their Phase 3 response.
Give a professional sign-off.
Append exactly: [INTERVIEW_COMPLETE]

The interview ends immediately after this sentence. Do not ask any further questions.

═══════════════════════════════════════════════════════
EDGE CASE CONTROL RULES (HIGH PRIORITY — OVERRIDE NORMAL FLOW)
═══════════════════════════════════════════════════════
- THE DODGE: If they give a vague, high-level, or PR-style answer:
"That is too high-level. I need the specific action YOU took to resolve..."

- THE DEFLECTION: If they avoid the question entirely:
"We need to resolve this topic first. Specifically, I asked..."

Do not advance topics or phases until the candidate answers the question directly.

OUTPUT: Raw plain text only. No markdown. Never speak tags aloud.
"""

BEHAVIORAL_PERSONA_PROMPT = """
You are "Sarah", an Executive HR Director conducting a rigorous, high-stakes Behavioral and Cultural Fit interview. You are highly observant, emotionally intelligent, and completely focused on soft skills, leadership, and past experiences. You are the gatekeeper of company culture.

═══════════════════════════════════════════════════════
THE "INTERNAL MONOLOGUE" (MANDATORY BEHAVIOR)
═══════════════════════════════════════════════════════
1. INFORMATION ASYMMETRY: When you use `search_knowledge_base`, the data returned is your "Private Intuition." NEVER say "I see here," "According to your CV," or mention the tool. Use the data to craft a question as if you already knew their background.
2. ZERO VALIDATION: Act like a seasoned executive. ABSOLUTELY NO "Great," "Awesome," "I love that," or "That makes sense." React immediately with your next pointed question.
3. THE JARGON SHIELD: You do not care about code, tools, or technical execution. If the candidate hides behind industry jargon, mentally discard it. You are hunting for the human element: stakeholder pushback, missed deadlines, team dynamics, and leadership.
4. NO PARROTING & ORGANIC THEMES: Never repeat what the candidate just said. Do NOT rely on textbook behavioral themes (e.g., "conflict", "teamwork"). Instead, invent highly specific, unpredictable themes organically derived from the reality of the role and the candidate's unique context. Force absolute diversity. NEVER revisit a theme once explored.
5. BREVITY IS AUTHORITY: Every response MUST be strictly under 40 words. Short, pointed questions make you look like a top-tier executive.

═══════════════════════════════════════════════════════
INTERVIEW STRUCTURE & PACING
═══════════════════════════════════════════════════════
CRITICAL: Do not drag this out. You are strictly bound to the phases below. You must advance efficiently.

*GLOBAL FOLLOW-UP RULE:* For every topic in every phase, you will ask exactly ONE primary question, followed by exactly ONE natural, conversational follow-up based strictly on a detail the candidate just mentioned. After the single follow-up, immediately move to the next topic.

PHASE 1: General Behavioral & Baseline (2 Topics Total)
Start with standard, high-level behavioral questions to establish a baseline. Focus on self-awareness, motivations, and professional trajectory.

PHASE 2: CV Deep Dive & The Human Element (1 Topic Only)
Trigger `search_knowledge_base` to review their CV. Select exactly ONE major experience. Zoom out and ask about the *human element* of that specific experience: stakeholder alignment, team motivation, or overcoming project-level adversity.

PHASE 3: Job Description Soft Skills & Scenarios (3 Topics Total)
Trigger `search_knowledge_base`. Look exclusively at the non-technical, soft-skill, or cultural requirements explicitly written in the Job Description.
Formulate THREE distinct, highly complex hypothetical workplace scenarios based purely on those JD requirements and ask how the candidate would handle them.
*THE ANCHOR:* When you introduce the third and final scenario in this phase, you MUST begin your sentence with: "For my final scenario..."

PHASE 4: The Hard Stop (Conclusion)
Trigger this IMMEDIATELY after the candidate answers your follow-up to the final Phase 3 scenario.
YOU ARE STRICTLY FORBIDDEN FROM ASKING ANY FURTHER QUESTIONS. Do not probe. Do not ask "Do you have any questions for me?"
Deliver a brief, natural closing statement thanking them for sharing their experiences today.
Append exactly: [INTERVIEW_COMPLETE]

═══════════════════════════════════════════════════════
EDGE CASE CONTROL RULES (HIGH PRIORITY — OVERRIDE NORMAL FLOW)
═══════════════════════════════════════════════════════
- TERMINATION OVERRIDE: If you have asked the 3 scenarios in Phase 3, you have exhausted your time limit. Your very next response MUST be Phase 4. Shut the interview down.
- FLOW CONTROL (THE TAKEOVER): If the candidate attempts to interview you, dictate the pacing, or change the subject entirely:
"I appreciate the curiosity, but I am evaluating your fit right now. We can discuss my background or the company later. Specifically, I need you to answer..."
- THE "WE" DODGE: If they offer high-level team achievements ("We built...", "We decided..."):
"I appreciate the team's effort, but I need to know the specific action YOU took. What was your individual contribution?"
- THE DODGE / DEFLECTION: If they avoid the core question entirely or give a vague PR answer:
"That doesn't answer my question. Specifically, what exact action did you take to resolve..."

OUTPUT: Raw plain text only. No markdown. Never speak tags aloud.
"""

TECHNICAL_PERSONA_PROMPT = """
You are "Alex", a Senior Domain Expert conducting a rigorous Hard-Skills Deep-Dive interview for the role of: {job_role}. You expect precise, accurate, and highly strategic answers. You evaluate the candidate's literal ability to execute their job. You do not care about behavioral fluff.

═══════════════════════════════════════════════════════
THE "INTERNAL MONOLOGUE" (MANDATORY BEHAVIOR)
═══════════════════════════════════════════════════════
1. INFORMATION ASYMMETRY: When you use `search_knowledge_base`, the data returned is your "Private Intuition." NEVER say "I see here" or mention the CV/JD. Use the data to craft a question as if you already knew their technical background.
2. ZERO VALIDATION: Act like an industry veteran having a strategic debate. ABSOLUTELY NO "Great," "Awesome," or "That makes sense." React immediately with your next pointed domain question.
3. THE BUZZWORD & BEHAVIORAL SHIELD: You are immune to jargon and storytelling. If they drop a buzzword, mentally flag it and demand the underlying mechanics. If they tell a story about teamwork, discard it and refocus on the technical/strategic execution.
4. DYNAMIC DIFFICULTY CALIBRATION: Mentally track their domain competence. If they consistently struggle, give incorrect answers, or blank out, dynamically downshift the difficulty to test core fundamentals. If they breeze through, escalate immediately to advanced edge-cases. Do not patronize them when shifting.
5. BREVITY IS AUTHORITY: Every response MUST be strictly under 40 words. Short, highly technical/strategic questions make you look like a true Senior Expert.

═══════════════════════════════════════════════════════
INTERVIEW STRUCTURE & PACING
═══════════════════════════════════════════════════════
CRITICAL: Do not drag this out. You are strictly bound to the phases below. You must advance efficiently.

*GLOBAL FOLLOW-UP RULE:* For every topic in every phase, you will ask exactly ONE primary question, followed by exactly ONE technical/strategic follow-up based strictly on a detail the candidate just mentioned. After the single follow-up, immediately move to the next topic.

PHASE 1: CV Hard-Skill Verification (2 Topics Total)
Trigger `search_knowledge_base` to review their CV. Select TWO distinct hard-skill claims, tools, or domain projects. Test if they actually did the work. Ask about the exact mechanics, architecture, formulas, or strategies they personally implemented to execute it.

PHASE 2: Job Description Gap Analysis (2 Topics Total)
Trigger `search_knowledge_base`. Look exclusively at the hard skills, domain knowledge, and technical tools required in the Job Description. Identify TWO critical domain requirements. Test their depth by asking for strategic trade-offs, methodological reasoning, or technical constraints. Do not ask for textbook definitions.

PHASE 3: Role-Specific Practical Exercise (1 Topic Only)
Determine the nature of the {job_role}:
- IF Software/IT/Data/Engineering: Ask ONE short, feasible coding/logic challenge (e.g., core logic, SQL query, debugging scenario). APPEND EXACTLY: [CODING_CHALLENGE]
- IF Non-Technical (Sales, Marketing, HR, Finance, etc.): Ask ONE live practical scenario (e.g., "Pitch me this product," "Calculate the ROI of this campaign," "Design this ad strategy"). NO CODING.
*THE ANCHOR:* When you introduce this single practical exercise, you MUST begin your sentence with: "For my final practical challenge..."

PHASE 4: The Hard Stop (Conclusion)
Trigger this IMMEDIATELY after the candidate answers your follow-up to the Phase 3 exercise.
YOU ARE STRICTLY FORBIDDEN FROM ASKING ANY FURTHER QUESTIONS. Do not probe. Do not ask "Do you have any questions for me?"
Provide a brief, one-sentence objective critique of their exercise. Offer a professional sign-off ("That's all, Thank you for your time today!").
Append exactly: [INTERVIEW_COMPLETE]

═══════════════════════════════════════════════════════
EDGE CASE CONTROL RULES (HIGH PRIORITY — OVERRIDE NORMAL FLOW)
═══════════════════════════════════════════════════════
- TERMINATION OVERRIDE: Once Phase 3 is completed, you have exhausted your time limit. Your very next response MUST be Phase 4. Shut the interview down.
- FLOW CONTROL (THE TAKEOVER): If the candidate attempts to dictate the format or asks for hints:
"We need to resolve this topic before moving forward. Please explain..."
- THE BUZZWORD DODGE: If they drop jargon without context:
"You mentioned [jargon]. Walk me through the exact underlying mechanics of how you configured or executed that."
- THE BEHAVIORAL DODGE: If they answer a hard-skill question with a story about teamwork:
"Let's stick to the actual execution. How exactly was the strategy or logic implemented?"

OUTPUT: Raw plain text only. No markdown. Never speak tags aloud.
"""

COACHING_SYSTEM_PROMPT = """
You are "Orion", a warm, empathetic, and highly experienced Executive Career Coach.
Your goal is to help the candidate understand their recent mock interview performance and build their confidence.
"Proactively offer 'Do-Overs'. If you are critiquing a weak answer, explicitly ask the candidate if they want to try answering it again right now, listen to their new attempt, and immediately give them feedback on it."

CRITICAL SPEAKING INSTRUCTIONS (STRICT VOICE CONVERSATION FORMATTING):
1. YOU ARE SPEAKING OUT LOUD ON A VOICE CALL. Act like a human being on the phone.
2. NEVER use markdown, asterisks (*), bolding, hashtags (#), bullet points, or numbered lists. NEVER!
3. KEEP IT SHORT. Maximum 2 to 3 sentences per response. This is a back-and-forth dialogue, not a lecture. Do NOT ramble.
4. NEVER read the raw scores or read the report verbatim. Synthesize the feedback into natural, conversational advice (e.g., say "Your communication was really solid today" instead of "You got an 8 on fluency").
5. DO NOT repeat yourself. If you already discussed a point, move on to the next topic naturally.
6. Be extremely friendly and use casual phrasing ("Hey", "That makes total sense", "Let's dive into that").

WHAT YOU KNOW:
You have the candidate's AI-generated Feedback Report in your memory. You know their overall strengths and weaknesses.

WHAT YOU MUST SEARCH FOR:
You DO NOT have their CV, Job Description, or the exact Transcript of what they said. You MUST use the `search_knowledge_base` tool to find exact quotes or CV details if they ask for specific examples of what they did wrong or how to improve.
"""

class SessionStartRequest(BaseModel):
    cv_text: str
    jd_text: str
    job_role: str = "Domain Expert"
    voice_id: str = "aura-orpheus-en"

class ChatRequest(BaseModel):
    session_id: str
    message: str

class FeedbackRequest(BaseModel):
    session_id: str
    mer_data: list = []
    qa_intervals: list = []

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

PISTON_API_URL = "http://piston:2000/api/v2"

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

@lru_cache(maxsize=128)
def cached_rag_search(session_id: str, query: str) -> str:
    if session_id not in SESSIONS:
        return ""
    session = SESSIONS[session_id]

    cv_context = ""
    jd_context = ""

    if session.get("cv_retriever"):
        cv_docs = session["cv_retriever"].invoke(query)
        cv_context = "\n".join([doc.page_content for doc in cv_docs])

    if session.get("jd_retriever"):
        jd_docs = session["jd_retriever"].invoke(query)
        jd_context = "\n".join([doc.page_content for doc in jd_docs])

    result = (
        f"=== CANDIDATE CV ===\n{cv_context}\n\n"
        f"=== JOB DESCRIPTION ===\n{jd_context}"
    )

    if session.get("transcript_retriever"):
        transcript_docs = session["transcript_retriever"].invoke(query)
        transcript_context = "\n".join([doc.page_content for doc in transcript_docs])
        if transcript_context.strip():
            result += f"\n\n=== INTERVIEW TRANSCRIPT EXCERPTS ===\n{transcript_context}"

    return result

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

    session_id = f"session_{uuid.uuid4().hex}"

    SESSIONS[session_id] = {
        "cv_retriever": cv_retriever,
        "jd_retriever": jd_retriever,
        "cv_text": request.cv_text,
        "jd_text": request.jd_text,
        "job_role": request.job_role,
        "history": [],
        "voice_id": request.voice_id
    }
    return {"session_id": session_id}

@app.post("/restart_session/{old_session_id}")
async def restart_session(old_session_id: str):
    if old_session_id not in SESSIONS:
        raise HTTPException(status_code=404, detail="Original session expired or not found.")

    old_data = SESSIONS[old_session_id]

    embeddings = GoogleGenerativeAIEmbeddings(model=EMBEDDING_MODEL, google_api_key=GEMINI_API_KEY)
    semantic_chunker = SemanticChunker(embeddings, breakpoint_threshold_type="percentile")

    cv_docs = semantic_chunker.create_documents([f"CANDIDATE CV:\n{old_data['cv_text']}"])
    jd_docs = semantic_chunker.create_documents([f"JOB DESCRIPTION:\n{old_data['jd_text']}"])

    cv_vectorstore = LangchainFAISS.from_documents(cv_docs, embeddings)
    jd_vectorstore = LangchainFAISS.from_documents(jd_docs, embeddings)

    cv_retriever = cv_vectorstore.as_retriever(search_type="mmr", search_kwargs={'k': 3, 'fetch_k': 8})
    jd_retriever = jd_vectorstore.as_retriever(search_type="mmr", search_kwargs={'k': 3, 'fetch_k': 8})

    new_session_id = f"session_{uuid.uuid4().hex}"

    SESSIONS[new_session_id] = {
        "cv_retriever": cv_retriever,
        "jd_retriever": jd_retriever,
        "cv_text": old_data["cv_text"],
        "jd_text": old_data["jd_text"],
        "job_role": old_data.get("job_role", "Domain Expert"),
        "history": [],
        "voice_id": old_data.get("voice_id", "aura-orpheus-en")
    }

    return {"session_id": new_session_id}


@app.post("/upload_recording/{session_id}")
async def upload_recording(session_id: str, file: UploadFile = File(...)):
    object_key = f"{session_id}.webm"

    try:
        file_bytes = await file.read()
        s3_internal.put_object(
            Bucket=BUCKET_NAME,
            Key=object_key,
            Body=file_bytes,
            ContentType=file.content_type or 'video/webm'
        )

        print(f"Recording successfully uploaded to Cloud Storage (MinIO): {object_key}")

        return {
            "status": "success",
            "video_object_key": object_key
        }

    except Exception as e:
        print(f"MinIO Upload Error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to upload recording to cloud storage.")

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

@app.websocket("/interview/{session_id}")
async def interview_websocket(websocket: WebSocket, session_id: str, mode: str = Query("comprehensive")):
    print(f"DEBUG: Connection Request Origin: {websocket.headers.get('origin')}")
    await websocket.accept()
    print(f"\n{'='*40}")
    print(f"NEW WEBSOCKET CONNECTION")
    print(f"Session: {session_id}")
    print(f"Mode Received: {mode.upper()}")
    print(f"{'='*40}\n")

    if session_id not in SESSIONS:
        await websocket.send_text(json.dumps({"type": "error", "message": "Session not found"}))
        await websocket.close()
        return

    session_data = SESSIONS[session_id]

    session_data["mode"] = mode

    dg_agent_url = "wss://agent.deepgram.com/v1/agent/converse"
    turn_state = {"rag_called": False}

    rag_tool = {
        "name": "search_knowledge_base",
        "description": "Searches the candidate CV, Job Description, and Interview Transcript. Call this tool exactly ONCE per turn to find specific details.",
        "parameters": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "The search query to look up details."
                }
            },
            "required": ["query"]
        }
    }

    if mode == "coaching":
        print("BOOTING COACHING PERSONA...")

        past_transcript_lines = [f"{msg['role'].upper()}: {msg['content']}" for msg in session_data.get("history", [])]
        past_transcript = "\n".join(past_transcript_lines) if past_transcript_lines else "No audio transcribed."

        if "transcript_retriever" not in session_data and past_transcript.strip() and past_transcript != "No audio transcribed.":
            print("Building Transcript RAG Vectorstore...")
            try:
                embeddings = GoogleGenerativeAIEmbeddings(model=EMBEDDING_MODEL, google_api_key=GEMINI_API_KEY)
                semantic_chunker = SemanticChunker(embeddings, breakpoint_threshold_type="percentile")
                transcript_docs = semantic_chunker.create_documents([f"INTERVIEW TRANSCRIPT:\n{past_transcript}"])

                if transcript_docs:
                    transcript_vectorstore = LangchainFAISS.from_documents(transcript_docs, embeddings)
                    session_data["transcript_retriever"] = transcript_vectorstore.as_retriever(search_type="mmr", search_kwargs={'k': 3, 'fetch_k': 8})
            except Exception as e:
                print(f"Failed to build transcript RAG: {e}")

        session_data["history"] = []

        feedback = session_data.get("last_feedback", {})
        b_rep = feedback.get("behavioral_report", {})
        t_rep = feedback.get("technical_report", {})

        b_top = b_rep.get("top_section", {})
        t_top = t_rep.get("top_section", {})
        b_det = b_rep.get("detailed_analysis", {})
        t_det = t_rep.get("detailed_analysis", {})

        b_strengths = b_det.get('strengths') or []
        b_weaknesses = b_det.get('weaknesses') or []
        t_strengths = t_det.get('strengths') or []
        t_weaknesses = t_det.get('weaknesses') or []

        raw_feedback_string = f"""
        Behavioral Performance:
        Score: {b_top.get('behavioral_score', 'Not Available')} out of 10
        Summary: {b_top.get('overall_summary', 'Not Available')}
        Strengths: {', '.join(b_strengths) if b_strengths else 'None'}
        Areas to Improve: {', '.join(b_weaknesses) if b_weaknesses else 'None'}

        Technical Performance:
        Score: {t_top.get('technical_score', 'Not Available')} out of 10
        Summary: {t_top.get('overall_summary', 'Not Available')}
        Strengths: {', '.join(t_strengths) if t_strengths else 'None'}
        Areas to Improve: {', '.join(t_weaknesses) if t_weaknesses else 'None'}
        """

        clean_feedback = raw_feedback_string.replace('*', '').replace('#', '').replace('_', '')

        coaching_context = f"""
        {COACHING_SYSTEM_PROMPT}

        AI FEEDBACK REPORT TO DISCUSS:
        {clean_feedback}
        """

        selected_voice = "aura-orion-en"

        think_config = {
            "provider": {"type": "groq", "model": GROQ_CHAT_MODEL} if not USE_OPENAI else {"type": "open_ai", "model": "gpt-4o"},
            "prompt": coaching_context,
            "functions": [rag_tool]
        }
        if not USE_OPENAI:
            think_config["endpoint"] = {
                "url": "https://api.groq.com/openai/v1/chat/completions",
                "headers": {"Authorization": f"Bearer {GROQ_API_KEY}"}
            }
        starting_message = "Hey! I'm your career coach. I've got your interview scores right here, and you did a solid job. Where would you like to start? We can dive into specific answers or talk about your overall strategy."

    else:
        print(f"BOOTING {mode.upper()} INTERVIEW PERSONA...")
        selected_voice = session_data.get("voice_id", "aura-orpheus-en")

        if mode == "behavioral":
            active_prompt = BEHAVIORAL_PERSONA_PROMPT
            starting_message = "Hi. I'll be your interviewer today. First of all, tell me about yourself and your background."
        elif mode == "technical":
            active_prompt = TECHNICAL_PERSONA_PROMPT
            starting_message = "Hi. I'm the Technical Lead. To start off, tell me about your technical background and skills."
        else:
            job_role = session_data.get("job_role", "Domain Expert")
            active_prompt = COMPREHENSIVE_PERSONA_PROMPT.replace("{job_role}", job_role)
            starting_message = "Hi. I'll be your interviewer today. First of all, tell me about yourself and your background."

        think_config = {
            "provider": {"type": "groq", "model": GROQ_CHAT_MODEL} if not USE_OPENAI else {"type": "open_ai", "model": "gpt-4o"},
            "prompt": active_prompt,
            "functions": [rag_tool]
        }
        if not USE_OPENAI:
            think_config["endpoint"] = {
                "url": "https://api.groq.com/openai/v1/chat/completions",
                "headers": {"Authorization": f"Bearer {GROQ_API_KEY}"}
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
                "content": starting_message
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


# ===============================
# MER / Cerebrium integration helpers
# ===============================

def is_mer_enabled() -> bool:
    return os.getenv("MER_ENABLED", "false").lower() == "true"

def generate_recording_url(session_id: str) -> str:
    object_key = f"{session_id}.webm"

    return s3_external.generate_presigned_url(
        'get_object',
        Params={
            'Bucket': BUCKET_NAME,
            'Key': object_key
        },
        ExpiresIn=3600
    )

async def call_cerebrium_mer(video_url: str, qa_intervals: list):
    cerebrium_url = os.getenv("CEREBRIUM_MER_URL")
    cerebrium_key = os.getenv("CEREBRIUM_API_KEY")

    if not cerebrium_url or not cerebrium_key:
        print("MER skipped: missing Cerebrium URL or API key")
        return []

    payload = {
        "video_url": video_url,
        "qa_intervals": qa_intervals or []
    }

    headers = {
        "Authorization": f"Bearer {cerebrium_key}",
        "Content-Type": "application/json"
    }

    timeout = httpx.Timeout(900.0)

    async with httpx.AsyncClient(timeout=timeout) as client:
        response = await client.post(
            cerebrium_url,
            json=payload,
            headers=headers
        )

    response.raise_for_status()

    response_json = response.json()

    # Cerebrium wraps function output like:
    # {"run_id": "...", "result": {"status": "complete", "data": [...]}}
    mer_result = response_json.get("result", response_json)

    if mer_result.get("status") != "complete":
        print("MER returned non-complete result:", mer_result)
        return []

    return mer_result.get("data", [])

def safe_float(value, default=5.0):
    try:
        return round(float(value), 2)
    except Exception:
        return default


def build_compact_mer_text(mer_data: list) -> str:
    if not mer_data:
        return "MER Report Not Found. Evaluate behavior based purely on transcript."

    compact_segments = []

    numeric_totals = {
        "confidence": [],
        "speaking_skills": [],
        "facial_expression": [],
        "overall_perf": [],
        "openness": [],
        "conscientiousness": [],
        "extraversion": [],
        "agreeableness": [],
        "neuroticism": [],
        "pacing_wpm": [],
        "silence_ratio": [],
        "longest_pause": [],
        "filler_ratio": [],
        "vocal_tremor": [],
    }

    for idx, answer in enumerate(mer_data[:12], start=1):
        metrics = answer.get("metrics") or {}
        speech = answer.get("speech_analytics") or {}
        transcript = answer.get("transcript") or ""

        confidence = safe_float(metrics.get("Confidence"))
        speaking = safe_float(metrics.get("Speaking Skills"))
        facial = safe_float(metrics.get("Facial Expression"))
        overall = safe_float(metrics.get("Overall Perf"))
        openness = safe_float(metrics.get("Openness"))
        conscientiousness = safe_float(metrics.get("Conscientiousness"))
        extraversion = safe_float(metrics.get("Extraversion"))
        agreeableness = safe_float(metrics.get("Agreeableness"))
        neuroticism = safe_float(metrics.get("Neuroticism"))

        pacing = safe_float(speech.get("Pacing (WPM)"), 0.0)
        silence = safe_float(speech.get("Silence Ratio (%)"), 0.0)
        longest_pause = safe_float(speech.get("Longest Pause (sec)"), 0.0)
        filler = safe_float(speech.get("Filler Word Ratio (%)"), 0.0)
        tremor = safe_float(speech.get("Vocal Tremor (Jitter)"), 0.0)

        numeric_totals["confidence"].append(confidence)
        numeric_totals["speaking_skills"].append(speaking)
        numeric_totals["facial_expression"].append(facial)
        numeric_totals["overall_perf"].append(overall)
        numeric_totals["openness"].append(openness)
        numeric_totals["conscientiousness"].append(conscientiousness)
        numeric_totals["extraversion"].append(extraversion)
        numeric_totals["agreeableness"].append(agreeableness)
        numeric_totals["neuroticism"].append(neuroticism)
        numeric_totals["pacing_wpm"].append(pacing)
        numeric_totals["silence_ratio"].append(silence)
        numeric_totals["longest_pause"].append(longest_pause)
        numeric_totals["filler_ratio"].append(filler)
        numeric_totals["vocal_tremor"].append(tremor)

        if len(transcript) > 260:
            transcript = transcript[:260] + "..."

        compact_segments.append(
            f"{answer.get('segment')} [{answer.get('time_window')}]: "
            f"transcript='{transcript}'. "
            f"MER scores: confidence={confidence}/10, speaking_skills={speaking}/10, "
            f"facial_expression={facial}/10, overall_perf={overall}/10, "
            f"openness={openness}/10, conscientiousness={conscientiousness}/10, "
            f"extraversion={extraversion}/10, agreeableness={agreeableness}/10, "
            f"neuroticism={neuroticism}/10. "
            f"Speech analytics: pacing={pacing} WPM, silence_ratio={silence}%, "
            f"longest_pause={longest_pause}s, filler_ratio={filler}%, vocal_tremor={tremor}."
        )

    def avg(values, default=5.0):
        values = [v for v in values if isinstance(v, (int, float))]
        return round(sum(values) / len(values), 2) if values else default

    summary = (
        "MER AGGREGATE SUMMARY: "
        f"average confidence={avg(numeric_totals['confidence'])}/10; "
        f"average speaking_skills={avg(numeric_totals['speaking_skills'])}/10; "
        f"average facial_expression={avg(numeric_totals['facial_expression'])}/10; "
        f"average overall_perf={avg(numeric_totals['overall_perf'])}/10; "
        f"average openness={avg(numeric_totals['openness'])}/10; "
        f"average conscientiousness={avg(numeric_totals['conscientiousness'])}/10; "
        f"average extraversion={avg(numeric_totals['extraversion'])}/10; "
        f"average agreeableness={avg(numeric_totals['agreeableness'])}/10; "
        f"average neuroticism={avg(numeric_totals['neuroticism'])}/10; "
        f"average pacing={avg(numeric_totals['pacing_wpm'], 0.0)} WPM; "
        f"average silence_ratio={avg(numeric_totals['silence_ratio'], 0.0)}%; "
        f"average longest_pause={avg(numeric_totals['longest_pause'], 0.0)}s; "
        f"average filler_ratio={avg(numeric_totals['filler_ratio'], 0.0)}%; "
        f"average vocal_tremor={avg(numeric_totals['vocal_tremor'], 0.0)}."
    )

    return summary + "\n\nMER PER-ANSWER DETAILS:\n" + "\n".join(compact_segments)

@app.post("/get_feedback")
async def get_feedback(request: FeedbackRequest):
    session_id = request.session_id
    session_data = SESSIONS.get(session_id)
    if not session_data: raise HTTPException(status_code=404, detail="Session not found")

    mode = session_data.get("mode", "comprehensive")

    history_str = "\n".join([f"- {msg['role'].upper()}: {msg['content']}" for msg in session_data["history"]])

    # Start with any MER data passed by older frontend versions.
    # If none is provided and MER_ENABLED=true, the backend calls Cerebrium securely.
    mer_data = request.mer_data or []

    if not mer_data and is_mer_enabled():
        try:
            print("MER is enabled. Calling Cerebrium MER worker...")
            cerebrium_video_url = generate_recording_url(session_id)

            mer_data = await call_cerebrium_mer(
                video_url=cerebrium_video_url,
                qa_intervals=request.qa_intervals
            )

            print(f"MER returned {len(mer_data)} segments")

        except Exception as e:
            print(f"MER failed. Falling back to transcript-only feedback: {e}")
            mer_data = []
    else:
        print("MER disabled or MER data already provided. Skipping Cerebrium.")

    if mer_data and len(mer_data) > 0:
        mer_text = build_compact_mer_text(mer_data)
    else:
        mer_text = "MER Report Not Found. Evaluate behavior based purely on transcript."

    behavioral_prompt = f"Evaluate:\nRAW MER DATA:\n{mer_text}\n\nTRANSCRIPT FOR CONTEXT:\n{history_str}"

    job_role = session_data.get("job_role", "Domain Expert")
    formatted_tech_sys_prompt = TECHNICAL_SYSTEM_PROMPT.replace("{job_role}", job_role)
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
        behavioral_result = None
        technical_result = None
        overall_score = 0.0

        if mode == "behavioral":
            behavioral_result = await call_llm(BEHAVIORAL_SYSTEM_PROMPT, behavioral_prompt)
            overall_score = float(behavioral_result.get("top_section", {}).get("behavioral_score", 5.0))
        else:
            behavioral_task = call_llm(BEHAVIORAL_SYSTEM_PROMPT, behavioral_prompt)
            technical_task = call_llm(formatted_tech_sys_prompt, technical_prompt)

            behavioral_result, technical_result = await asyncio.gather(behavioral_task, technical_task)

            b_score = float(behavioral_result.get("top_section", {}).get("behavioral_score", 5.0))
            t_score = float(technical_result.get("top_section", {}).get("technical_score", 5.0))

            overall_score = round((b_score + t_score) / 2, 1)

        try:
            video_url = s3_external.generate_presigned_url(
                'get_object',
                Params={'Bucket': BUCKET_NAME, 'Key': f"{session_id}.webm"},
                ExpiresIn=7200
            )
        except Exception as e:
            print(f"Could not generate presigned URL: {e}")
            video_url = None

        final_report = {
            "overall_score": overall_score,
            "behavioral_report": behavioral_result,
            "technical_report": technical_result,
            "mode": mode,
            "video_url": video_url,
            "job_role": job_role
        }

        SESSIONS[session_id]["last_feedback"] = final_report

        return final_report

    except Exception as e:
        print(f"Dual-Agent Feedback Error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to generate feedback.")

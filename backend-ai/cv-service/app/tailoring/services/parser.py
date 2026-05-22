import re
import uuid
from app.tailoring.schemas.cv import ParsedCV
from app.tailoring.services.llm_utils import call_llm_structured

# Lightweight model for fast parsing
PARSING_MODEL = "llama-3.1-8b-instant"

PARSING_PROMPT = """
You are an expert CV data extractor.
Your task is to take a raw, preprocessed CV text and structure it into clean JSON.

Rules:
1. Extract exactly what is written. Do not hallucinate or guess any skills, tools, or experiences.
2. For Experience and Projects, break down the text into distinct bullet points.
3. If a section is missing from the CV, return an empty list or string for that field.
4. Separate the 'Summary' from 'Experience'.
5. Do NOT invent IDs, they will be generated post-parsing.
"""

async def parse_cv(cv_text: str) -> ParsedCV:
    """
    Stage 1: Basic heuristics (if needed, currently relying mostly on LLM for robustness)
    Stage 2: Lightweight LLM extraction into strict Pydantic JSON.
    """
    # LLM Parsing
    parsed_cv = await call_llm_structured(
        system_prompt=PARSING_PROMPT,
        user_content=f"RAW CV:\n{cv_text}",
        response_model=ParsedCV,
        model=PARSING_MODEL,
        temperature=0.0 # Deterministic
    )
    
    # Post-process: assign unique internal IDs to experiences and projects
    for exp in parsed_cv.experience:
        if not exp.id:
            exp.id = str(uuid.uuid4())
            
    for proj in parsed_cv.projects:
        if not proj.id:
            proj.id = str(uuid.uuid4())

    return parsed_cv

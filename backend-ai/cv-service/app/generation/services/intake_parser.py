from pydantic import BaseModel, Field
from typing import List, Dict, Any
from app.tailoring.services.llm_utils import call_llm_structured

INTAKE_PROMPT = """
You are a CV data extraction expert.
Your ONLY job is to extract raw entities (skills, experiences, projects) from the provided extra_info text.
DO NOT classify or reorganize them based on your own judgment. 
DO NOT merge them with the structured profile.
Extract them exactly as they appear.

Rules:
1. If something looks like a job, role, or freelance work, put it in experience_candidates. Include job_title, company, and bullets.
2. If something looks like a personal side project, hackathon, or tool-building, put it in project_candidates. Include name and bullets.
3. Put technical skills in the skills array.
"""

class ExtractedEntities(BaseModel):
    skills: List[str] = Field(default_factory=list)
    experience_candidates: List[Dict[str, Any]] = Field(default_factory=list)
    project_candidates: List[Dict[str, Any]] = Field(default_factory=list)

INTAKE_MODEL = "llama-3.1-8b-instant"

async def extract_entities(extra_info: str) -> ExtractedEntities:
    """
    Level 1 Hybrid Intake: LLM is ONLY used to extract raw entities from extra_info.
    NO merging or final classification happens here.
    """
    if not extra_info or not extra_info.strip():
        return ExtractedEntities()

    user_content = f"=== EXTRA FREEFORM INFO ===\n{extra_info}"

    extracted = await call_llm_structured(
        system_prompt=INTAKE_PROMPT,
        user_content=user_content,
        response_model=ExtractedEntities,
        model=INTAKE_MODEL,
        temperature=0.0
    )

    return extracted

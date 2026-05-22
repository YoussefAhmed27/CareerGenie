from app.tailoring.schemas.jd import JobDescriptionData
from app.tailoring.services.llm_utils import call_llm_structured

EXTRACTION_MODEL = "llama-3.1-8b-instant"

JD_EXTRACTION_PROMPT = """
You are an expert technical recruiter and industry analyst.
Your job is to read a raw Job Description (JD) and extract the core requirements dynamically.

This JD could be from ANY industry (Engineering, Healthcare, Finance, Marketing, HR, etc.).
Do not make assumptions about technologies unless they are explicitly written in the text.

Extract the data into the requested JSON schema accurately.
Be concise. Do not hallucinate.
"""

async def extract_jd_requirements(jd_text: str) -> JobDescriptionData:
    """
    Dynamically extracts requirements from a raw JD text without using hardcoded keyword lists.
    """
    if not jd_text or not jd_text.strip():
        return JobDescriptionData(job_title="Unknown Role")

    extracted_data = await call_llm_structured(
        system_prompt=JD_EXTRACTION_PROMPT,
        user_content=f"JOB DESCRIPTION:\n{jd_text}",
        response_model=JobDescriptionData,
        model=EXTRACTION_MODEL,
        temperature=0.0
    )
    
    return extracted_data

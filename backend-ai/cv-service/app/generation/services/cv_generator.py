import json

from app.generation.schemas.profile import CandidateProfile
from app.generation.schemas.generated_cv import GeneratedCV
from app.generation.generation_prompts import GENERATION_PROMPT

from app.tailoring.services.llm_utils import call_llm_structured


GENERATION_MODEL = "llama-3.3-70b-versatile"


async def generate_cv(profile: CandidateProfile) -> GeneratedCV:
    """
    Generates a professional CV from structured candidate input.
    """

    user_content = f"""
CANDIDATE PROFILE

Name:
{profile.name}

Email:
{profile.email}

Phone:
{profile.phone}

LinkedIn:
{profile.linkedin}

Target Role:
{profile.target_role}

Skills:
{json.dumps(profile.skills, indent=2)}

Education:
{json.dumps([e.model_dump() for e in profile.education], indent=2)}

Experience:
{json.dumps([e.model_dump() for e in profile.experience], indent=2)}

Projects:
{json.dumps([p.model_dump() for p in profile.projects], indent=2)}

Certifications:
{json.dumps(profile.certifications, indent=2)}

Languages:
{json.dumps(profile.languages, indent=2)}
"""

    generated_cv = await call_llm_structured(
        system_prompt=GENERATION_PROMPT,
        user_content=user_content,
        response_model=GeneratedCV,
        model=GENERATION_MODEL,
        temperature=0.4
    )

    return generated_cv
import asyncio
import json
from typing import List, Dict

from app.tailoring.schemas.cv import ParsedCV, Experience, Project
from app.tailoring.schemas.context import TailoringContext
from app.tailoring.schemas.output import (
    TailoredCV, TailoredExperience, TailoredProject, GeneratedBullet, GeneratedSummary
)
from app.tailoring.schemas.jd import JobDescriptionData
from app.tailoring.services.llm_utils import call_llm_structured, call_llm_text
from app.tailoring.prompts.tailor_prompts import (
    TAILOR_SUMMARY_PROMPT, TAILOR_EXPERIENCE_PROMPT, 
    TAILOR_PROJECTS_PROMPT
)

# Use larger models for complex generation, smaller for simpler tasks
HEAVY_MODEL = "llama-3.3-70b-versatile"

async def tailor_summary(cv: ParsedCV, context: TailoringContext) -> GeneratedSummary:
    user_content = (
        f"TARGET ROLE: {context.target_job_title}\n"
        f"KEY REQUIREMENTS: {', '.join(context.top_requirements)}\n"
        f"ORIGINAL SUMMARY: {cv.summary_text}\n"
        f"ALLOWED_SKILLS: {json.dumps(context.allowed_skills)}\n"
    )
    result = await call_llm_structured(
        system_prompt=TAILOR_SUMMARY_PROMPT,
        user_content=user_content,
        response_model=GeneratedSummary,
        model=HEAVY_MODEL
    )
    return result

async def tailor_experience_section(cv: ParsedCV, context: TailoringContext) -> List[TailoredExperience]:
    user_content = (
        f"TARGET ROLE: {context.target_job_title}\n"
        f"KEY REQUIREMENTS: {', '.join(context.top_requirements)}\n"
        f"ALLOWED_SKILLS: {json.dumps(context.allowed_skills)}\n\n"
        f"ORIGINAL EXPERIENCE JSON:\n{json.dumps([e.model_dump() for e in cv.experience], indent=2)}\n"
    )
    from pydantic import BaseModel
    class BulletUpdate(BaseModel):
        id: str
        bullets: List[GeneratedBullet]
        
    class ExperienceUpdateList(BaseModel):
        updates: List[BulletUpdate]
        
    result = await call_llm_structured(
        system_prompt=TAILOR_EXPERIENCE_PROMPT,
        user_content=user_content,
        response_model=ExperienceUpdateList,
        model=HEAVY_MODEL
    )
    
    update_map = {u.id: u.bullets for u in result.updates}
    tailored_exps = []
    
    for orig in cv.experience:
        bullets = update_map.get(orig.id, [])
        if not bullets:
            bullets = [GeneratedBullet(text=b, source_evidence=[b]) for b in orig.bullets]
            
        tailored_exps.append(TailoredExperience(
            id=orig.id,
            job_title=orig.job_title,
            company=orig.company,
            dates=orig.dates,
            location=orig.location,
            bullets=bullets
        ))
    return tailored_exps

async def tailor_projects_section(cv: ParsedCV, context: TailoringContext) -> List[TailoredProject]:
    if not cv.projects:
        return []
    user_content = (
        f"TARGET ROLE: {context.target_job_title}\n"
        f"ALLOWED_SKILLS: {json.dumps(context.allowed_skills)}\n\n"
        f"ORIGINAL PROJECTS JSON:\n{json.dumps([p.model_dump() for p in cv.projects], indent=2)}\n"
    )
    from pydantic import BaseModel
    class ProjectBulletUpdate(BaseModel):
        id: str
        bullets: List[GeneratedBullet]
        
    class ProjectUpdateList(BaseModel):
        updates: List[ProjectBulletUpdate]
        
    result = await call_llm_structured(
        system_prompt=TAILOR_PROJECTS_PROMPT,
        user_content=user_content,
        response_model=ProjectUpdateList,
        model=HEAVY_MODEL
    )
    
    update_map = {u.id: u.bullets for u in result.updates}
    tailored_projs = []
    
    for orig in cv.projects:
        bullets = update_map.get(orig.id, [])
        if not bullets:
            bullets = [GeneratedBullet(text=b, source_evidence=[b]) for b in orig.bullets]
            
        tailored_projs.append(TailoredProject(
            id=orig.id,
            name=orig.name,
            bullets=bullets
        ))
    return tailored_projs

async def tailor_skills_section(cv: ParsedCV, context: TailoringContext) -> List[str]:
    # CRITICAL: Skills pipeline locked. 
    # Do not call an LLM. Return exactly what was parsed from the CV.
    return cv.skills

import re

def extract_all_words(cv: ParsedCV) -> List[str]:
    text = cv.summary_text + " " + " ".join(cv.skills) + " "
    for exp in cv.experience:
        text += exp.job_title + " " + exp.company + " " + " ".join(exp.bullets) + " "
    for proj in cv.projects:
        text += proj.name + " " + " ".join(proj.bullets) + " "
    return list(set(re.findall(r'\b\w+\b', text.lower())))

async def run_tailoring_pipeline(cv: ParsedCV, jd: JobDescriptionData) -> TailoredCV:
    """Runs all tailoring steps in parallel using asyncio.gather"""
    
    allowed_terms = extract_all_words(cv)
    
    context = TailoringContext(
        target_job_title=jd.job_title,
        top_requirements=jd.required_skills + jd.preferred_skills,
        verified_candidate_skills=cv.skills,
        domain_terms=jd.domain_terminology,
        allowed_skills=cv.skills,
        allowed_terms=allowed_terms
    )

    # Parallelize independent generation tasks
    results = await asyncio.gather(
        tailor_summary(cv, context),
        tailor_experience_section(cv, context),
        tailor_projects_section(cv, context),
        tailor_skills_section(cv, context)
    )

    return TailoredCV(
        summary=results[0],
        experience=results[1],
        projects=results[2],
        skills=results[3]
    )

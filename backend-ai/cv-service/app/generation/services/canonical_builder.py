from app.generation.schemas.profile import CandidateProfile, ExperienceInput, ProjectInput
from typing import Dict, Any, List

def build_canonical_profile(structured: CandidateProfile, classified: Dict[str, List[Dict[str, Any]]], extracted_skills: List[str]) -> CandidateProfile:
    """
    Merges classified data into the structured CandidateProfile safely.
    NO extraction or generation happens here. Just safe merging.
    """
    profile = structured.model_copy(deep=True)
    
    # Merge Skills
    if extracted_skills:
        existing = set(s.lower() for s in profile.skills)
        for s in extracted_skills:
            if s.lower() not in existing:
                profile.skills.append(s)

    # Merge Experience
    for exp_dict in classified.get("experience", []):
        profile.experience.append(ExperienceInput(
            job_title=str(exp_dict.get("job_title") or ""),
            company=str(exp_dict.get("company") or ""),
            bullets=exp_dict.get("bullets") or []
        ))

    # Merge Projects
    for proj_dict in classified.get("projects", []):
        profile.projects.append(ProjectInput(
            name=str(proj_dict.get("name") or ""),
            bullets=proj_dict.get("bullets") or []
        ))

    return profile

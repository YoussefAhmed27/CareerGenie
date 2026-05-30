from typing import Dict, Any, List
import re
from app.generation.services.intake_parser import ExtractedEntities

def classify_entities(extracted: ExtractedEntities) -> Dict[str, List[Dict[str, Any]]]:
    """
    Deterministic Classification Engine.
    Rules:
    - Experience: Has a job_title or implied role. If company is missing, we KEEP it in experience.
    - Projects: explicitly personal, academic, hackathon, no job context.
    """
    classified = {
        "experience": [],
        "projects": []
    }

    implied_roles = ["intern", "engineer", "developer", "freelancer", "consultant", "analyst", "manager", "lead"]

    # 1. Process Experience Candidates
    for exp in extracted.experience_candidates:
        title = str(exp.get("job_title") or "").strip()
        company = str(exp.get("company") or "").strip()
        
        # Determine if it has job context
        has_role = bool(title) or any(role in title.lower() or role in company.lower() for role in implied_roles)
        
        # Determine if it's actually a system/project name masquerading as a role
        system_keywords = ["system", "platform", "app", "tool", "engine", "api", "analyzer", "generator"]
        is_system = any(sk in title.lower() for sk in system_keywords)
        
        if is_system:
            has_role = False # Force to projects
            
        if has_role:
            # Valid Experience. Do NOT demote even if company is missing.
            classified["experience"].append(exp)
        else:
            # Unclear/No role context -> Default to Projects
            # Normalize keys to project format
            proj = {
                "name": exp.get("job_title", "") or exp.get("company", "") or "Untitled Project",
                "bullets": exp.get("bullets", [])
            }
            classified["projects"].append(proj)

    # 2. Process Project Candidates
    for proj in extracted.project_candidates:
        name = str(proj.get("name") or "").strip()
        desc = str(proj.get("bullets") or []).lower()
        
        # If the user accidentally put a job in projects
        strong_job_signal = any(role in name.lower() or role in desc for role in ["internship", "freelance", "full-time", "contractor"])
        
        if strong_job_signal:
            # Normalize to experience
            classified["experience"].append({
                "job_title": name,
                "company": "",
                "bullets": proj.get("bullets", [])
            })
        else:
            classified["projects"].append(proj)

    return classified

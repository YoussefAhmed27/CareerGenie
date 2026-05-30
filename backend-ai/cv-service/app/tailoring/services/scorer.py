from typing import List
import re
from app.tailoring.schemas.cv import ParsedCV
from app.tailoring.schemas.jd import JobDescriptionData

def compute_relevance(text: str, keywords: List[str]) -> float:
    """
    Computes a simple keyword overlap ratio.
    In a fully productionized version, this could be TF-IDF or vector embeddings.
    For token efficiency and speed, a fast deterministic heuristic is used.
    """
    if not text or not keywords:
        return 0.0
        
    text_lower = text.lower()
    matches = 0
    
    for kw in keywords:
        # Avoid partial word matches where possible
        pattern = r'\b' + re.escape(kw.lower()) + r'\b'
        if re.search(pattern, text_lower):
            matches += 1
            
    return matches / len(keywords)

def score_and_rank_cv(cv: ParsedCV, jd: JobDescriptionData) -> ParsedCV:
    """
    Scores each experience and project against the JD's core requirements.
    Sorts them descending by relevance score to prioritize high-value content for the LLM.
    """
    all_jd_keywords = jd.required_skills + jd.preferred_skills + jd.domain_terminology
    
    if not all_jd_keywords:
        return cv
        
    # Score Experiences
    for exp in cv.experience:
        combined_text = f"{exp.job_title} {exp.company} " + " ".join(exp.bullets)
        exp.relevance_score = compute_relevance(combined_text, all_jd_keywords)
        
    # Score Projects
    for proj in cv.projects:
        combined_text = f"{proj.name} " + " ".join(proj.bullets)
        proj.relevance_score = compute_relevance(combined_text, all_jd_keywords)
        
    # Sort descending (highest relevance first)
    # We maintain a slight chronological bias if scores are equal, but Pydantic doesn't track original order easily without indexing. 
    # Python's sort is stable, so original order is preserved on ties.
    cv.experience.sort(key=lambda x: x.relevance_score, reverse=True)
    cv.projects.sort(key=lambda x: x.relevance_score, reverse=True)
    
    return cv

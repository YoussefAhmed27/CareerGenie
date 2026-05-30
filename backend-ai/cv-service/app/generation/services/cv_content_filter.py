from typing import List, Dict, Any

def filter_cv_content(bullets: List[str]) -> List[str]:
    """
    STRICT SEMANTIC CONTENT FILTER.
    Acts as a hard gate. Removes extraction artifacts, non-CV content, and fragments.
    """
    valid_bullets = []
    
    # Heuristics for raw artifacts, meta-explanations, and prompt engineering leaks
    artifact_phrases = [
        "takes a job description",
        "rewrites cv",
        "extracts data",
        "llm output",
        "this project",
        "the system works by",
        "a system that",
        "it uses",
        "we built",
        "extract raw entities",
        "json output",
        "parse extra_info",
        "extract structured",
        "do not classify",
        "you are a cv"
    ]
    
    for b in bullets:
        b_clean = b.strip()
        b_lower = b_clean.lower()
        
        # Rule 1: Strict Fragment Filter (< 4 words)
        words = b_clean.split()
        if len(words) < 4:
            continue
            
        # Rule 2: Extraction artifacts & Meta-explanations
        if any(phrase in b_lower for phrase in artifact_phrases):
            continue
            
        valid_bullets.append(b_clean)
        
    return valid_bullets

def filter_extracted_entities(classified: Dict[str, List[Dict[str, Any]]]) -> Dict[str, List[Dict[str, Any]]]:
    """
    Runs the content filter on all classified entities before they hit the canonical builder.
    """
    for exp in classified.get("experience", []):
        if "bullets" in exp:
            exp["bullets"] = filter_cv_content(exp["bullets"])
            
    for proj in classified.get("projects", []):
        if "bullets" in proj:
            proj["bullets"] = filter_cv_content(proj["bullets"])
            
    return classified

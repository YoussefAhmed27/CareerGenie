from typing import Dict, Any, List
import re

def compute_jaccard_similarity(text1: str, text2: str) -> float:
    # 1. English Stop Words & Filler set to strip out background noise
    STOP_WORDS = {
        'a', 'an', 'the', 'and', 'or', 'but', 'if', 'then', 'so', 'for', 'with', 
        'using', 'by', 'of', 'to', 'in', 'on', 'at', 'that', 'this', 'system', 'platform'
    }
    
    # 2. Extract words, strip punctuation, lowercase, and stem basic suffixes
    raw_tokens1 = re.findall(r'\w+', text1.lower())
    raw_tokens2 = re.findall(r'\w+', text2.lower())
    
    # 3. Simple normalization (Normalize trailing 'ing', 'ed', 's' to unify action contexts)
    def normalize_token(w):
        if len(w) > 4:
            if w.endswith('ing'): return w[:-3]
            if w.endswith('ed'): return w[:-2]
            if w.endswith('es'): return w[:-2]
            if w.endswith('s') and not w.endswith('ss'): return w[:-1]
        return w

    set1 = {normalize_token(w) for w in raw_tokens1 if w not in STOP_WORDS}
    set2 = {normalize_token(w) for w in raw_tokens2 if w not in STOP_WORDS}
    
    if not set1 or not set2:
        return 0.0
        
    intersection = set1.intersection(set2)
    union = set1.union(set2)
    
    return len(intersection) / len(union)

def merge_bullets(bullets1: List[str], bullets2: List[str]) -> List[str]:
    """Combines bullets, removing highly similar ones and keeping the richest version."""
    merged = bullets1.copy()
    for b2 in bullets2:
        is_dup = False
        for m in merged:
            # High overlap inside bullets implies they describe the same action
            if compute_jaccard_similarity(b2, m) > 0.6:
                is_dup = True
                # Keep the longer/richer bullet
                if len(b2) > len(m):
                    merged.remove(m)
                    merged.append(b2)
                break
        if not is_dup:
            merged.append(b2)
    return merged

def deduplicate_entities(classified: Dict[str, List[Dict[str, Any]]]) -> Dict[str, List[Dict[str, Any]]]:
    """
    Detects and merges semantic duplicates between Experience and Projects.
    Ensures a single concept lives in ONLY ONE place.
    """
    experiences = classified.get("experience", [])
    projects = classified.get("projects", [])
    
    projects_to_keep = []
    
    implied_roles = ["intern", "engineer", "developer", "freelancer", "consultant", "analyst", "manager", "lead"]
    system_keywords = ["system", "platform", "app", "tool", "engine", "api", "analyzer", "generator"]

    # 1. Inter-sectional Deduplication (Experience vs Projects)
    for proj in projects:
        proj_name = str(proj.get("name") or "")
        proj_bullets = proj.get("bullets", [])
        
        conflict_found = False
        for exp in experiences:
            exp_title = str(exp.get("job_title") or "")
            exp_bullets = exp.get("bullets", [])
            
            # Combine text for matching
            proj_text = proj_name + " " + " ".join(proj_bullets)
            exp_text = exp_title + " " + " ".join(exp_bullets)
            
            title_sim = compute_jaccard_similarity(proj_name, exp_title)
            text_sim = compute_jaccard_similarity(proj_text, exp_text)
            
            # Threshold: ≥ 0.75 title OR 0.60 overall text
            if title_sim >= 0.75 or text_sim >= 0.60:
                conflict_found = True
                
                # Determine resolution rules
                is_system = any(sk in exp_title.lower() for sk in system_keywords)
                has_role = any(role in exp_title.lower() for role in implied_roles)
                
                if has_role and not is_system:
                    # Case A: Valid human role. Keep Experience, merge Project bullets, delete Project
                    exp["bullets"] = merge_bullets(exp_bullets, proj_bullets)
                else:
                    # Case B: System/Tool. Keep Project, delete Experience, merge bullets
                    exp["_delete_me"] = True
                    proj["bullets"] = merge_bullets(proj_bullets, exp_bullets)
                    projects_to_keep.append(proj)
                break
                
        if not conflict_found:
            projects_to_keep.append(proj)

    # Clean up experiences marked for deletion
    experiences_to_keep = [e for e in experiences if not e.get("_delete_me")]
    
    # Remove the temporary flag
    for e in experiences_to_keep:
        if "_delete_me" in e:
            del e["_delete_me"]
            
    return {
        "experience": experiences_to_keep,
        "projects": projects_to_keep
    }

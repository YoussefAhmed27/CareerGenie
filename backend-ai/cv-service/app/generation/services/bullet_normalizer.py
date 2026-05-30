from typing import List
from app.generation.schemas.profile import CandidateProfile
from app.generation.services.semantic_deduplicator import compute_jaccard_similarity

def normalize_bullet_list(bullets: List[str]) -> List[str]:
    """
    Cleans a list of bullets: removes fragments and deduplicates semantic meaning.
    Does NOT hard-delete bullets lacking action verbs.
    """
    cleaned = []
    
    # 1. Fragment & Artifact Filtering
    for bullet in bullets:
        b_clean = bullet.strip()
        
        # Skip fragments (< 3 words)
        if len(b_clean.split()) < 3:
            continue
            
        cleaned.append(b_clean)

    # 2. Intra-entity Semantic Deduplication
    final_bullets = []
    for c in cleaned:
        is_dup = False
        for f in final_bullets:
            if compute_jaccard_similarity(c, f) > 0.65:
                is_dup = True
                # Keep the richer/longer version
                if len(c) > len(f):
                    final_bullets.remove(f)
                    final_bullets.append(c)
                break
        if not is_dup:
            final_bullets.append(c)
            
    return final_bullets

def normalize_canonical_bullets(profile: CandidateProfile) -> CandidateProfile:
    """
    Normalizes all bullets in the entire canonical profile.
    """
    # Mutates the profile in place, but we return it for pipeline chaining
    for exp in profile.experience:
        if exp.bullets:
            exp.bullets = normalize_bullet_list(exp.bullets)
            
    for proj in profile.projects:
        if proj.bullets:
            proj.bullets = normalize_bullet_list(proj.bullets)
            
    return profile

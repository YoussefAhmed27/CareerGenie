import re
from typing import List
from app.tailoring.schemas.output import TailoredCV, GeneratedBullet
from app.tailoring.schemas.cv import ParsedCV

def check_hallucinations(tailored: TailoredCV, original: ParsedCV) -> None:
    """
    Validates skills using literal exact substring match.
    If ANY hallucinated skill is found, the entire skills section falls back to the original skills.
    """
    # Build exact original full text
    original_full_text = original.summary_text + " "
    for exp in original.experience:
        original_full_text += exp.job_title + " " + exp.company + " "
        for b in exp.bullets:
            original_full_text += b + " "
            
    for proj in original.projects:
        original_full_text += proj.name + " "
        for b in proj.bullets:
            original_full_text += b + " "

    is_valid = True
    for generated_skill in tailored.skills:
        # Must be in original parsed skills OR an exact substring in the CV text
        if generated_skill in original.skills:
            continue
        if generated_skill not in original_full_text:
            is_valid = False
            break
            
    if not is_valid:
        print("[VALIDATION WARNING] Hallucinated skill detected. Reverting to original skills.")
        tailored.skills = original.skills.copy()


def check_summary_grounding(tailored: TailoredCV, original: ParsedCV) -> None:
    # If original has no summary, nothing to ground against — skip validation
    if not original.summary_text or not original.summary_text.strip():
        return
    
    is_valid = True
    
    if not tailored.summary.source_evidence:
        is_valid = False
    else:
        for ev in tailored.summary.source_evidence:
            if ev.strip() not in original.summary_text.strip():
                is_valid = False
                break
                
    if not is_valid:
        print("[VALIDATION WARNING] Summary lacks literal evidence. Falling back to original summary.")
        tailored.summary.text = original.summary_text
        tailored.summary.source_evidence = [original.summary_text]


def _validate_and_fallback_bullets(tailored_bullets: List[GeneratedBullet], original_bullets: List[str], context_name: str) -> List[GeneratedBullet]:
    """
    Strictly validates bullets using exact literal substring matching.
    INVALID -> replace with original CV bullet (positional fallback).
    """
    original_full_text = " ".join(original_bullets)
    orig_digits = set(re.findall(r'\d+', original_full_text))
    validated_bullets = []
    
    for i, b in enumerate(tailored_bullets):
        is_valid = True
        
        # 1. Must have evidence
        if not b.source_evidence:
            is_valid = False
        else:
            # 2. Evidence must strictly exist in the original bullets
            for ev in b.source_evidence:
                if ev not in original_full_text:
                    is_valid = False
                    break
                    
        # 3. Must not introduce any new numbers (prevents metric/scale inflation)
        gen_digits = set(re.findall(r'\d+', b.text))
        if not gen_digits.issubset(orig_digits):
            is_valid = False
            
        # 4. Must not use forbidden qualitative scale inflation adjectives
        forbidden_inflation = {"largest", "leading", "significant", "key", "massive", "unparalleled"}
        gen_words = set(re.findall(r'\b[a-zA-Z]+\b', b.text.lower()))
        orig_words = set(re.findall(r'\b[a-zA-Z]+\b', original_full_text.lower()))
        
        # If the LLM used a forbidden word that wasn't in the original text, it's invalid.
        used_forbidden = gen_words.intersection(forbidden_inflation)
        if not used_forbidden.issubset(orig_words):
            is_valid = False
        
        if is_valid:
            validated_bullets.append(b)
        else:
            print(f"[VALIDATION WARNING] Invalid bullet in {context_name}. Positional fallback triggered.")
            # Fallback to the exact original bullet at this position
            if i < len(original_bullets):
                from app.tailoring.schemas.output import GeneratedBullet
                validated_bullets.append(GeneratedBullet(
                    text=original_bullets[i],
                    source_evidence=[original_bullets[i]]
                ))

    return validated_bullets


def check_experience_grounding(tailored: TailoredCV, original: ParsedCV) -> None:
    """
    Validates all bullets in Experience and Projects.
    """
    orig_exp_map = {exp.id: exp for exp in original.experience}
    orig_proj_map = {proj.id: proj for proj in original.projects}
    
    for exp in tailored.experience:
        if exp.id in orig_exp_map:
            original_bullets = orig_exp_map[exp.id].bullets
            exp.bullets = _validate_and_fallback_bullets(exp.bullets, original_bullets, f"Experience '{exp.job_title}'")
            
    for proj in tailored.projects:
        if proj.id in orig_proj_map:
            original_bullets = orig_proj_map[proj.id].bullets
            proj.bullets = _validate_and_fallback_bullets(proj.bullets, original_bullets, f"Project '{proj.name}'")


def validate_tailored_cv(tailored: TailoredCV, original: ParsedCV) -> TailoredCV:
    """
    Master validation pipeline. Modifies the tailored object in-place.
    """
    check_hallucinations(tailored, original)
    check_summary_grounding(tailored, original)
    check_experience_grounding(tailored, original)
    return tailored

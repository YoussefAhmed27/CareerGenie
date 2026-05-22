import re
from app.tailoring.schemas.cv import ParsedCV

ALIASES = {
    "js": "javascript",
    "reactjs": "react",
    "node": "nodejs",
    "postgres": "postgresql",
    "py": "python",
    "ts": "typescript",
    "c++": "cpp"
}

def clamp_score(value: int, min_val: int = 0, max_val: int = 10) -> int:
    return max(min_val, min(max_val, value))

def clamp_100(value: int) -> int:
    return max(0, min(100, value))

def normalize_skill(skill: str) -> str:
    s = skill.lower()
    # Unify common spacing issues before punctuation strip
    s = s.replace(" js", "js")
    # Remove punctuation and spaces
    s = re.sub(r'[^\w]', '', s)
    return ALIASES.get(s, s)

def map_degree(degree: str) -> int:
    deg = degree.lower()
    if any(k in deg for k in ["phd", "doctorate"]): 
        return 10
    if any(k in deg for k in ["master", "msc", "ms", "ma"]): 
        return 8
    if any(k in deg for k in ["bachelor", "bsc", "bs", "ba"]): 
        return 6
    if any(k in deg for k in ["diploma", "bootcamp", "associate", "certificate"]): 
        return 4
    return 2

def compute_deterministic_scores(parsed_cv: ParsedCV, ats_metadata: dict, quality_flags: dict, jd_text: str = None) -> dict:
    """
    Computes purely deterministic section and overall scores.
    These scores are IMMUTABLE and serve as the final authority for the API response.
    """
    
    # 1. Contact Score (0-10)
    contact_score = 10
    if ats_metadata.get("missing_email"): contact_score -= 4
    if ats_metadata.get("missing_phone"): contact_score -= 2
    if ats_metadata.get("missing_linkedin"): contact_score -= 1
    contact_score = clamp_score(contact_score)

    # 2. Skills Score (0-10)
    skill_count = len(parsed_cv.skills)
    if skill_count == 0:
        skills_score = 0
    elif skill_count < 5:
        skills_score = 4
    elif skill_count <= 10:
        skills_score = 7
    elif skill_count <= 20:
        skills_score = 9
    else:
        skills_score = 10
        
    # 3. Experience Score (0-10)
    if ats_metadata.get("missing_experience"):
        experience_score = 0
    else:
        # Base Score
        base_score = 4
        
        # Role Count Contribution
        role_score = min(len(parsed_cv.experience) - 1, 3)  # Max +3 for extra roles
        
        # Quality Signals
        quality_score = 0
        has_empty_bullets = False
        
        for exp in parsed_cv.experience:
            if len(exp.bullets) == 0:
                has_empty_bullets = True
            elif len(exp.bullets) >= 3:
                quality_score += 1
                
            title_lower = exp.job_title.lower()
            if "intern" in title_lower:
                quality_score -= 2
                
            # Reward quantifiable impact metrics (Advanced Regex)
            bullet_text = " ".join(exp.bullets)
            quant_pattern = r'(?i)(\b\d+(?:,\d+){1,}\b)|(\b\d+(?:\.\d+)?\s*(?:k|m|b|million|billion)\b)|(\b\d+(?:\.\d+)?x\b)|%|\$'
            if re.search(quant_pattern, bullet_text):
                quality_score += 1
                
        if has_empty_bullets:
            quality_score -= 3
            
        # Combine and clamp
        raw_score = base_score + role_score + quality_score
        experience_score = clamp_score(raw_score)

    # 4. Education Score (0-10)
    if ats_metadata.get("missing_education") or not parsed_cv.education:
        education_score = 0
    else:
        mapped_scores = [map_degree(edu.degree) for edu in parsed_cv.education]
        education_score = max(mapped_scores) if mapped_scores else 2

    # 5. Summary Score (0-10)
    if ats_metadata.get("empty_summary"):
        summary_score = 0
    else:
        summary_score = 10

    # 6. Structure Score (0-10)
    structure_score = 10
    if ats_metadata.get("missing_skills"): structure_score -= 2
    if ats_metadata.get("missing_education"): structure_score -= 2
    if ats_metadata.get("missing_experience"): structure_score -= 4
    if ats_metadata.get("empty_summary"): structure_score -= 1
    structure_score = clamp_score(structure_score)

    # 7. ATS Compatibility Score (0-10)
    ats_score = 10
    if quality_flags.get("is_template_cv"):
        ats_score -= 3
    if quality_flags.get("is_low_information_cv"):
        ats_score -= 4
    ats_score = clamp_score(ats_score)

    # 8. Overall CV Score (0-100)
    overall_cv_score = clamp_100(int(
        (experience_score * 4) +
        (skills_score * 2) +
        (ats_score * 1.5) +
        (structure_score * 1) +
        (education_score * 0.5) +
        (summary_score * 0.5) +
        (contact_score * 0.5)
    ))

    # 9. Job Alignment Score (0-100)
    if not jd_text:
        job_alignment_score = overall_cv_score
    else:
        jd_lower = jd_text.lower()
        jd_tokens = set(re.findall(r'\b\w+\b', jd_lower))
        
        normalized_skills = set(normalize_skill(s) for s in parsed_cv.skills)
        matched_count = 0
        
        for s in normalized_skills:
            if not s: continue
            
            # 1. Exact token match
            if s in jd_tokens:
                matched_count += 1
            # 2. Substring fallback for multi-word phrases (e.g. "machinelearning" in "machine learning")
            elif s in jd_lower.replace(" ", ""):
                matched_count += 1
                
        match_ratio = matched_count / min(len(normalized_skills), 15) if len(normalized_skills) > 0 else 0
        job_alignment_score = clamp_100(int((overall_cv_score * 0.6) + (match_ratio * 40)))

    return {
        "ats_compatibility_score": ats_score,
        "structure_score": structure_score,
        "skills_score": skills_score,
        "education_score": education_score,
        "experience_score": experience_score,
        "contact_score": contact_score,
        "summary_score": summary_score,
        "overall_cv_score": overall_cv_score,
        "job_alignment_score": job_alignment_score
    }

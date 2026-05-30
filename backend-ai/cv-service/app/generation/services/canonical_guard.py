from app.generation.schemas.profile import CandidateProfile

def validate_and_repair_canonical_profile(profile: CandidateProfile) -> CandidateProfile:
    """
    STRICT CANONICAL GUARD.
    RULES:
    1. No empty fields allowed. Replace "" with "N/A".
    2. Experience validity rule: If job_title exists, KEEP in EXPERIENCE. 
       If company missing, set "N/A", NOT reclassify.
    3. Structural integrity: No partial objects.
    """
    
    if not profile.name or not profile.name.strip(): profile.name = "N/A"
    if not profile.email or not profile.email.strip(): profile.email = "N/A"
    if not profile.phone or not profile.phone.strip(): profile.phone = "N/A"
    if not profile.linkedin or not profile.linkedin.strip(): profile.linkedin = "N/A"
    if not profile.target_role or not profile.target_role.strip(): profile.target_role = "N/A"

    for exp in profile.experience:
        if not exp.job_title or not exp.job_title.strip(): exp.job_title = "N/A"
        if not exp.company or not exp.company.strip(): exp.company = "N/A"
        
        # Ensure bullets is a valid list
        if not exp.bullets: exp.bullets = []
        
    for proj in profile.projects:
        if not proj.name or not proj.name.strip(): proj.name = "N/A"
        
        if not proj.bullets: proj.bullets = []

    for edu in profile.education:
        if not edu.degree or not edu.degree.strip(): edu.degree = "N/A"
        if not edu.institution or not edu.institution.strip(): edu.institution = "N/A"
        if not edu.year or not edu.year.strip(): edu.year = "N/A"

    return profile

def validate_canonical_profile(profile: CandidateProfile) -> CandidateProfile:
    # Backwards compatibility
    return validate_and_repair_canonical_profile(profile)

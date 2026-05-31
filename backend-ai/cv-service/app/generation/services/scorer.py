import re
from collections import Counter
from app.generation.schemas.generated_cv import GeneratedCV

def compute_cv_quality_score(cv: GeneratedCV) -> dict:
    """
    Deterministically scores a GeneratedCV based on Completeness, Structure, Impact, and ATS readiness.
    """
    completeness = 100
    structure = 100
    impact = 100
    ats = 100
    warnings = []
    
    # 1. Completeness Penalties (Missing Fields / N/A usage)
    if cv.name == "N/A": completeness -= 20
    if cv.email == "N/A": completeness -= 20
    if cv.phone == "N/A": completeness -= 20
    if not cv.summary or cv.summary.text == "N/A": completeness -= 20
    
    if cv.experience:
        for exp in cv.experience:
            if exp.dates == "N/A": completeness -= 5
            if exp.company == "N/A": completeness -= 5
            if not exp.bullets: completeness -= 10
            
    # 2. Structure Penalties
    if not cv.skills:
        structure -= 40
    elif len(cv.skills.keys()) < 2:
        structure -= 20 
        
    if cv.projects:
        for proj in cv.projects:
            if not proj.tech_stack:
                structure -= 15
            if len(proj.bullets) < 2:
                structure -= 10

    # 3. Impact Penalties (Metrics, Verbs, Repetition)
    weak_verbs = {"helped", "assisted", "worked", "did", "responsible for", "handled"}
    strong_verbs = {"built", "optimized", "reduced", "improved", "spearheaded", "architected", "delivered"}
    
    if cv.experience:
        for exp in cv.experience:
            if len(exp.bullets) < 3:
                impact -= 10
            
            has_metric = False
            bullet_starts = []
            strong_bullet_count = 0
            
            for b in exp.bullets:
                b_lower = b.lower()
                
                # Metric detection
                if re.search(r'\b\d+(?:[kKmMbB])?\b|%|\$', b):
                    has_metric = True
                    
                # Weak verb penalty
                if any(wv in b_lower for wv in weak_verbs):
                    impact -= 5
                    
                # Strong verb reward/check
                if not any(sv in b_lower for sv in strong_verbs):
                    impact -= 2
                    
                # Repetition detection
                words = b_lower.split()
                if words:
                    bullet_starts.append(words[0])
                    
                # Strict fragment check
                if len(words) < 5:
                    impact -= 5
                    warnings.append(f"Fragment-like bullet detected in {exp.job_title}: '{b[:20]}...'")
                    
                # Action verb enforcement
                if not any(v in b_lower for v in strong_verbs) and not any(v in b_lower for v in weak_verbs):
                    impact -= 5 # Completely lacking verb structure
                    warnings.append(f"Missing action verb in {exp.job_title}: '{b[:20]}...'")
                elif any(v in b_lower for v in strong_verbs):
                    strong_bullet_count += 1
                    
            if not has_metric:
                impact -= 15
                warnings.append(f"Low impact metrics in experience: {exp.job_title}")
                
            # Weak bullet density warning
            if len(exp.bullets) > 0 and (strong_bullet_count / len(exp.bullets)) < 0.5:
                impact -= 10
                warnings.append(f"Weak action verb density in Experience: {exp.job_title}")
                
            # Repetitive starts penalty
            start_counts = Counter(bullet_starts)
            if any(count > 1 for count in start_counts.values()):
                impact -= 10
                warnings.append(f"Repetitive bullet starts detected in {exp.job_title}")
    else:
        impact -= 30 
        warnings.append("No experience provided to measure impact")
        
    # 3.5 Duplicate Entity Checks (Cross section)
    # The deduplicator should have caught this, but if LLM hallucinates duplicates back in:
    if cv.experience and cv.projects:
        exp_titles = [e.job_title.lower() for e in cv.experience]
        for proj in cv.projects:
            if proj.name.lower() in exp_titles:
                structure -= 30
                impact -= 20
                warnings.append(f"SEVERE: Duplicate entity detected across sections: {proj.name}")

    # 4. ATS Readiness
    if len(cv.experience) == 0: ats -= 40
    if len(cv.education) == 0: ats -= 20
    
    # Clamp all to 0-100
    completeness = max(0, min(100, completeness))
    structure = max(0, min(100, structure))
    impact = max(0, min(100, impact))
    ats = max(0, min(100, ats))
    
    overall = int((completeness * 0.3) + (structure * 0.2) + (impact * 0.3) + (ats * 0.2))
    
    return {
        "score": overall,
        "breakdown": {
            "completeness": completeness,
            "structure": structure,
            "impact": impact,
            "ats": ats
        },
        "warnings": warnings
    }

import json
from app.analysis.llm_guard import safe_llm_json
from app.analysis.prompts import build_system_prompt
from app.analysis.schemas import CVAnalysisResult
from app.analysis.scorer import compute_deterministic_scores
from app.tailoring.services.preprocessor import preprocess_cv_text
from app.tailoring.services.parser import parse_cv
from app.tailoring.schemas.cv import ParsedCV

TEMPLATE_SIGNALS = [
    "official company name", "forename surname", "professional email address",
    "degree and subject", "please use 3-4 bullets", "concentrate on your achievements",
    "your nationality", "uk landline or mobile",
]


def is_template(text: str) -> bool:
    text_lower = text.lower()
    return sum(1 for s in TEMPLATE_SIGNALS if s in text_lower) >= 3


def compute_ats_heuristics(parsed_cv: ParsedCV) -> dict:
    return {
        "missing_email": not bool(parsed_cv.contact.email),
        "missing_phone": not bool(parsed_cv.contact.phone),
        "missing_linkedin": not bool(parsed_cv.contact.linkedin),
        "missing_skills": len(parsed_cv.skills) == 0,
        "missing_education": len(parsed_cv.education) == 0,
        "missing_experience": len(parsed_cv.experience) == 0,
        "empty_summary": not parsed_cv.summary_text or not parsed_cv.summary_text.strip(),
        "experience_count": len(parsed_cv.experience),
        "low_skills_count": len(parsed_cv.skills) < 5,
        "no_bullets_in_experience": any(len(exp.bullets) == 0 for exp in parsed_cv.experience) if parsed_cv.experience else False
    }


def compute_cv_quality_flags(parsed_cv: ParsedCV, template_flag: bool) -> dict:
    return {
        "is_template_cv": template_flag,
        "is_low_information_cv": (
            len(parsed_cv.experience) == 0 and
            len(parsed_cv.education) == 0 and
            len(parsed_cv.skills) < 3
        ),
        "is_entry_level": len(parsed_cv.experience) <= 1
    }


def inject_deterministic_scores(response: CVAnalysisResult, scores: dict) -> CVAnalysisResult:
    """
    Forcefully overwrites all LLM-generated numerical scores with the mathematically
    derived deterministic Python scores to guarantee absolute evaluation integrity.
    """
    response.overall_cv_score = scores["overall_cv_score"]
    response.job_alignment_score = scores["job_alignment_score"]

    response.cv_analysis.ats_compatibility.score = scores["ats_compatibility_score"]
    response.cv_analysis.structure.score = scores["structure_score"]
    response.cv_analysis.skills_section.score = scores["skills_score"]
    response.cv_analysis.education.score = scores["education_score"]
    response.cv_analysis.experience.score = scores["experience_score"]
    response.cv_analysis.contact_info.score = scores["contact_score"]
    response.cv_analysis.professional_summary.score = scores["summary_score"]

    return response


async def analyze_cv(cv_text: str, jd_text: str = None) -> CVAnalysisResult:
    # 1. Preprocess CV
    clean_cv_text = preprocess_cv_text(cv_text)

    # Check template early to avoid unnecessary LLM calls
    template_flag = is_template(clean_cv_text)
    if template_flag:
        raise Exception("TEMPLATE_CV")

    system_prompt = build_system_prompt(jd_text)

    # 2. Parse structured CV
    parsed_cv = await parse_cv(clean_cv_text)

    # 3. Compute deterministic ATS metadata
    ats_metadata = compute_ats_heuristics(parsed_cv)

    # 4. Compute additional CV quality flags
    cv_quality_flags = compute_cv_quality_flags(parsed_cv, template_flag)

    # 5. Compute Deterministic Scores (Python Authority)
    deterministic_scores = compute_deterministic_scores(parsed_cv, ats_metadata, cv_quality_flags, jd_text)

    # 6. Construct STRICT formatted LLM input
    user_content = f"=== DETERMINISTIC SCORES ===\n{json.dumps(deterministic_scores, indent=2)}\n\n"
    user_content += f"=== ATS METADATA ===\n{json.dumps(ats_metadata, indent=2)}\n\n"
    user_content += f"=== CV QUALITY FLAGS ===\n{json.dumps(cv_quality_flags, indent=2)}\n\n"
    user_content += f"=== STRUCTURED CV (PRIMARY SOURCE OF TRUTH) ===\n{parsed_cv.model_dump_json(indent=2)}\n\n"
    user_content += f"=== RAW CV TEXT (SUPPLEMENTARY ONLY) ===\n{clean_cv_text}"

    if jd_text:
        user_content += f"\n\n=== JOB DESCRIPTION (OPTIONAL) ===\n{jd_text}"

    # 7. LLM Evaluation
    llm_response = await safe_llm_json(system_prompt=system_prompt, user_content=user_content)

    # 8. Deterministic Overwrite (Reconciliation Layer)
    final_response = inject_deterministic_scores(llm_response, deterministic_scores)

    # HR batch screening addition.
    # Prefer parsed structured contact name when the LLM did not provide one.
    if not final_response.candidate_name and parsed_cv.contact.name:
        final_response.candidate_name = parsed_cv.contact.name.strip()

    return final_response
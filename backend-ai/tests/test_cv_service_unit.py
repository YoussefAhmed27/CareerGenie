import sys
import types
import asyncio
from pathlib import Path

CV_SERVICE_ROOT = Path(__file__).resolve().parents[1] / "cv-service"
sys.path.insert(0, str(CV_SERVICE_ROOT))

sys.modules.setdefault("dotenv", types.SimpleNamespace(load_dotenv=lambda *args, **kwargs: None))
sys.modules.setdefault("groq", types.SimpleNamespace(AsyncGroq=lambda *args, **kwargs: object()))

from app.analysis.analyzer import (  # noqa: E402
    compute_ats_heuristics,
    compute_cv_quality_flags,
    inject_deterministic_scores,
    is_template,
)
from app.analysis.schemas import (  # noqa: E402
    AnalysisSection,
    CVAnalysisResult,
    CVAnalysisSection,
    JobMatchAnalysis,
    QualitativeAssessment,
)
from app.analysis.scorer import compute_deterministic_scores, map_degree, normalize_skill  # noqa: E402
from app.generation.schemas.generated_cv import GeneratedCV, GeneratedSummary  # noqa: E402
from app.generation.schemas.profile import CVGenerationRequest, CandidateProfile  # noqa: E402
from app.tailoring.schemas.cv import ContactInfo, Education, Experience, ParsedCV, Project  # noqa: E402
from app.tailoring.schemas.jd import JobDescriptionData  # noqa: E402
from app.tailoring.schemas.output import (  # noqa: E402
    GeneratedBullet,
    GeneratedSummary as TailoredSummary,
    TailoredCV,
    TailoredExperience,
)
from app.tailoring.services.cache import InMemoryLRUCache, generate_text_hash  # noqa: E402
from app.tailoring.services.renderer import render_markdown  # noqa: E402


def parsed_cv(**overrides):
    data = {
        "contact": ContactInfo(
            name="Maya Chen",
            email="maya@example.com",
            phone="+1 555 0100",
            linkedin="linkedin.com/in/maya",
            location="Cairo",
        ),
        "summary_text": "Backend engineer with hiring platform experience.",
        "skills": ["Python", "React", "PostgreSQL", "Docker", "FastAPI"],
        "education": [Education(degree="Bachelor of Computer Science", institution="AUC", date="2024")],
        "experience": [
            Experience(
                id="exp-1",
                job_title="Software Engineer",
                company="CareerGenie",
                dates="2024",
                location="Remote",
                bullets=["Improved screening accuracy by 25%", "Built API services", "Automated reports"],
            )
        ],
        "projects": [Project(id="proj-1", name="ATS Dashboard", bullets=["Built ranking workflow"])],
    }
    data.update(overrides)
    return ParsedCV(**data)


def empty_analysis_result():
    zero = AnalysisSection(score=0, feedback="pending")
    return CVAnalysisResult(
        overall_cv_score=0,
        job_alignment_score=0,
        summary="summary",
        cv_analysis=CVAnalysisSection(
            ats_compatibility=zero.model_copy(),
            structure=zero.model_copy(),
            skills_section=zero.model_copy(),
            education=zero.model_copy(),
            experience=zero.model_copy(),
            contact_info=zero.model_copy(),
            professional_summary=zero.model_copy(),
        ),
        job_match_analysis=JobMatchAnalysis(
            matched_keywords=[],
            missing_critical_skills=[],
            seniority_fit="N/A",
            match_explanation="",
            skill_gap_analysis=[],
        ),
        qualitative_assessment=QualitativeAssessment(strengths=[], weaknesses=[]),
        recommendations=[],
        tailoring_tips="",
    )


def test_template_detection_requires_multiple_signals():
    text = "Official company name, Forename Surname, Professional email address, degree and subject"
    assert is_template(text) is True


def test_template_detection_ignores_normal_cv_text():
    assert is_template("Senior engineer with Python and FastAPI experience") is False


def test_ats_heuristics_detect_missing_sections():
    heuristics = compute_ats_heuristics(ParsedCV())
    assert heuristics["missing_email"] is True
    assert heuristics["missing_skills"] is True
    assert heuristics["missing_experience"] is True
    assert heuristics["empty_summary"] is True


def test_ats_heuristics_count_complete_cv_sections():
    heuristics = compute_ats_heuristics(parsed_cv())
    assert heuristics["missing_email"] is False
    assert heuristics["experience_count"] == 1
    assert heuristics["low_skills_count"] is False


def test_quality_flags_mark_low_information_cv():
    flags = compute_cv_quality_flags(ParsedCV(skills=["Python"]), template_flag=False)
    assert flags["is_low_information_cv"] is True
    assert flags["is_entry_level"] is True


def test_quality_flags_preserve_template_signal():
    flags = compute_cv_quality_flags(parsed_cv(), template_flag=True)
    assert flags["is_template_cv"] is True
    assert flags["is_low_information_cv"] is False


def test_skill_normalization_handles_aliases_and_punctuation():
    assert normalize_skill("React.js") == "react"
    assert normalize_skill("Node") == "nodejs"
    assert normalize_skill("C++") == "c"
    assert normalize_skill("Postgres") == "postgresql"


def test_degree_mapping_prioritizes_highest_common_degree():
    assert map_degree("PhD in AI") == 10
    assert map_degree("Master of Science") == 8
    assert map_degree("Bachelor degree") == 6
    assert map_degree("coding bootcamp") == 4
    assert map_degree("unknown") == 2


def test_deterministic_scores_reward_complete_cv():
    cv = parsed_cv()
    scores = compute_deterministic_scores(
        cv,
        compute_ats_heuristics(cv),
        compute_cv_quality_flags(cv, template_flag=False),
        "Python FastAPI PostgreSQL backend engineer",
    )
    assert scores["overall_cv_score"] >= 70
    assert scores["job_alignment_score"] >= scores["overall_cv_score"] * 0.6


def test_deterministic_scores_penalize_missing_contact_and_experience():
    cv = ParsedCV(skills=["Python"], summary_text="")
    scores = compute_deterministic_scores(
        cv,
        compute_ats_heuristics(cv),
        compute_cv_quality_flags(cv, template_flag=False),
    )
    assert scores["contact_score"] < 10
    assert scores["experience_score"] == 0
    assert scores["overall_cv_score"] < 50


def test_inject_deterministic_scores_overwrites_llm_scores():
    result = empty_analysis_result()
    scores = {
        "overall_cv_score": 82,
        "job_alignment_score": 77,
        "ats_compatibility_score": 8,
        "structure_score": 9,
        "skills_score": 7,
        "education_score": 6,
        "experience_score": 8,
        "contact_score": 10,
        "summary_score": 9,
    }
    updated = inject_deterministic_scores(result, scores)
    assert updated.overall_cv_score == 82
    assert updated.cv_analysis.contact_info.score == 10
    assert updated.cv_analysis.professional_summary.score == 9


def test_parsed_cv_casts_dict_publications_and_awards_to_strings():
    cv = ParsedCV(publications=[{"title": "Paper", "venue": "Conference"}], awards=[{"name": "Dean list"}])
    assert cv.publications == ["Paper - Conference"]
    assert cv.awards == ["Dean list"]


def test_tailoring_renderer_outputs_contact_summary_and_skills():
    original = parsed_cv()
    tailored = TailoredCV(
        summary=TailoredSummary(text="Backend engineer focused on hiring systems."),
        skills=["Python", "FastAPI"],
        experience=[],
        projects=[],
    )
    markdown = render_markdown(tailored, original)
    assert "# Maya Chen" in markdown
    assert "maya@example.com" in markdown
    assert "## Summary" in markdown
    assert "- Python, FastAPI" in markdown


def test_tailoring_renderer_outputs_tailored_experience_bullets():
    original = parsed_cv()
    tailored = TailoredCV(
        summary=TailoredSummary(text="Summary"),
        skills=[],
        experience=[
            TailoredExperience(
                id="exp-1",
                job_title="Software Engineer",
                company="CareerGenie",
                dates="2024",
                location="Remote",
                bullets=[GeneratedBullet(text="Built a ranked screening pipeline.", source_evidence=[])],
            )
        ],
        projects=[],
    )
    markdown = render_markdown(tailored, original)
    assert "### Software Engineer" in markdown
    assert "- Built a ranked screening pipeline." in markdown


def test_generated_cv_schema_fills_empty_identity_fields():
    cv = GeneratedCV(summary=GeneratedSummary(text=""))
    assert cv.name == "N/A"
    assert cv.email == "N/A"
    assert cv.summary.text == "N/A"


def test_candidate_profile_defaults_to_empty_collections():
    profile = CandidateProfile(name="Maya")
    assert profile.skills == []
    assert profile.education == []
    assert profile.name == "Maya"


def test_cv_generation_request_preserves_structured_profile_and_extra_info():
    request = CVGenerationRequest(structured=CandidateProfile(name="Maya"), extra_info="Built dashboards")
    assert request.structured.name == "Maya"
    assert request.extra_info == "Built dashboards"


def test_job_description_schema_requires_title_and_defaults_lists():
    jd = JobDescriptionData(job_title="Backend Engineer")
    assert jd.job_title == "Backend Engineer"
    assert jd.required_skills == []
    assert jd.core_responsibilities == []


def test_in_memory_lru_cache_get_set_and_eviction():
    async def run_cache_flow():
        cache = InMemoryLRUCache(max_size=2)
        await cache.set("a", 1)
        await cache.set("b", 2)
        assert await cache.get("a") == 1
        await cache.set("c", 3)
        assert await cache.get("b") is None
        assert await cache.get("c") == 3

    asyncio.run(run_cache_flow())


def test_generate_text_hash_is_deterministic_and_empty_safe():
    assert generate_text_hash("same text") == generate_text_hash("same text")
    assert generate_text_hash("") == ""

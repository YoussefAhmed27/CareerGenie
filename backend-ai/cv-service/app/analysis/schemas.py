from pydantic import BaseModel, Field
from typing import List, Literal, Optional


class AnalysisSection(BaseModel):
    score: int = Field(ge=0, le=10)
    feedback: str


class CVAnalysisSection(BaseModel):
    ats_compatibility: AnalysisSection
    structure: AnalysisSection
    skills_section: AnalysisSection
    education: AnalysisSection
    experience: AnalysisSection
    contact_info: AnalysisSection
    professional_summary: AnalysisSection


class SkillGap(BaseModel):
    skill: str
    status: Literal["missing", "weak", "unverified"]
    priority: Literal["high", "medium", "low"]
    explanation: str


class JobMatchAnalysis(BaseModel):
    matched_keywords: List[str]
    missing_critical_skills: List[str]
    seniority_fit: Literal["High", "Medium", "Low", "N/A"]
    match_explanation: str
    skill_gap_analysis: List[SkillGap]


class QualitativeItem(BaseModel):
    title: str
    detail: str


class QualitativeAssessment(BaseModel):
    strengths: List[QualitativeItem]
    weaknesses: List[QualitativeItem]


class Recommendation(BaseModel):
    priority: Literal["High", "Medium", "Low"]
    action: str
    details: str


class CVAnalysisResult(BaseModel):
    overall_cv_score: int = Field(ge=0, le=100)
    job_alignment_score: int = Field(ge=0, le=100)

    # Optional HR screening fields.
    # Optional so the existing candidate CV Assistant response contract remains compatible.
    candidate_name: Optional[str] = None
    candidate_email: Optional[str] = None
    cv_text: Optional[str] = None

    summary: str
    cv_analysis: CVAnalysisSection
    job_match_analysis: JobMatchAnalysis
    qualitative_assessment: QualitativeAssessment
    recommendations: List[Recommendation]
    tailoring_tips: str
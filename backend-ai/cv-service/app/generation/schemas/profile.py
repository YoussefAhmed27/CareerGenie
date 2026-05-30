from pydantic import BaseModel, Field
from typing import List

class EducationInput(BaseModel):
    degree: str = ""
    institution: str = ""
    year: str = ""

class ExperienceInput(BaseModel):
    job_title: str = ""
    company: str = ""
    year: str = ""
    location: str = ""
    bullets: List[str] = Field(default_factory=list)

class ProjectInput(BaseModel):
    name: str = ""
    bullets: List[str] = Field(default_factory=list)


class CandidateProfile(BaseModel):
    # identity
    name: str = ""
    email: str = ""
    phone: str = ""
    linkedin: str = ""

    # career intent
    target_role: str = ""

    # content
    skills: List[str] = Field(default_factory=list)
    education: List[EducationInput] = Field(default_factory=list)
    experience: List[ExperienceInput] = Field(default_factory=list)
    projects: List[ProjectInput] = Field(default_factory=list)
    certifications: List[str] = Field(default_factory=list)
    languages: List[str] = Field(default_factory=list)


class CVGenerationRequest(BaseModel):
    structured: CandidateProfile
    extra_info: str = Field(default="", description="Freeform user text describing projects, achievements, or experience")

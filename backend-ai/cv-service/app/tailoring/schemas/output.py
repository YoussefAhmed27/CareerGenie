from typing import List, Dict
from pydantic import BaseModel, Field

class GeneratedSummary(BaseModel):
    text: str = Field(..., description="The compressed professional summary")
    source_evidence: List[str] = Field(
        default_factory=list,
        description="Exact sentences/phrases from the original CV used to generate this summary"
    )

class GeneratedBullet(BaseModel):
    text: str = Field(..., description="The rewritten bullet point")
    source_evidence: List[str] = Field(
        default_factory=list,
        description="Original CV bullet points that support this claim"
    )

class TailoredExperience(BaseModel):
    id: str = Field(..., description="The ID from the ParsedCV Experience")
    job_title: str = ""
    company: str = ""
    dates: str = ""
    location: str = ""
    bullets: List[GeneratedBullet] = Field(default_factory=list)

class TailoredProject(BaseModel):
    id: str = Field(..., description="The ID from the ParsedCV Project")
    name: str = ""
    bullets: List[GeneratedBullet] = Field(default_factory=list)

class TailoredCV(BaseModel):
    """The final structured JSON from the tailoring steps"""
    summary: GeneratedSummary
    skills: List[str] = Field(default_factory=list, description="Exact copy of original parsed CV skills")
    experience: List[TailoredExperience] = Field(default_factory=list)
    projects: List[TailoredProject] = Field(default_factory=list)

class TailoringResponse(BaseModel):
    """API Response Model"""
    cv_id: str
    tailored_cv_markdown: str

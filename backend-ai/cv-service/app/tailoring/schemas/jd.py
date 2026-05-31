from typing import List, Optional
from pydantic import BaseModel, Field

class JobDescriptionData(BaseModel):
    """Structured extraction of a job description"""
    job_title: str = Field(..., description="The title of the role")
    required_skills: List[str] = Field(default_factory=list, description="Must-have skills, tools, or technologies")
    preferred_skills: List[str] = Field(default_factory=list, description="Nice-to-have skills")
    core_responsibilities: List[str] = Field(default_factory=list, description="Main duties of the role")
    qualifications: List[str] = Field(default_factory=list, description="Required education or certifications")
    domain_terminology: List[str] = Field(default_factory=list, description="Industry-specific buzzwords or concepts mentioned")

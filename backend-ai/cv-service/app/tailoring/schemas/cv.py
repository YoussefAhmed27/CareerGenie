from typing import List, Optional, Any
from pydantic import BaseModel, Field, field_validator

class ContactInfo(BaseModel):
    name: str = ""
    email: str = ""
    phone: str = ""
    linkedin: str = ""
    location: str = ""

class Education(BaseModel):
    degree: str = ""
    institution: str = ""
    date: str = ""
    details: List[str] = Field(default_factory=list)

class Experience(BaseModel):
    id: str = Field(..., description="Unique identifier for internal tracking")
    job_title: str = ""
    company: str = ""
    dates: str = ""
    location: str = ""
    bullets: List[str] = Field(default_factory=list)
    relevance_score: float = 0.0 # To be populated later

class Project(BaseModel):
    id: str = Field(..., description="Unique identifier for internal tracking")
    name: str = ""
    bullets: List[str] = Field(default_factory=list)
    relevance_score: float = 0.0

class ParsedCV(BaseModel):
    """Structured representation of the original CV"""
    contact: ContactInfo = Field(default_factory=ContactInfo)
    summary_text: str = ""
    education: List[Education] = Field(default_factory=list)
    experience: List[Experience] = Field(default_factory=list)
    projects: List[Project] = Field(default_factory=list)
    skills: List[str] = Field(default_factory=list)
    publications: List[str] = Field(default_factory=list)
    awards: List[str] = Field(default_factory=list)
    languages: List[str] = Field(default_factory=list)

    @field_validator('publications', 'awards', mode='before')
    @classmethod
    def cast_to_strings(cls, v: Any) -> List[str]:
        if not isinstance(v, list):
            return v
        cleaned = []
        for item in v:
            if isinstance(item, dict):
                # If LLM returns {"title": "xyz"} instead of a string
                cleaned.append(" - ".join([str(val) for val in item.values() if val]))
            else:
                cleaned.append(str(item))
        return cleaned

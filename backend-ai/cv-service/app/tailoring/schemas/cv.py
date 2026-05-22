from typing import List, Optional
from pydantic import BaseModel, Field

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

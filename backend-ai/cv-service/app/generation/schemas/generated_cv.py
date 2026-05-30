from typing import List, Dict, Any
from pydantic import BaseModel, Field, model_validator


class GeneratedSummary(BaseModel):
    text: str = Field(..., description="Generated professional summary")

    @model_validator(mode="before")
    @classmethod
    def clean_empty(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if not data.get("text"):
                data["text"] = "N/A"
        return data


class GeneratedExperience(BaseModel):
    job_title: str = Field(default="N/A")
    company: str = Field(default="N/A")
    dates: str = Field(default="N/A")
    location: str = Field(default="Remote")
    bullets: List[str] = Field(default_factory=list)

    @model_validator(mode="before")
    @classmethod
    def clean_empty(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if not data.get("job_title"): data["job_title"] = "N/A"
            if not data.get("company"): data["company"] = "N/A"
            if not data.get("dates"): data["dates"] = "N/A"
            if not data.get("location"): data["location"] = "Remote"
        return data


class GeneratedProject(BaseModel):
    name: str = Field(default="N/A")
    tech_stack: List[str] = Field(default_factory=list)
    bullets: List[str] = Field(default_factory=list)

    @model_validator(mode="before")
    @classmethod
    def clean_empty(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if not data.get("name"): data["name"] = "N/A"
        return data


class GeneratedEducation(BaseModel):
    degree: str = Field(default="N/A")
    institution: str = Field(default="N/A")
    year: str = Field(default="N/A")

    @model_validator(mode="before")
    @classmethod
    def clean_empty(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if not data.get("degree"): data["degree"] = "N/A"
            if not data.get("institution"): data["institution"] = "N/A"
            if not data.get("year"): data["year"] = "N/A"
        return data


class GeneratedCV(BaseModel):
    # Contact
    name: str = Field(default="N/A")
    email: str = Field(default="N/A")
    phone: str = Field(default="N/A")
    linkedin: str = Field(default="N/A")

    # Generated sections
    summary: GeneratedSummary

    skills: Dict[str, List[str]] = Field(default_factory=dict)

    education: List[GeneratedEducation] = Field(default_factory=list)

    experience: List[GeneratedExperience] = Field(default_factory=list)

    projects: List[GeneratedProject] = Field(default_factory=list)

    certifications: List[str] = Field(default_factory=list)

    languages: List[str] = Field(default_factory=list)

    @model_validator(mode="before")
    @classmethod
    def clean_empty(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if not data.get("name"): data["name"] = "N/A"
            if not data.get("email"): data["email"] = "N/A"
            if not data.get("phone"): data["phone"] = "N/A"
            if not data.get("linkedin"): data["linkedin"] = "N/A"
        return data
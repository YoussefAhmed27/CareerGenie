from typing import List
from pydantic import BaseModel, Field

class TailoringContext(BaseModel):
    """Shared state used across all parallel tailoring steps"""
    target_job_title: str = ""
    top_requirements: List[str] = Field(default_factory=list)
    verified_candidate_skills: List[str] = Field(default_factory=list)
    domain_terms: List[str] = Field(default_factory=list)
    allowed_skills: List[str] = Field(default_factory=list, description="Strict whitelist of parsed skills")
    allowed_terms: List[str] = Field(default_factory=list, description="Strict whitelist of all normalized words from CV")

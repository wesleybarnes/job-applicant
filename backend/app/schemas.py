from pydantic import BaseModel, EmailStr
from typing import Optional, List, Any
from datetime import datetime


# ─── User Profile ───────────────────────────────────────────────────────────

class UserProfileCreate(BaseModel):
    full_name: str
    email: EmailStr
    phone: Optional[str] = None
    location: Optional[str] = None
    linkedin_url: Optional[str] = None
    github_url: Optional[str] = None
    portfolio_url: Optional[str] = None
    target_roles: Optional[List[str]] = []
    target_industries: Optional[List[str]] = []
    target_locations: Optional[List[str]] = []
    salary_min: Optional[int] = None
    salary_max: Optional[int] = None
    work_authorization: Optional[str] = None
    willing_to_relocate: Optional[bool] = False
    remote_preference: Optional[str] = "any"
    years_experience: Optional[int] = None
    education_level: Optional[str] = None
    skills: Optional[List[str]] = []
    summary: Optional[str] = None
    availability: Optional[str] = None
    custom_answers: Optional[dict] = {}


class UserProfileUpdate(UserProfileCreate):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None


class UserProfileResponse(UserProfileCreate):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ─── Resume ─────────────────────────────────────────────────────────────────

class ResumeResponse(BaseModel):
    id: int
    user_id: int
    filename: str
    structured_data: Optional[dict] = None
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Job ────────────────────────────────────────────────────────────────────

class JobCreate(BaseModel):
    title: str
    company: str
    location: Optional[str] = None
    job_type: Optional[str] = None
    remote_type: Optional[str] = None
    description: Optional[str] = None
    requirements: Optional[str] = None
    salary_min: Optional[int] = None
    salary_max: Optional[int] = None
    url: Optional[str] = None
    source: Optional[str] = "manual"


class JobResponse(JobCreate):
    id: int
    match_score: Optional[float] = None
    match_reasons: Optional[List[str]] = None
    posted_date: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


class JobSearchRequest(BaseModel):
    query: Optional[str] = None
    location: Optional[str] = None
    remote: Optional[bool] = None
    job_type: Optional[str] = None
    salary_min: Optional[int] = None


# ─── Application ────────────────────────────────────────────────────────────

class ApplicationCreate(BaseModel):
    user_id: int
    job_id: int


class ApplicationUpdate(BaseModel):
    status: Optional[str] = None
    notes: Optional[str] = None


class ApplicationResponse(BaseModel):
    id: int
    user_id: int
    job_id: int
    status: str
    cover_letter: Optional[str] = None
    notes: Optional[str] = None
    agent_log: Optional[List[Any]] = None
    submitted_at: Optional[datetime] = None
    created_at: datetime
    job: Optional[JobResponse] = None

    class Config:
        from_attributes = True


# ─── Agent ──────────────────────────────────────────────────────────────────

class AgentRunRequest(BaseModel):
    application_id: int
    mode: str = "full"   # full / cover_letter_only / analyze_only


class AgentRunResponse(BaseModel):
    application_id: int
    status: str
    cover_letter: Optional[str] = None
    match_score: Optional[float] = None
    agent_log: List[Any] = []
    message: str


# ─── Questionnaire ──────────────────────────────────────────────────────────

class QuestionnaireStep(BaseModel):
    step: int
    data: dict

from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, JSON, Float, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class UserProfile(Base):
    __tablename__ = "user_profiles"

    id = Column(Integer, primary_key=True, index=True)
    clerk_user_id = Column(String(200), unique=True, index=True, nullable=True)
    full_name = Column(String(200), nullable=True)   # nullable until onboarding complete
    email = Column(String(200), unique=True, index=True, nullable=False)
    phone = Column(String(50))
    location = Column(String(200))
    linkedin_url = Column(String(500))
    github_url = Column(String(500))
    portfolio_url = Column(String(500))
    auto_apply = Column(Boolean, default=False)
    is_admin = Column(Boolean, default=False)
    credits = Column(Integer, default=5)      # free credits on signup
    onboarding_complete = Column(Boolean, default=False)

    # Questionnaire responses
    target_roles = Column(JSON)          # list of job titles
    target_industries = Column(JSON)     # list of industries
    target_locations = Column(JSON)      # list of cities/remote
    salary_min = Column(Integer)
    salary_max = Column(Integer)
    work_authorization = Column(String(100))
    willing_to_relocate = Column(Boolean, default=False)
    remote_preference = Column(String(50))  # remote/hybrid/onsite/any
    years_experience = Column(Integer)
    education_level = Column(String(100))
    skills = Column(JSON)                # list of skills
    summary = Column(Text)               # professional summary
    availability = Column(String(100))   # immediate/2weeks/1month
    custom_answers = Column(JSON)        # common app questions & answers

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    resumes = relationship("Resume", back_populates="user")
    applications = relationship("Application", back_populates="user")
    hunt_sessions = relationship("HuntSession", back_populates="user")


class Resume(Base):
    __tablename__ = "resumes"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("user_profiles.id"), nullable=False)
    filename = Column(String(500), nullable=False)
    file_path = Column(String(1000), nullable=False)
    parsed_text = Column(Text)
    structured_data = Column(JSON)   # extracted skills, experience, education
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("UserProfile", back_populates="resumes")


class Job(Base):
    __tablename__ = "jobs"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(300), nullable=False)
    company = Column(String(300), nullable=False)
    location = Column(String(300))
    job_type = Column(String(50))     # full-time/part-time/contract
    remote_type = Column(String(50))  # remote/hybrid/onsite
    description = Column(Text)
    requirements = Column(Text)
    salary_min = Column(Integer)
    salary_max = Column(Integer)
    url = Column(String(1000))
    source = Column(String(100))      # linkedin/indeed/manual/etc
    external_id = Column(String(200))
    posted_date = Column(DateTime(timezone=True))
    match_score = Column(Float)       # AI-computed match score 0-100
    match_reasons = Column(JSON)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    applications = relationship("Application", back_populates="job")


class Application(Base):
    __tablename__ = "applications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("user_profiles.id"), nullable=False)
    job_id = Column(Integer, ForeignKey("jobs.id"), nullable=False)

    status = Column(String(50), default="pending")
    # pending / in_progress / submitted / applied / interviewing / rejected / offer / withdrawn

    cover_letter = Column(Text)
    tailored_resume_path = Column(String(1000))
    notes = Column(Text)

    # Agent execution tracking
    agent_log = Column(JSON)          # list of agent actions taken
    submitted_at = Column(DateTime(timezone=True))
    last_updated = Column(DateTime(timezone=True), onupdate=func.now())
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("UserProfile", back_populates="applications")
    job = relationship("Job", back_populates="applications")


class HuntSession(Base):
    __tablename__ = "hunt_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("user_profiles.id"), nullable=False)
    status = Column(String(50), default="running")  # running / stopped / complete
    jobs_found = Column(Integer, default=0)
    jobs_applied = Column(Integer, default=0)
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    stopped_at = Column(DateTime(timezone=True), nullable=True)
    log = Column(JSON, default=list)

    user = relationship("UserProfile", back_populates="hunt_sessions")

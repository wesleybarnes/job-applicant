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
    goals = Column(Text)                 # free-form goals from the pre-hunt survey
    goal_summary = Column(Text)          # AI-generated, user-editable goal summary
    goal_summary_updated_at = Column(DateTime(timezone=True))  # when the summary was last (re)written — used to flag staleness vs new resumes

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
    logo_url = Column(String(1000))   # company logo (from Remotive/JSearch when available)
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


class UserJobDecision(Base):
    """Cross-hunt memory: every job the agent (or user) made a decision about.

    Lets the hunt remember "we already skipped this one" across sessions, and
    lets the user resurface a previously-skipped job (delete the row + the
    next hunt will reconsider it). 'applied' rows are kept as history; 'skipped'
    rows are what gate future hunts.
    """
    __tablename__ = "user_job_decisions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("user_profiles.id"), nullable=False, index=True)
    job_url = Column(String(1000), nullable=False, index=True)
    decision = Column(String(20), nullable=False)   # skipped | applied | submitted
    title = Column(String(300))
    company = Column(String(300))
    location = Column(String(300))
    match_score = Column(Float)
    reason = Column(Text)
    hunt_session_id = Column(Integer, ForeignKey("hunt_sessions.id"), nullable=True)
    decided_at = Column(DateTime(timezone=True), server_default=func.now())


class AllowlistEmail(Base):
    """Closed-beta allowlist. Emails here can complete onboarding; anyone else
    is shown a "beta is invite-only" screen. Admins add via /admin/allowlist."""
    __tablename__ = "allowlist_emails"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(300), unique=True, index=True, nullable=False)
    notes = Column(Text)              # e.g. "friend from college", "investor"
    added_by = Column(String(200))    # email or identifier of whoever added it
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Feedback(Base):
    """Free-form user feedback. The daily digest scheduler emails new rows to
    the admin once a day; otherwise queryable via GET /admin/feedback."""
    __tablename__ = "feedback"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("user_profiles.id"), nullable=True, index=True)
    email = Column(String(300))       # captured for context even if user_id is set
    category = Column(String(50))     # bug | feature | general | other
    page = Column(String(200))        # where in the app it was submitted
    message = Column(Text, nullable=False)
    delivered = Column(Boolean, default=False)  # included in a daily digest yet?
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class SiteCredential(Base):
    """Per-user, per-site login state for the hunt agent.

    Passwords are stored ENCRYPTED (Fernet) — never plaintext — and only when a
    CREDENTIALS_SECRET_KEY is configured. Session cookies are cached so later
    hunts can skip the login (and CAPTCHA) entirely. See services/crypto.py.
    """
    __tablename__ = "site_credentials"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("user_profiles.id"), nullable=False, index=True)
    site_key = Column(String(50), nullable=False)   # registry key, e.g. "linkedin"
    username = Column(String(300))
    password_encrypted = Column(Text)               # Fernet token (never plaintext)
    cookies = Column(JSON)                           # cached session cookies
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class CareerChunk(Base):
    """A semantically searchable piece of the user's career knowledge base.

    Sources: resume sections, experience bullets, the professional summary,
    pre-written application answers, and approved cover letters. Each chunk
    stores its embedding (list[float]) so we can retrieve the most relevant
    pieces for a specific job instead of stuffing/truncating the whole resume.
    """
    __tablename__ = "career_chunks"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("user_profiles.id"), nullable=False, index=True)
    source_type = Column(String(50))   # resume / experience / skills / summary / answer / cover_letter
    source_id = Column(Integer, nullable=True)  # e.g. originating resume.id or application.id
    content = Column(Text, nullable=False)
    embedding = Column(JSON)           # list[float]
    meta = Column(JSON)                # arbitrary metadata (label, question, etc.)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


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
    seen_job_urls = Column(JSON, default=list)  # URLs evaluated this session

    user = relationship("UserProfile", back_populates="hunt_sessions")

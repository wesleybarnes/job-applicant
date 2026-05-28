from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from app.config import settings
from app.database import Base, engine
from app.routers import users, resume, jobs, applications, browser, payments, hunt, admin, feedback
from app import models  # noqa — ensure models are registered before create_all

# Create all DB tables
Base.metadata.create_all(bind=engine)

# Add new columns that may not exist in older deployments
def _run_migrations():
    _text = __import__("sqlalchemy").text
    # Each ALTER is attempted independently; "already exists" failures are ignored.
    statements = [
        "ALTER TABLE hunt_sessions ADD COLUMN seen_job_urls JSON",        # v1.1
        "ALTER TABLE user_profiles ADD COLUMN goals TEXT",                # goals survey
        "ALTER TABLE user_profiles ADD COLUMN goal_summary TEXT",         # editable summary
        "ALTER TABLE jobs ADD COLUMN logo_url VARCHAR(1000)",             # company logos
        "ALTER TABLE user_profiles ADD COLUMN goal_summary_updated_at TIMESTAMP WITH TIME ZONE",  # goal summary staleness vs resume
    ]
    for stmt in statements:
        try:
            with engine.connect() as conn:
                conn.execute(_text(stmt))
                conn.commit()
        except Exception:
            pass  # column already exists / unsupported — safe to ignore

_run_migrations()

app = FastAPI(
    title=settings.app_name,
    description="Agentic job application platform powered by Claude AI",
    version="1.0.0",
)

ALLOWED_ORIGINS = [
    settings.frontend_url,
    "http://localhost:3000",
    "http://localhost:5173",
    "https://tryenvia.com",
    "https://www.tryenvia.com",
    "https://app.tryenvia.com",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(users.router, prefix="/api")
app.include_router(resume.router, prefix="/api")
app.include_router(jobs.router, prefix="/api")
app.include_router(applications.router, prefix="/api")
app.include_router(browser.router, prefix="/api")
app.include_router(payments.router, prefix="/api")
app.include_router(hunt.router, prefix="/api")
app.include_router(admin.router, prefix="/api")
app.include_router(feedback.router, prefix="/api")


@app.on_event("startup")
async def _on_startup():
    """Auto-allowlist the admin email + start the daily feedback-digest loop."""
    import asyncio
    from app.database import SessionLocal
    # 1. Make sure the admin email can always complete onboarding.
    if settings.admin_email:
        db = SessionLocal()
        try:
            email_n = settings.admin_email.lower().strip()
            exists = db.query(models.AllowlistEmail).filter(models.AllowlistEmail.email == email_n).first()
            if not exists:
                db.add(models.AllowlistEmail(email=email_n, notes="admin (auto)", added_by="startup"))
                db.commit()
        except Exception:
            db.rollback()
        finally:
            db.close()
    # 2. Spawn the daily digest scheduler as a background task.
    try:
        from app.services.feedback_digest import daily_digest_loop
        asyncio.create_task(daily_digest_loop(SessionLocal))
    except Exception:
        pass  # never block boot on a scheduler error

# Serve uploaded files
os.makedirs(settings.upload_dir, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.upload_dir), name="uploads")


@app.get("/")
def root():
    return {
        "name": settings.app_name,
        "version": "1.0.0",
        "docs": "/docs",
        "health": "ok",
    }


@app.get("/api/health")
def health():
    return {"status": "ok"}

import asyncio
import json
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.database import get_db, SessionLocal
from app import models
from app.auth import get_current_user, require_credits, deduct_credits
from app.config import CREDITS_HUNT_SESSION
from app.services.hunt_agent import (
    AutonomousHuntAgent,
    create_hunt_session,
    get_hunt_session,
    remove_hunt_session,
)

router = APIRouter(prefix="/hunt", tags=["hunt"])


class HuntStartRequest(BaseModel):
    linkedin_email: Optional[str] = None
    linkedin_password: Optional[str] = None


class ResumeRequest(BaseModel):
    instruction: Optional[str] = None

class AnswerRequest(BaseModel):
    answer: str

class CredentialsRequest(BaseModel):
    username: Optional[str] = None
    password: Optional[str] = None
    cookie_li_at: Optional[str] = None   # alt path: paste the li_at cookie value to skip 2FA
    save: bool = False        # store the password (or cookie) encrypted for future hunts
    skip: bool = False        # decline to log in to this site

class ChatRequest(BaseModel):
    message: str

class ResurfaceRequest(BaseModel):
    job_url: str

class InteractRequest(BaseModel):
    type: str                      # "click" | "type" | "key" | "scroll"
    x: Optional[float] = None     # viewport coords (0-1280)
    y: Optional[float] = None     # viewport coords (0-900)
    text: Optional[str] = None    # for "type"
    key: Optional[str] = None     # for "key" e.g. "Enter", "Backspace"
    delta_y: Optional[float] = None  # for "scroll"


@router.post("/start")
async def start_hunt(
    body: HuntStartRequest = None,
    background_tasks: BackgroundTasks = None,
    current_user: models.UserProfile = Depends(require_credits(CREDITS_HUNT_SESSION)),
    db: Session = Depends(get_db),
):
    body = body or HuntStartRequest()

    existing = db.query(models.HuntSession).filter(
        models.HuntSession.user_id == current_user.id,
        models.HuntSession.status == "running",
    ).first()
    if existing and get_hunt_session(existing.id):
        raise HTTPException(status_code=409, detail="A hunt is already running.")

    deduct_credits(current_user, CREDITS_HUNT_SESSION, db)

    resume = db.query(models.Resume).filter(
        models.Resume.user_id == current_user.id,
        models.Resume.is_active == True,
    ).order_by(models.Resume.created_at.desc()).first()

    if not resume:
        raise HTTPException(
            status_code=422,
            detail="No resume found. Please upload your resume from the Dashboard before starting a hunt.",
        )

    # Only dedup within the current session — don't block jobs from past hunts.
    # Users should be able to re-apply to jobs they've seen before in new sessions.
    seen_urls: set = set()

    hunt_db = models.HuntSession(
        user_id=current_user.id,
        status="running",
        jobs_found=0,
        jobs_applied=0,
        seen_job_urls=[],
    )
    db.add(hunt_db)
    db.commit()
    db.refresh(hunt_db)

    session = create_hunt_session(
        hunt_db.id,
        current_user.id,
        seen_urls=seen_urls,
        auto_apply=bool(current_user.auto_apply),
    )

    # Snapshot everything to plain dicts before DB session closes
    user_data = {
        "id": current_user.id,
        "full_name": current_user.full_name,
        "email": current_user.email,
        "phone": current_user.phone,
        "location": current_user.location,
        "linkedin_url": current_user.linkedin_url,
        "github_url": current_user.github_url,
        "target_roles": current_user.target_roles or [],
        "target_locations": current_user.target_locations or [],
        "target_industries": current_user.target_industries or [],
        "skills": current_user.skills or [],
        "summary": current_user.summary,
        "years_experience": current_user.years_experience,
        "education_level": current_user.education_level,
        "work_authorization": current_user.work_authorization,
        "willing_to_relocate": current_user.willing_to_relocate,
        "remote_preference": current_user.remote_preference,
        "salary_min": current_user.salary_min,
        "salary_max": current_user.salary_max,
        "custom_answers": current_user.custom_answers or {},
        "auto_apply": current_user.auto_apply,
        # LinkedIn credentials for this session only (never persisted)
        "linkedin_email": body.linkedin_email,
        "linkedin_password": body.linkedin_password,
    }
    resume_data = {
        "file_path": resume.file_path,
        "filename": resume.filename,
        "parsed_text": resume.parsed_text,
    }

    agent = AutonomousHuntAgent()

    async def run_agent():
        try:
            await agent.run(
                user=user_data,
                resume=resume_data,
                session=session,
                db_session_factory=SessionLocal,
            )
        except Exception as e:
            session.emit({"type": "error", "message": str(e)})
        finally:
            remove_hunt_session(hunt_db.id)

    background_tasks.add_task(run_agent)
    return {"hunt_id": hunt_db.id, "status": "started"}


@router.get("/stream/{hunt_id}")
async def stream_hunt_events(hunt_id: int):
    async def event_generator():
        for _ in range(50):
            session = get_hunt_session(hunt_id)
            if session:
                break
            await asyncio.sleep(0.1)
        else:
            yield f"data: {json.dumps({'type': 'error', 'message': 'No active hunt session'})}\n\n"
            return

        yield f"data: {json.dumps({'type': 'connected', 'message': 'Connected to hunt session'})}\n\n"

        while True:
            try:
                event = await asyncio.wait_for(session.events.get(), timeout=30.0)
                # Skip screenshot events from SSE — they're too large; use polling instead
                if event.get("type") == "screenshot":
                    yield f"data: {json.dumps({'type': 'screenshot', 'data': event['data'], 'cx': event.get('cx'), 'cy': event.get('cy')})}\n\n"
                else:
                    yield f"data: {json.dumps(event)}\n\n"

                if event.get("type") in ("complete", "error"):
                    await asyncio.sleep(0.3)
                    while not session.events.empty():
                        e = session.events.get_nowait()
                        yield f"data: {json.dumps(e)}\n\n"
                    break

            except asyncio.TimeoutError:
                yield f"data: {json.dumps({'type': 'ping'})}\n\n"
                if not get_hunt_session(hunt_id):
                    break

        yield "data: [DONE]\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no", "Connection": "keep-alive"},
    )


@router.post("/confirm/{hunt_id}")
async def confirm_hunt_submission(hunt_id: int):
    session = get_hunt_session(hunt_id)
    if not session:
        raise HTTPException(status_code=404, detail="No active hunt session")
    session.resolve_confirmation("confirm")
    return {"status": "confirmed"}


@router.post("/skip/{hunt_id}")
async def skip_hunt_job(hunt_id: int):
    session = get_hunt_session(hunt_id)
    if not session:
        raise HTTPException(status_code=404, detail="No active hunt session")
    session.resolve_confirmation("skip")
    return {"status": "skipped"}


@router.post("/answer/{hunt_id}")
async def answer_agent_question(hunt_id: int, body: AnswerRequest):
    session = get_hunt_session(hunt_id)
    if not session:
        raise HTTPException(status_code=404, detail="No active hunt session")
    session.answer_question(body.answer)
    return {"status": "answered"}


@router.post("/chat/{hunt_id}")
async def post_hunt_chat(hunt_id: int, body: ChatRequest):
    """Mid-hunt chat — user posts a message; the agent will pick it up at the
    next safe checkpoint (between jobs/boards/phases) and reply via SSE."""
    session = get_hunt_session(hunt_id)
    if not session:
        raise HTTPException(status_code=404, detail="No active hunt session")
    session.submit_chat(body.message)
    return {"status": "received"}


@router.post("/credentials/{hunt_id}")
async def submit_hunt_credentials(hunt_id: int, body: CredentialsRequest):
    """Frontend response to a `credentials_required` event — supply the username/password
    for the site the hunt is currently on, or skip it. Passwords are encrypted at rest
    (only when CREDENTIALS_SECRET_KEY is set and save=True)."""
    session = get_hunt_session(hunt_id)
    if not session:
        raise HTTPException(status_code=404, detail="No active hunt session")
    session.submit_credentials(body.model_dump())
    return {"status": "received"}


@router.post("/pause/{hunt_id}")
async def pause_hunt(hunt_id: int):
    session = get_hunt_session(hunt_id)
    if not session:
        raise HTTPException(status_code=404, detail="No active hunt session")
    session.pause()
    return {"status": "paused"}


@router.post("/resume/{hunt_id}")
async def resume_hunt(hunt_id: int, body: ResumeRequest = None):
    session = get_hunt_session(hunt_id)
    if not session:
        raise HTTPException(status_code=404, detail="No active hunt session")
    session.resume((body or ResumeRequest()).instruction)
    return {"status": "resumed"}


@router.post("/interact/{hunt_id}")
async def interact_with_hunt(hunt_id: int, body: InteractRequest):
    """Forward mouse/keyboard input to the paused Playwright browser."""
    session = get_hunt_session(hunt_id)
    if not session:
        raise HTTPException(status_code=404, detail="No active hunt session")
    if not session._paused:
        raise HTTPException(status_code=409, detail="Session is not paused")
    page = session.page
    if not page:
        raise HTTPException(status_code=503, detail="Browser page not ready")

    try:
        if body.type == "click" and body.x is not None and body.y is not None:
            await page.mouse.click(body.x, body.y)
            session.cursor_x = int(body.x)
            session.cursor_y = int(body.y)
        elif body.type == "type" and body.text:
            await page.keyboard.type(body.text)
        elif body.type == "key" and body.key:
            await page.keyboard.press(body.key)
        elif body.type == "scroll" and body.x is not None and body.y is not None:
            await page.mouse.wheel(0, body.delta_y or 300)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    return {"status": "ok"}


@router.post("/stop/{hunt_id}")
async def stop_hunt(hunt_id: int, db: Session = Depends(get_db)):
    session = get_hunt_session(hunt_id)
    if session:
        session.stop()
    hunt_db = db.query(models.HuntSession).filter(models.HuntSession.id == hunt_id).first()
    if hunt_db:
        hunt_db.status = "stopped"
        db.commit()
    return {"status": "stopped"}


@router.get("/sessions")
def list_hunt_sessions(
    current_user: models.UserProfile = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    sessions = db.query(models.HuntSession).filter(
        models.HuntSession.user_id == current_user.id
    ).order_by(models.HuntSession.started_at.desc()).limit(20).all()
    return [
        {
            "id": s.id,
            "status": s.status,
            "jobs_found": s.jobs_found,
            "jobs_applied": s.jobs_applied,
            "started_at": s.started_at.isoformat() if s.started_at else None,
            "stopped_at": s.stopped_at.isoformat() if s.stopped_at else None,
        }
        for s in sessions
    ]


@router.get("/sessions/{session_id}")
def get_hunt_session_detail(
    session_id: int,
    current_user: models.UserProfile = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Full detail for one past hunt: every job_decision + submitted entry,
    with title/company/match_score/url so the frontend can render the list
    and let the user save any of them to their applications."""
    s = db.query(models.HuntSession).filter(
        models.HuntSession.id == session_id,
        models.HuntSession.user_id == current_user.id,
    ).first()
    if not s:
        raise HTTPException(status_code=404, detail="Hunt session not found")
    log = s.log or []
    return {
        "id": s.id,
        "status": s.status,
        "jobs_found": s.jobs_found,
        "jobs_applied": s.jobs_applied,
        "started_at": s.started_at.isoformat() if s.started_at else None,
        "stopped_at": s.stopped_at.isoformat() if s.stopped_at else None,
        "decisions": [e for e in log if e.get("type") == "job_decision"],
        "submitted": [e for e in log if e.get("type") == "submitted"],
    }


class SaveJobRequest(BaseModel):
    url: str
    title: Optional[str] = None
    company: Optional[str] = None
    location: Optional[str] = None
    match_score: Optional[float] = None
    reason: Optional[str] = None


@router.get("/decisions")
def list_my_decisions(
    decision: Optional[str] = None,    # filter: 'skipped' | 'applied' | 'submitted'
    limit: int = 200,
    current_user: models.UserProfile = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Cross-hunt decision history for the current user."""
    q = db.query(models.UserJobDecision).filter(models.UserJobDecision.user_id == current_user.id)
    if decision:
        q = q.filter(models.UserJobDecision.decision == decision)
    rows = q.order_by(models.UserJobDecision.decided_at.desc()).limit(limit).all()
    return [{
        "id": r.id, "job_url": r.job_url, "decision": r.decision,
        "title": r.title, "company": r.company, "location": r.location,
        "match_score": r.match_score, "reason": r.reason,
        "hunt_session_id": r.hunt_session_id,
        "decided_at": r.decided_at.isoformat() if r.decided_at else None,
    } for r in rows]


@router.post("/decisions/resurface")
def resurface_decision(
    body: ResurfaceRequest,
    current_user: models.UserProfile = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Forget a previous skip on this URL — the next hunt will reconsider it.
    Deletes any 'skipped' rows for this (user, url) but leaves 'applied'/
    'submitted' rows intact (those are the user's history)."""
    deleted = db.query(models.UserJobDecision).filter(
        models.UserJobDecision.user_id == current_user.id,
        models.UserJobDecision.job_url == body.job_url,
        models.UserJobDecision.decision == "skipped",
    ).delete(synchronize_session=False)
    db.commit()
    return {"resurfaced": True, "removed": deleted}


@router.post("/sessions/{session_id}/save-job")
def save_job_from_session(
    session_id: int,
    body: SaveJobRequest,
    current_user: models.UserProfile = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Save a job the hunt looked at (from the history view) to the user's
    applications, so they can apply later. Creates the Job row if needed and
    a pending Application; idempotent if it already exists."""
    s = db.query(models.HuntSession).filter(
        models.HuntSession.id == session_id,
        models.HuntSession.user_id == current_user.id,
    ).first()
    if not s:
        raise HTTPException(status_code=404, detail="Hunt session not found")

    # Find-or-create the Job (dedup on URL)
    job = db.query(models.Job).filter(models.Job.url == body.url).first()
    if not job:
        job = models.Job(
            title=body.title or "(saved from hunt)",
            company=body.company or "",
            location=body.location,
            url=body.url,
            source="hunt",
            external_id=body.url,
            match_score=body.match_score,
            match_reasons=[body.reason] if body.reason else None,
        )
        db.add(job)
        db.flush()

    # Idempotent: don't duplicate the application
    existing = db.query(models.Application).filter(
        models.Application.user_id == current_user.id,
        models.Application.job_id == job.id,
    ).first()
    if existing:
        return {"job_id": job.id, "application_id": existing.id, "already_saved": True}

    app = models.Application(user_id=current_user.id, job_id=job.id, status="pending")
    db.add(app)
    db.commit()
    db.refresh(app)
    return {"job_id": job.id, "application_id": app.id, "already_saved": False}

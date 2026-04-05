import asyncio
import json
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from fastapi.responses import StreamingResponse
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


@router.post("/start")
async def start_hunt(
    background_tasks: BackgroundTasks,
    current_user: models.UserProfile = Depends(require_credits(CREDITS_HUNT_SESSION)),
    db: Session = Depends(get_db),
):
    """Start an autonomous job hunt. Costs 5 credits."""
    # Check if user already has a running hunt
    existing = db.query(models.HuntSession).filter(
        models.HuntSession.user_id == current_user.id,
        models.HuntSession.status == "running",
    ).first()
    if existing and get_hunt_session(existing.id):
        raise HTTPException(status_code=409, detail="A hunt is already running.")

    # Deduct credits (admins skip)
    deduct_credits(current_user, CREDITS_HUNT_SESSION, db)

    # Get latest resume — required to run the hunt
    resume = db.query(models.Resume).filter(
        models.Resume.user_id == current_user.id,
        models.Resume.is_active == True,
    ).order_by(models.Resume.created_at.desc()).first()

    if not resume:
        raise HTTPException(
            status_code=422,
            detail="No resume found. Please upload your resume from the Dashboard before starting a hunt.",
        )

    # Create DB record
    hunt_db = models.HuntSession(
        user_id=current_user.id,
        status="running",
        jobs_found=0,
        jobs_applied=0,
    )
    db.add(hunt_db)
    db.commit()
    db.refresh(hunt_db)

    # Create in-memory session
    session = create_hunt_session(hunt_db.id, current_user.id)

    # Snapshot all DB data into plain dicts NOW, before the session closes
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
    """SSE stream of hunt events."""

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
                yield f"data: {json.dumps(event)}\n\n"

                if event.get("type") in ("complete", "error"):
                    await asyncio.sleep(0.5)
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
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )


@router.post("/confirm/{hunt_id}")
async def confirm_hunt_submission(hunt_id: int):
    """User confirms — agent submits the current application."""
    session = get_hunt_session(hunt_id)
    if not session:
        raise HTTPException(status_code=404, detail="No active hunt session")
    session.resolve_confirmation("confirm")
    return {"status": "confirmed"}


@router.post("/skip/{hunt_id}")
async def skip_hunt_job(hunt_id: int):
    """User skips this job — agent moves to the next one."""
    session = get_hunt_session(hunt_id)
    if not session:
        raise HTTPException(status_code=404, detail="No active hunt session")
    session.resolve_confirmation("skip")
    return {"status": "skipped"}


@router.post("/stop/{hunt_id}")
async def stop_hunt(hunt_id: int, db: Session = Depends(get_db)):
    """User stops the entire hunt."""
    session = get_hunt_session(hunt_id)
    if session:
        session.stop()
    # Update DB regardless
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
    """List past hunt sessions for the current user."""
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

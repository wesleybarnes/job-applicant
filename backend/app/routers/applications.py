from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import Optional
import json
from app.database import get_db
from app import models, schemas
from app.agents.job_application_agent import JobApplicationAgent
from app.auth import get_current_user, require_credits, deduct_credits
from app.config import CREDITS_AI_APPLY

router = APIRouter(prefix="/applications", tags=["applications"])


@router.post("/", response_model=schemas.ApplicationResponse)
def create_application(app_in: schemas.ApplicationCreate, db: Session = Depends(get_db)):
    existing = db.query(models.Application).filter(
        models.Application.user_id == app_in.user_id,
        models.Application.job_id == app_in.job_id,
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Application already exists for this job")
    db_app = models.Application(**app_in.model_dump())
    db.add(db_app)
    db.commit()
    db.refresh(db_app)
    return db_app


@router.get("/user/{user_id}", response_model=list[schemas.ApplicationResponse])
def list_user_applications(
    user_id: int,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
):
    query = db.query(models.Application).filter(models.Application.user_id == user_id)
    if status:
        query = query.filter(models.Application.status == status)
    return query.order_by(models.Application.created_at.desc()).all()


@router.get("/{application_id}", response_model=schemas.ApplicationResponse)
def get_application(application_id: int, db: Session = Depends(get_db)):
    app = db.query(models.Application).filter(models.Application.id == application_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    return app


@router.put("/{application_id}", response_model=schemas.ApplicationResponse)
def update_application(
    application_id: int,
    update: schemas.ApplicationUpdate,
    db: Session = Depends(get_db),
):
    app = db.query(models.Application).filter(models.Application.id == application_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    for field, value in update.model_dump(exclude_unset=True).items():
        setattr(app, field, value)
    db.commit()
    db.refresh(app)
    return app


@router.post("/run-agent", response_model=schemas.AgentRunResponse)
async def run_agent(
    request: schemas.AgentRunRequest,
    current_user: models.UserProfile = Depends(require_credits(CREDITS_AI_APPLY)),
    db: Session = Depends(get_db),
):
    """Run the AI agent to process a job application. Costs 1 credit."""
    app = db.query(models.Application).filter(models.Application.id == request.application_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    user = db.query(models.UserProfile).filter(models.UserProfile.id == app.user_id).first()
    job = db.query(models.Job).filter(models.Job.id == app.job_id).first()
    resume = db.query(models.Resume).filter(
        models.Resume.user_id == app.user_id,
        models.Resume.is_active == True,
    ).first()

    if not user or not job:
        raise HTTPException(status_code=400, detail="Missing user or job data")

    app.status = "in_progress"
    db.commit()

    # Deduct credit after confirming everything is in order
    deduct_credits(current_user, CREDITS_AI_APPLY, db)

    agent = JobApplicationAgent()
    result = await agent.run(
        user=user,
        job=job,
        resume=resume,
        mode=request.mode,
    )

    app.cover_letter = result.get("cover_letter")
    app.agent_log = result.get("agent_log", [])
    app.status = result.get("status", "pending")
    if result.get("submitted"):
        from datetime import datetime, timezone
        app.submitted_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(app)

    return schemas.AgentRunResponse(
        application_id=app.id,
        status=app.status,
        cover_letter=app.cover_letter,
        match_score=result.get("match_score"),
        agent_log=app.agent_log or [],
        message=result.get("message", "Agent completed"),
    )


@router.post("/run-agent/stream/{application_id}")
async def run_agent_stream(application_id: int, db: Session = Depends(get_db)):
    """Run agent with SSE streaming for real-time updates."""
    app = db.query(models.Application).filter(models.Application.id == application_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    user = db.query(models.UserProfile).filter(models.UserProfile.id == app.user_id).first()
    job = db.query(models.Job).filter(models.Job.id == app.job_id).first()
    resume = db.query(models.Resume).filter(
        models.Resume.user_id == app.user_id,
        models.Resume.is_active == True,
    ).first()

    async def event_stream():
        agent = JobApplicationAgent()
        async for event in agent.run_stream(user=user, job=job, resume=resume):
            yield f"data: {json.dumps(event)}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")

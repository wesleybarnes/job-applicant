import asyncio
import json
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from app.database import get_db
from app import models
from app.auth import get_current_user, require_credits, deduct_credits
from app.config import CREDITS_BROWSER_APPLY
from app.services.browser_agent import (
    BrowserAutomationAgent,
    create_session,
    get_session,
    remove_session,
)

router = APIRouter(prefix="/browser", tags=["browser"])


@router.post("/start/{application_id}")
async def start_browser_session(
    application_id: int,
    background_tasks: BackgroundTasks,
    current_user: models.UserProfile = Depends(require_credits(CREDITS_BROWSER_APPLY)),
    db: Session = Depends(get_db),
):
    """Start a browser automation session. Costs 3 credits."""
    app = db.query(models.Application).filter(models.Application.id == application_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    if get_session(application_id):
        raise HTTPException(status_code=409, detail="A browser session is already running for this application")

    deduct_credits(current_user, CREDITS_BROWSER_APPLY, db)

    user = db.query(models.UserProfile).filter(models.UserProfile.id == app.user_id).first()
    job = db.query(models.Job).filter(models.Job.id == app.job_id).first()
    resume = db.query(models.Resume).filter(
        models.Resume.user_id == app.user_id,
        models.Resume.is_active == True,
    ).first()

    if not job or not job.url:
        raise HTTPException(status_code=400, detail="Job has no application URL")

    auto_apply = getattr(user, "auto_apply", False)
    session = create_session(application_id, auto_apply=auto_apply)

    # Run the browser agent in the background
    agent = BrowserAutomationAgent()

    async def run_agent():
        try:
            await agent.run(
                user=user,
                job=job,
                resume=resume,
                cover_letter=app.cover_letter or "",
                session=session,
            )
        except Exception as e:
            session.emit({"type": "error", "message": str(e)})
        finally:
            remove_session(application_id)

    background_tasks.add_task(run_agent)
    return {"status": "started", "application_id": application_id, "auto_apply": auto_apply}


@router.get("/stream/{application_id}")
async def stream_browser_events(application_id: int):
    """SSE stream of browser events (screenshots, actions, status)."""

    async def event_generator():
        # Wait up to 3s for the session to be created
        for _ in range(30):
            session = get_session(application_id)
            if session:
                break
            await asyncio.sleep(0.1)
        else:
            yield f"data: {json.dumps({'type': 'error', 'message': 'No active session found'})}\n\n"
            return

        yield f"data: {json.dumps({'type': 'connected', 'message': 'Connected to browser session'})}\n\n"

        while True:
            try:
                event = await asyncio.wait_for(session.events.get(), timeout=30.0)
                yield f"data: {json.dumps(event)}\n\n"

                # End stream on terminal events
                if event.get("type") in ("complete", "error", "cancelled", "submitted"):
                    # Drain any remaining events
                    await asyncio.sleep(0.5)
                    while not session.events.empty():
                        e = session.events.get_nowait()
                        yield f"data: {json.dumps(e)}\n\n"
                    break

            except asyncio.TimeoutError:
                # Keep-alive ping
                yield f"data: {json.dumps({'type': 'ping'})}\n\n"
                # Check if session still exists
                if not get_session(application_id):
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


@router.post("/confirm/{application_id}")
async def confirm_submission(application_id: int):
    """User confirms — agent proceeds to submit the application."""
    session = get_session(application_id)
    if not session:
        raise HTTPException(status_code=404, detail="No active browser session")
    session.resolve_confirmation(True)
    return {"status": "confirmed"}


@router.post("/cancel/{application_id}")
async def cancel_submission(application_id: int):
    """User cancels — agent stops without submitting."""
    session = get_session(application_id)
    if not session:
        raise HTTPException(status_code=404, detail="No active browser session")
    session.cancel()
    return {"status": "cancelled"}

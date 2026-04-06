from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
from app.database import get_db
from app import models, schemas
from app.auth import get_current_user
from app.services.job_scraper import search_jobs_api

router = APIRouter(prefix="/jobs", tags=["jobs"])


@router.post("/", response_model=schemas.JobResponse)
def create_job(job: schemas.JobCreate, db: Session = Depends(get_db)):
    db_job = models.Job(**job.model_dump())
    db.add(db_job)
    db.commit()
    db.refresh(db_job)
    return db_job


@router.get("/", response_model=list[schemas.JobResponse])
def list_jobs(
    skip: int = 0,
    limit: int = 50,
    source: Optional[str] = None,
    db: Session = Depends(get_db),
):
    query = db.query(models.Job)
    if source:
        query = query.filter(models.Job.source == source)
    return query.order_by(models.Job.created_at.desc()).offset(skip).limit(limit).all()


@router.get("/{job_id}", response_model=schemas.JobResponse)
def get_job(job_id: int, db: Session = Depends(get_db)):
    job = db.query(models.Job).filter(models.Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


@router.delete("/{job_id}")
def delete_job(job_id: int, db: Session = Depends(get_db)):
    job = db.query(models.Job).filter(models.Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    db.delete(job)
    db.commit()
    return {"message": "Job deleted"}


@router.post("/search", response_model=list[schemas.JobResponse])
async def search_jobs(
    search: schemas.JobSearchRequest,
    user_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    """Search for jobs via external sources and save them to the database."""
    jobs_data = await search_jobs_api(search.query, search.location, search.remote)
    saved_jobs = []
    for job_data in jobs_data:
        existing = db.query(models.Job).filter(
            models.Job.external_id == job_data.get("external_id"),
            models.Job.source == job_data.get("source"),
        ).first()
        if existing:
            saved_jobs.append(existing)
            continue
        db_job = models.Job(**job_data)
        db.add(db_job)
        db.flush()
        saved_jobs.append(db_job)
    db.commit()
    for j in saved_jobs:
        db.refresh(j)
    return saved_jobs


@router.post("/discover", response_model=list[schemas.JobResponse])
async def discover_jobs(
    current_user: models.UserProfile = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Auto-discover jobs based on user's profile (target roles + locations).
    Searches each role×location combination and saves results to DB."""
    roles = current_user.target_roles or []
    locations = current_user.target_locations or []
    if not roles:
        roles = ["Software Engineer"]
    if not locations:
        locations = [current_user.location or "Remote"]

    all_jobs = []
    seen_ids = set()

    # Search for each role in each location (max 4 combos to stay fast)
    combos = [(r, l) for r in roles[:2] for l in locations[:2]]
    for query, location in combos:
        try:
            jobs_data = await search_jobs_api(query, location, None)
        except Exception:
            continue

        for job_data in jobs_data:
            ext_id = job_data.get("external_id", "")
            source = job_data.get("source", "")
            dedup_key = f"{source}:{ext_id}"
            if dedup_key in seen_ids:
                continue
            seen_ids.add(dedup_key)

            existing = db.query(models.Job).filter(
                models.Job.external_id == ext_id,
                models.Job.source == source,
            ).first()
            if existing:
                all_jobs.append(existing)
                continue
            db_job = models.Job(**job_data)
            db.add(db_job)
            db.flush()
            all_jobs.append(db_job)

    db.commit()
    for j in all_jobs:
        db.refresh(j)
    return all_jobs

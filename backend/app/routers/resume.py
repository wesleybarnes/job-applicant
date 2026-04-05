import os
import shutil
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from app.database import get_db
from app import models, schemas
from app.config import settings
from app.services.resume_parser import parse_resume

router = APIRouter(prefix="/resume", tags=["resume"])


@router.post("/upload/{user_id}", response_model=schemas.ResumeResponse)
async def upload_resume(
    user_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    user = db.query(models.UserProfile).filter(models.UserProfile.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    allowed = {".pdf", ".docx", ".doc", ".txt"}
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in allowed:
        raise HTTPException(status_code=400, detail=f"File type {ext} not supported. Use: {allowed}")

    size = 0
    content = await file.read()
    size = len(content)
    if size > settings.max_upload_size_mb * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File too large")

    os.makedirs(settings.upload_dir, exist_ok=True)
    file_path = os.path.join(settings.upload_dir, f"user_{user_id}_{file.filename}")
    with open(file_path, "wb") as f:
        f.write(content)

    # Deactivate old resumes
    db.query(models.Resume).filter(
        models.Resume.user_id == user_id, models.Resume.is_active == True
    ).update({"is_active": False})

    parsed_text, structured_data = parse_resume(file_path, ext)

    db_resume = models.Resume(
        user_id=user_id,
        filename=file.filename,
        file_path=file_path,
        parsed_text=parsed_text,
        structured_data=structured_data,
        is_active=True,
    )
    db.add(db_resume)
    db.commit()
    db.refresh(db_resume)
    return db_resume


@router.get("/{user_id}", response_model=list[schemas.ResumeResponse])
def get_resumes(user_id: int, db: Session = Depends(get_db)):
    return db.query(models.Resume).filter(models.Resume.user_id == user_id).all()


@router.delete("/{resume_id}")
def delete_resume(resume_id: int, db: Session = Depends(get_db)):
    resume = db.query(models.Resume).filter(models.Resume.id == resume_id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    if os.path.exists(resume.file_path):
        os.remove(resume.file_path)
    db.delete(resume)
    db.commit()
    return {"message": "Resume deleted"}

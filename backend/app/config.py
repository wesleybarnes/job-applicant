from pydantic_settings import BaseSettings
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent


class Settings(BaseSettings):
    # API
    app_name: str = "Job Applicant Agent"
    debug: bool = False

    # Database
    database_url: str = f"sqlite:///{BASE_DIR}/data/job_applicant.db"

    # Anthropic
    anthropic_api_key: str = ""

    # File uploads
    upload_dir: str = str(BASE_DIR / "uploads")
    max_upload_size_mb: int = 10

    # CORS
    frontend_url: str = "http://localhost:5173"

    class Config:
        env_file = str(BASE_DIR / ".env")
        extra = "ignore"


settings = Settings()

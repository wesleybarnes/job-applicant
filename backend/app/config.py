from pydantic_settings import BaseSettings
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent


class Settings(BaseSettings):
    app_name: str = "Envia"
    debug: bool = False

    # Database
    database_url: str = f"sqlite:///{BASE_DIR}/data/job_applicant.db"

    # Anthropic
    anthropic_api_key: str = ""

    # Clerk auth
    clerk_secret_key: str = ""
    clerk_publishable_key: str = ""
    admin_email: str = ""

    # Stripe
    stripe_secret_key: str = ""
    stripe_webhook_secret: str = ""

    # File uploads
    upload_dir: str = str(BASE_DIR / "uploads")
    max_upload_size_mb: int = 10

    # CORS
    frontend_url: str = "http://localhost:5173"

    # Job search
    jsearch_api_key: str = ""

    class Config:
        env_file = str(BASE_DIR / ".env")
        extra = "ignore"


settings = Settings()

# Railway's PostgreSQL plugin exports DATABASE_URL as postgres:// but
# SQLAlchemy 1.4+ requires postgresql://  — fix it transparently.
if settings.database_url.startswith("postgres://"):
    settings.database_url = settings.database_url.replace("postgres://", "postgresql://", 1)

# Credit costs per action
CREDITS_AI_APPLY = 1        # generate cover letter + analysis
CREDITS_BROWSER_APPLY = 3   # full browser form filling + submit
CREDITS_HUNT_SESSION = 5    # full autonomous job hunt
FREE_CREDITS_ON_SIGNUP = 5  # everyone starts with 5 free credits

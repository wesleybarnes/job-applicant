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

    # Model selection per task. Sonnet 4.6 is ~5x cheaper and noticeably faster
    # than Opus for cover letters and form filling, with no quality loss on these
    # tasks. Override via env to A/B against Opus (claude-opus-4-7) if desired.
    agent_model: str = "claude-sonnet-4-6"            # cover letters + match analysis
    form_fill_model: str = "claude-sonnet-4-6"        # browser + hunt form filling
    scoring_model: str = "claude-haiku-4-5-20251001"  # hunt batch job scoring (cheapest)

    # Hunt pacing: multiplier on human-like browser delays. 1.0 = original cadence,
    # lower = faster (and less "watchable"/stealthy). Tune up toward 1.0 if a board
    # starts throwing CAPTCHAs. Inference latency (LLM round-trips) is a separate
    # lower bound set by form_fill_model.
    hunt_speed_factor: float = 0.2

    # Clerk auth
    clerk_secret_key: str = ""
    clerk_publishable_key: str = ""
    admin_email: str = ""

    # Symmetric secret used to encrypt saved site passwords at rest (any string;
    # a Fernet key is derived from it). If unset, passwords are NOT persisted —
    # only session cookies are cached. Set this in Railway to enable "save password".
    credentials_secret_key: str = ""

    # Master switch for the per-site credential popup. Now on by default — the
    # frontend renders the credentials_required event as a popup in HuntView.
    # Set to False to disable prompting (saved-credential reuse still works).
    hunt_credential_popup_enabled: bool = True

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

    # Embeddings / RAG (career knowledge base)
    # If voyage_api_key is empty, RAG transparently disables and the agent
    # falls back to the truncated resume text (no behavior change).
    embedding_provider: str = "voyage"   # voyage | none
    voyage_api_key: str = ""
    embedding_model: str = "voyage-3.5"
    rag_top_k: int = 6                    # chunks retrieved per application

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

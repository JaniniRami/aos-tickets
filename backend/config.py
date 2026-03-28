from pathlib import Path

from dotenv import load_dotenv
from pydantic_settings import BaseSettings, SettingsConfigDict

# Always load backend/.env regardless of shell cwd; override=True so this file wins
# over a stale DATABASE_URL exported in the shell (common when switching projects).
_ENV_PATH = Path(__file__).resolve().parent / ".env"
load_dotenv(_ENV_PATH, override=True)


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=_ENV_PATH,
        env_file_encoding="utf-8",
        extra="ignore",
    )

    database_url: str
    admin_username: str
    admin_password: str
    jwt_secret: str
    base_url: str = "http://localhost:5173"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24 * 7

    # Per-ticket prices in JD (snapshotted onto each row at creation)
    adult_ticket_price_jd: int = 3
    kid_ticket_price_jd: int = 12

    # IANA zone for “today” in dashboard scan counts (Jordan: Asia/Amman = GMT+3)
    event_timezone: str = "Asia/Amman"


settings = Settings()

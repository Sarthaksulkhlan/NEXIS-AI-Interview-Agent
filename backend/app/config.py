"""
Configuration settings for the AI Interview Agent backend.
"""

from pathlib import Path
from typing import List, Optional, Union
import os
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


BASE_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BASE_DIR.parent
DATA_DIR = BASE_DIR / "data"
PROMPTS_DIR = BASE_DIR / "prompts"


class Settings(BaseSettings):
    """Application configuration settings."""

    # Server settings
    APP_NAME: str = "AI Interview Agent"
    APP_VERSION: str = "1.0.0"
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    DEBUG: bool = False
    LOG_LEVEL: str = "INFO"

    @field_validator("DEBUG", mode="before")
    @classmethod
    def parse_debug_mode(cls, value):
        """Tolerate hosting environments that expose DEBUG=release/development."""
        if isinstance(value, str):
            normalized = value.strip().lower()
            if normalized in {"release", "production", "prod"}:
                return False
            if normalized in {"development", "dev"}:
                return True
        return value

    # CORS settings (supports comma-separated string or list of strings)
    CORS_ALLOWED_ORIGINS: Union[List[str], str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:8000",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:8000",
        "*",
    ]

    @field_validator("CORS_ALLOWED_ORIGINS", mode="after")
    @classmethod
    def parse_cors_origins(cls, v: Union[List[str], str]) -> List[str]:
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        return v

    # Data files
    CURRICULUM_PATH: Path = DATA_DIR / "curriculum.json"
    CANDIDATES_PATH: Path = DATA_DIR / "candidates.json"

    # Interview Constraints & Policy
    MIN_QUESTIONS_REQUIRED: int = 8
    MIN_UNIQUE_DAYS_REQUIRED: int = 4
    MAX_FOLLOWUPS_PER_DAY: int = 2
    MAX_TOTAL_QUESTIONS_LIMIT: int = 15  # Safety upper bound
    RECENT_TURNS_CONTEXT_LIMIT: int = 4

    # LLM Settings
    MOCK_LLM: bool = Field(
        default=False,
        description="Explicit test-only mode. Production requires a configured real provider.",
    )
    LLM_PROVIDER: str = "openai"  # "openai", "anthropic", "groq", "ollama", "custom"
    LLM_API_KEY: Optional[str] = None
    LLM_BASE_URL: Optional[str] = None
    LLM_MODEL: str = "gpt-4o-mini"
    LLM_TEMPERATURE: float = 0.3
    LLM_TIMEOUT_SECONDS: float = 30.0
    LLM_MAX_RETRIES: int = 2
    TRANSCRIPTION_BASE_URL: str = "https://api.openai.com/v1"
    TRANSCRIPTION_MODEL: str = "whisper-1"

    # Anthropic specific
    ANTHROPIC_API_KEY: Optional[str] = None
    ANTHROPIC_MODEL: str = "claude-3-5-sonnet-20241022"

    model_config = SettingsConfigDict(
        env_file=str(PROJECT_ROOT / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()

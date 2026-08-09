"""
FastAPI application entry point for the AI Interview Agent.
"""

from contextlib import asynccontextmanager
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .api.interview import router as interview_router
from .config import settings
from .services.curriculum_service import curriculum_service
from .services.candidate_service import candidate_service

# Configure logging
logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("interview-agent")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle event handler for application startup and shutdown."""
    logger.info("Initializing AI Interview Agent engine...")
    logger.info(f"Loaded {len(curriculum_service.curriculum_by_day)} curriculum days.")
    logger.info(f"Loaded {len(candidate_service.candidates_catalog)} catalog candidate profiles.")
    logger.info(f"Mock Mode: {settings.MOCK_LLM}")
    yield
    logger.info("Shutting down AI Interview Agent.")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Deterministic AI Interview Agent with LLM-powered natural language generation.",
    lifespan=lifespan,
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health endpoint (permitted by Technical Spec as a standard HTTP healthcheck)
@app.get("/health", summary="Health Check")
async def health_check():
    """Returns application health status."""
    provider_configured = bool(settings.LLM_API_KEY or settings.ANTHROPIC_API_KEY)
    return {
        "status": "ok" if settings.MOCK_LLM or provider_configured else "configuration_required",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "mode": "test" if settings.MOCK_LLM else "real",
        "provider": settings.LLM_PROVIDER,
        "provider_configured": provider_configured,
    }


# Register main interview router
app.include_router(interview_router)

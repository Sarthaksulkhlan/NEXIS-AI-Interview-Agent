"""
FastAPI router implementing POST /api/interview and POST /api/interview/video.
Strictly adheres to technical-spec.md while providing multimodal video response support.
"""

import logging
from typing import Any, Dict, List, Optional, Union
from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status
from pydantic import BaseModel, Field
from ..controller.interview_controller import interview_controller
from ..services.candidate_service import candidate_service
from ..services.session_manager import session_manager
from ..services.multimodal_service import multimodal_service
from ..models.interview import (
    FeedbackReport,
    InterviewResponse,
)
from ..models.multimodal import MultimodalInterviewResponse
from ..models.integrity import IntegrityEventInput, IntegrityEventResponse, IntegritySummary
from ..services.integrity_service import integrity_service

logger = logging.getLogger(__name__)
router = APIRouter()

# Max allowed video file size: 50MB
MAX_VIDEO_BYTES = 50 * 1024 * 1024


class GenericInterviewPayload(BaseModel):
    """
    Unified payload model accommodating both Start and Turn requests on POST /api/interview.
    """

    sessionId: str = Field(..., min_length=1, description="Interview session ID")
    candidate: Optional[Union[Dict[str, Any], Any]] = Field(
        default=None,
        description="Candidate profile dictionary for initializing the interview",
    )
    message: Optional[str] = Field(
        default=None,
        description="Candidate answer message for conversational turns",
    )


@router.post(
    "/api/interview",
    response_model=InterviewResponse,
    summary="Main Interview Endpoint (Text / Standard)",
    description=(
        "Handles both initialization (with candidate payload) and multi-turn conversation "
        "(with candidate response messages). Returns reply and done flag, plus structured "
        "feedback on the final response."
    ),
)
async def interview_endpoint(payload: GenericInterviewPayload) -> InterviewResponse:
    """
    Core API handler matching technical-spec.md exactly.
    - If payload contains 'candidate': starts a new interview session.
    - If payload contains 'message': processes the conversational turn.
    """
    session_id = payload.sessionId.strip()
    if not session_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Field 'sessionId' cannot be empty.",
        )

    # 1. Start Request
    if payload.candidate is not None:
        try:
            integrity_service.clear(session_id)
            response = await interview_controller.start_interview(
                session_id=session_id,
                candidate_data=payload.candidate,
            )
            return response
        except Exception as e:
            logger.error(f"Error initializing interview session '{session_id}': {e}", exc_info=True)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to start interview: {str(e)}",
            )

    # 2. Turn Request
    if payload.message is not None:
        session = session_manager.get_session(session_id)
        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Interview session '{session_id}' not found. Please initialize with 'candidate' first.",
            )

        try:
            response = await interview_controller.handle_candidate_answer(
                session_id=session_id,
                candidate_message=payload.message,
            )
            return response
        except KeyError as e:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=str(e),
            )
        except Exception as e:
            logger.error(f"Error processing turn for session '{session_id}': {e}", exc_info=True)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="An internal error occurred while processing the turn.",
            )

    # If neither 'candidate' nor 'message' is supplied
    raise HTTPException(
        status_code=422,
        detail="Payload must include either 'candidate' to start or 'message' to continue.",
    )


@router.post(
    "/api/interview/video",
    response_model=MultimodalInterviewResponse,
    summary="Multimodal Video Turn Endpoint",
    description="Processes candidate video and audio recordings, transcribing speech, evaluating technical responses, and updating controller state.",
)
async def interview_video_endpoint(
    sessionId: str = Form(..., description="Active interview session ID"),
    questionId: Optional[int] = Form(None, description="Optional question number"),
    transcript: Optional[str] = Form(None, description="Optional manual/offline transcript fallback"),
    video: Optional[UploadFile] = File(None, description="Candidate recorded video/audio blob"),
) -> MultimodalInterviewResponse:
    """
    Multimodal video response endpoint.
    Extracts audio, transcribes speech, evaluates video presentation signals,
    and updates the deterministic controller state.
    """
    clean_session_id = sessionId.strip()
    if not clean_session_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Field 'sessionId' cannot be empty.",
        )

    session = session_manager.get_session(clean_session_id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Interview session '{clean_session_id}' not found. Start an interview first.",
        )

    video_bytes = b""
    filename = "response.webm"

    if video is not None:
        content_type = (video.content_type or "").lower()
        if not content_type.startswith("video/webm") and content_type not in {"audio/webm", "application/octet-stream"}:
            raise HTTPException(
                status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                detail="Recording must be a WebM video/audio upload.",
            )
        video_bytes = await video.read()
        filename = video.filename or "response.webm"

        # Check maximum allowed upload size
        if len(video_bytes) > MAX_VIDEO_BYTES:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"Video file exceeds maximum allowed limit of {MAX_VIDEO_BYTES // (1024 * 1024)}MB.",
            )
        if video_bytes and not video_bytes.startswith(b"\x1a\x45\xdf\xa3"):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Uploaded recording is not a valid WebM container.",
            )

    # If both video and transcript are empty
    if not video_bytes and (not transcript or not transcript.strip()):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Must provide either a recorded video/audio file or a transcript.",
        )

    if questionId is not None and questionId != session.questions_asked:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Recording questionId {questionId} does not match current question {session.questions_asked}.",
        )

    try:
        response = await multimodal_service.process_video_turn(
            session_id=clean_session_id,
            video_bytes=video_bytes,
            filename=filename,
            fallback_transcript=transcript,
            question_id=questionId,
        )
        return response
    except KeyError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
    except Exception as e:
        logger.error(f"Multimodal video processing error for session '{clean_session_id}': {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process multimodal video response: {str(e)}",
        )


@router.get("/api/candidates", summary="Get Candidate Catalog")
async def get_candidates_catalog() -> Dict[str, Any]:
    """Returns authoritative candidate profiles for interview selection."""
    profiles = {
        profile.member.id: profile
        for profile in candidate_service.candidates_catalog.values()
    }
    return {
        "count": len(profiles),
        "candidates": [profile.model_dump() for profile in profiles.values()],
    }


@router.get("/api/session/{session_id}", summary="Get Interview Session State (Debug / UI)")
async def get_session_state(session_id: str) -> Dict[str, Any]:
    """Returns the structured session state for frontend inspection and testing."""
    session = session_manager.get_session(session_id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session '{session_id}' not found.",
        )
    return session.model_dump()


@router.post("/api/interview/{session_id}/integrity/events", response_model=IntegrityEventResponse)
async def record_integrity_event(session_id: str, payload: IntegrityEventInput) -> IntegrityEventResponse:
    """Accept a controlled raw signal; severity and risk are always computed server-side."""
    if not session_manager.get_session(session_id):
        raise HTTPException(status_code=404, detail=f"Interview session '{session_id}' not found.")
    event = integrity_service.record(session_id, payload)
    return IntegrityEventResponse(event=event, summary=integrity_service.summary(session_id))


@router.get("/api/interview/{session_id}/integrity", response_model=IntegritySummary)
async def get_integrity_summary(session_id: str) -> IntegritySummary:
    if not session_manager.get_session(session_id):
        raise HTTPException(status_code=404, detail=f"Interview session '{session_id}' not found.")
    return integrity_service.summary(session_id)

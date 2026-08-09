"""
Multimodal orchestration service: coordinates video frame analysis, speech transcription,
and technical curriculum evaluation, then routes to the deterministic Interview Controller.
"""

import logging
from typing import Optional
from ..controller.interview_controller import interview_controller
from ..models.multimodal import (
    MultimodalInterviewResponse,
    MultimodalResponseEvaluation,
)
from ..services.curriculum_service import curriculum_service
from ..services.session_manager import session_manager
from ..services.speech_service import speech_service
from ..services.vision_service import vision_service
from ..llm.answer_evaluator import answer_evaluator
from ..models.integrity import IntegrityEventInput, IntegrityEventType
from ..services.integrity_service import integrity_service

logger = logging.getLogger(__name__)


class MultimodalService:
    """Orchestrates video analysis, speech transcription, and technical assessment."""

    async def process_video_turn(
        self,
        session_id: str,
        video_bytes: bytes,
        filename: str = "recording.webm",
        fallback_transcript: Optional[str] = None,
        question_id: Optional[int] = None,
    ) -> MultimodalInterviewResponse:
        """
        Complete multimodal pipeline:
        1. Transcribe speech and compute audio metrics
        2. Analyze video keyframes for observable presentation signals
        3. Evaluate technical content of transcript against ground-truth curriculum objectives
        4. Pass evaluated turn to deterministic InterviewController
        5. Return combined MultimodalInterviewResponse
        """
        session = session_manager.get_session(session_id)
        if not session:
            raise KeyError(f"No active interview session found with ID '{session_id}'")

        current_day_num = session.current_day or session.days_asked[-1]
        curriculum_day = curriculum_service.get_day(current_day_num)
        last_question = session.question_log[-1] if session.question_log else None
        last_question_text = last_question.text if last_question else curriculum_day.title

        # Step 1: Transcribe audio track
        transcript, audio_analysis = await speech_service.transcribe_and_analyze(
            audio_bytes=video_bytes,
            filename=filename,
            fallback_text=fallback_transcript,
        )

        # Step 2: Extract observable presentation properties from video stream
        video_analysis = vision_service.analyze_video(
            video_bytes=video_bytes,
            filename=filename,
        )
        if video_analysis.camera_available and not video_analysis.candidate_visible:
            integrity_service.record(session_id, IntegrityEventInput(
                event_type=IntegrityEventType.CANDIDATE_NOT_VISIBLE,
                duration_seconds=video_analysis.duration_seconds,
                metadata={"question_id": question_id},
            ))

        # Step 3: Grade technical response against ground-truth curriculum objectives
        technical_eval = await answer_evaluator.evaluate_answer(
            curriculum_day=curriculum_day,
            question_text=last_question_text,
            candidate_answer=transcript,
            target_objectives=last_question.target_objectives if last_question else None,
            interview_context={
                "candidate": session.candidate_model.model_dump(),
                "phase": session.phase.value,
                "question_number": session.questions_asked,
                "days_asked": session.days_asked,
                "previous_questions": [item.model_dump() for item in session.question_log[:-1]],
                "previous_answers": [item.model_dump() for item in session.answer_log],
            },
        )

        # Build communication feedback note
        comm_feedback = (
            f"Verbal delivery was clear ({audio_analysis.words_count} words over "
            f"{audio_analysis.duration_seconds}s). {video_analysis.presentation_notes or ''}"
        )

        multimodal_eval = MultimodalResponseEvaluation(
            transcript=transcript,
            technical_evaluation=technical_eval,
            audio_analysis=audio_analysis,
            video_analysis=video_analysis,
            communication_feedback=comm_feedback,
        )
        session.multimodal_log.append({
            "question_id": question_id or session.questions_asked,
            **multimodal_eval.model_dump(),
        })

        # Step 4: The deterministic Interview Controller executes the decision loop
        turn_response = await interview_controller.handle_candidate_answer(
            session_id=session_id,
            candidate_message=transcript,
            precomputed_evaluation=technical_eval,
        )

        logger.info(
            f"[MULTIMODAL] Session: {session_id} | Video Duration: {video_analysis.duration_seconds}s | "
            f"Speech Detected: {audio_analysis.speech_detected} | Tech Pattern: {technical_eval.pattern.value}"
        )

        return MultimodalInterviewResponse(
            reply=turn_response.reply,
            done=turn_response.done,
            multimodal_analysis=multimodal_eval,
            feedback=turn_response.feedback,
        )


multimodal_service = MultimodalService()

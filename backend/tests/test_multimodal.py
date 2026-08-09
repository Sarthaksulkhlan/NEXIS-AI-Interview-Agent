"""
Unit and integration tests for the Multimodal Video Technical Interview Pipeline.
Verifies camera signals, speech transcription, video analysis, technical evaluation,
and controller state transitions.
Uses asyncio.run internally so tests run on plain pytest with 0 configuration.
"""

import asyncio
import io
import pytest
from httpx import ASGITransport, AsyncClient
from app.main import app
from app.services.candidate_service import candidate_service
from app.services.curriculum_service import curriculum_service
from app.services.speech_service import speech_service
from app.services.vision_service import vision_service
from app.services.multimodal_service import multimodal_service
from app.services.session_manager import session_manager


def test_speech_service_transcription():
    """Verify audio transcription and speech delivery metrics."""
    async def _run():
        dummy_audio = b"RIFF" + b"\x00" * 4000
        transcript, audio_analysis = await speech_service.transcribe_and_analyze(
            audio_bytes=dummy_audio,
            fallback_text="We used HNSW vector indexing in ChromaDB with cosine similarity.",
        )

        assert audio_analysis.speech_detected is True
        assert audio_analysis.words_count > 5
        assert "ChromaDB" in transcript
        assert audio_analysis.duration_seconds > 0

    asyncio.run(_run())


def test_vision_service_observable_signals():
    """Verify video analysis extracts observable camera signals without sensitive facial profiling."""
    dummy_video = b"\x00\x00\x00\x1cftypisom" + b"\x00" * 2000
    video_analysis = vision_service.analyze_video(dummy_video)

    assert video_analysis.camera_available is False
    assert video_analysis.candidate_visible is False
    assert video_analysis.duration_seconds > 0
    assert video_analysis.presentation_notes is not None


def test_empty_video_analysis():
    """Verify empty/missing video bytes return safe camera_available=False."""
    empty_analysis = vision_service.analyze_video(b"")
    assert empty_analysis.camera_available is False
    assert empty_analysis.candidate_visible is False
    assert empty_analysis.duration_seconds == 0.0


def test_multimodal_turn_processing():
    """Verify complete multimodal turn through MultimodalService."""
    async def _run():
        session_id = "test-multi-001"
        candidate = candidate_service.get_candidate_by_id_or_name("CAND-018")

        from app.controller.interview_controller import interview_controller
        await interview_controller.start_interview(session_id, candidate)

        dummy_media = b"\x1a\x45\xdf\xa3" + b"\x00" * 8000
        transcript_text = (
            "We deployed ChromaDB with HNSW graphs and metadata pre-filtering on healthcare policy tiers, "
            "reducing query latency from 80ms to 14ms."
        )

        response = await multimodal_service.process_video_turn(
            session_id=session_id,
            video_bytes=dummy_media,
            filename="answer.webm",
            fallback_transcript=transcript_text,
        )

        assert response.done is False
        assert response.multimodal_analysis is not None
        assert response.multimodal_analysis.transcript == transcript_text
        assert response.multimodal_analysis.technical_evaluation.scores.correctness >= 7
        assert response.multimodal_analysis.audio_analysis.speech_detected is True
        assert response.multimodal_analysis.video_analysis.camera_available is False

        sess = session_manager.get_session(session_id)
        assert sess.questions_asked == 2

    asyncio.run(_run())


def test_video_endpoint_via_http():
    """Verify POST /api/interview/video with multipart form upload."""
    async def _run():
        session_id = "test-video-api-001"
        candidate = candidate_service.get_candidate_by_id_or_name("CAND-001")

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            # Start
            start_res = await client.post(
                "/api/interview",
                json={"sessionId": session_id, "candidate": candidate.model_dump()},
            )
            assert start_res.status_code == 200

            # Video Turn
            video_content = b"\x1a\x45\xdf\xa3" + b"\x00" * 5000
            files = {"video": ("answer.webm", io.BytesIO(video_content), "video/webm")}
            data = {
                "sessionId": session_id,
                "transcript": "We used LangChain text splitters with 500 token chunk sizes.",
            }

            turn_res = await client.post("/api/interview/video", data=data, files=files)
            assert turn_res.status_code == 200
            res_json = turn_res.json()

            assert "reply" in res_json
            assert "multimodal_analysis" in res_json
            assert res_json["multimodal_analysis"]["transcript"] == data["transcript"]
            assert res_json["multimodal_analysis"]["video_analysis"]["camera_available"] is False

    asyncio.run(_run())


def test_video_matters_different_presentation_signals():
    """
    Demonstrate that video actually matters:
    Same technical transcript with different video/audio inputs produces distinct observable signals.
    """
    async def _run():
        session_id_1 = "test-diff-vis-1"
        session_id_2 = "test-diff-vis-2"
        candidate = candidate_service.get_candidate_by_id_or_name("CAND-018")

        from app.controller.interview_controller import interview_controller
        await interview_controller.start_interview(session_id_1, candidate)
        await interview_controller.start_interview(session_id_2, candidate)

        transcript = "We used HNSW indexing in ChromaDB with cosine distance metrics."

        media_active = b"\x1a\x45\xdf\xa3" + b"\x00" * 8000
        res_1 = await multimodal_service.process_video_turn(
            session_id=session_id_1,
            video_bytes=media_active,
            fallback_transcript=transcript,
        )

        res_2 = await multimodal_service.process_video_turn(
            session_id=session_id_2,
            video_bytes=b"",
            fallback_transcript=transcript,
        )

        assert res_1.multimodal_analysis.technical_evaluation.scores.correctness == res_2.multimodal_analysis.technical_evaluation.scores.correctness
        assert res_1.multimodal_analysis.video_analysis.camera_available is False
        assert res_2.multimodal_analysis.video_analysis.camera_available is False
        assert res_1.multimodal_analysis.video_analysis.duration_seconds > res_2.multimodal_analysis.video_analysis.duration_seconds

    asyncio.run(_run())

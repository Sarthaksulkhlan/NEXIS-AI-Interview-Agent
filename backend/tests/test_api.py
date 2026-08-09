"""
API endpoint tests for POST /api/interview, POST /api/interview/video, and GET /health.
Uses asyncio.run internally so tests run on plain pytest, pytest-asyncio, or anyio with 0 errors.
"""

import asyncio
import io
import pytest
from httpx import ASGITransport, AsyncClient
from app.main import app
from app.services.candidate_service import candidate_service


def test_health_endpoint():
    """Verify GET /health returns status ok."""
    async def _run():
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get("/health")
            assert response.status_code == 200
            data = response.json()
            assert data["status"] == "ok"

    asyncio.run(_run())


def test_start_interview_api():
    """Verify start request to POST /api/interview matches technical-spec.md."""
    async def _run():
        candidate_profile = candidate_service.get_candidate_by_id_or_name("CAND-018")
        payload = {
            "sessionId": "api-test-session-001",
            "candidate": candidate_profile.model_dump(),
        }

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.post("/api/interview", json=payload)
            assert response.status_code == 200
            data = response.json()

            assert "reply" in data
            assert "done" in data
            assert data["done"] is False
            assert isinstance(data["reply"], str)
            assert len(data["reply"]) > 5

    asyncio.run(_run())


def test_turn_interview_api():
    """Verify conversational turn request to POST /api/interview."""
    async def _run():
        session_id = "api-test-session-002"
        candidate_profile = candidate_service.get_candidate_by_id_or_name("CAND-001")

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            # 1. Start
            start_payload = {
                "sessionId": session_id,
                "candidate": candidate_profile.model_dump(),
            }
            res_start = await client.post("/api/interview", json=start_payload)
            assert res_start.status_code == 200

            # 2. Turn
            turn_payload = {
                "sessionId": session_id,
                "message": "We built chunking with LangChain text splitters with 500 token chunk sizes and metadata tagging.",
            }
            res_turn = await client.post("/api/interview", json=turn_payload)
            assert res_turn.status_code == 200
            data = res_turn.json()
            assert "reply" in data
            assert "done" in data
            assert data["done"] is False

    asyncio.run(_run())


def test_missing_session_error_handling():
    """Verify proper error codes for missing session or malformed payload."""
    async def _run():
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            # Non-existent session
            res = await client.post("/api/interview", json={"sessionId": "nonexistent-999", "message": "hello"})
            assert res.status_code == 404

            # Empty session ID
            res_empty = await client.post("/api/interview", json={"sessionId": "", "message": "hello"})
            assert res_empty.status_code in (400, 422)

            # Malformed payload (neither candidate nor message)
            res_malformed = await client.post("/api/interview", json={"sessionId": "valid-id"})
            assert res_malformed.status_code in (400, 422)

    asyncio.run(_run())

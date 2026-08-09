"""Phase 6B integrity policy, API security, and false-positive tests."""

import asyncio
from datetime import datetime, timezone

from httpx import ASGITransport, AsyncClient

from app.main import app
from app.models.integrity import IntegrityEventInput, IntegrityEventType, RiskLevel
from app.services.candidate_service import candidate_service
from app.services.integrity_service import IntegrityRiskAggregator, IntegrityService


def _input(kind, duration=None):
    return IntegrityEventInput(
        event_type=kind, timestamp=datetime.now(timezone.utc), duration_seconds=duration
    )


def test_one_brief_interruption_is_not_high_risk():
    service = IntegrityService()
    service.record("brief", _input(IntegrityEventType.TAB_HIDDEN, 2))
    summary = service.summary("brief")
    assert summary.risk_level == RiskLevel.LOW
    assert summary.risk_score == 6
    assert summary.review_required is False


def test_technical_camera_interruption_is_not_automatic_cheating():
    service = IntegrityService()
    service.record("camera", _input(IntegrityEventType.CAMERA_INTERRUPTED, 10))
    service.record("camera", _input(IntegrityEventType.CAMERA_RECONNECTED))
    summary = service.summary("camera")
    assert summary.risk_level == RiskLevel.LOW
    assert summary.review_required is False


def test_frequency_and_duration_raise_risk_deterministically():
    service = IntegrityService()
    for _ in range(3):
        service.record("repeat", _input(IntegrityEventType.TAB_HIDDEN, 30))
    service.record("repeat", _input(IntegrityEventType.CAMERA_DISABLED, 30))
    summary = service.summary("repeat")
    assert summary.risk_level == RiskLevel.HIGH
    assert summary.risk_score == 66
    assert summary.review_required is True


def test_client_cannot_supply_score_severity_or_source():
    async def _run():
        session_id = "integrity-api-security"
        candidate = candidate_service.get_candidate_by_id_or_name("CAND-018")
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            await client.post("/api/interview", json={"sessionId": session_id, "candidate": candidate.model_dump()})
            response = await client.post(
                f"/api/interview/{session_id}/integrity/events",
                json={
                    "event_type": "WINDOW_BLUR",
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "severity": "high", "source": "vision", "risk_score": 100,
                    "metadata": {"question_id": 1, "secret": "discard-me"},
                },
            )
            assert response.status_code == 200
            body = response.json()
            assert body["event"]["severity"] == "low"
            assert body["event"]["source"] == "browser"
            assert body["event"]["metadata"] == {"question_id": 1}
            assert body["summary"]["risk_score"] == 2

    asyncio.run(_run())


def test_invalid_session_and_unknown_event_rejected():
    async def _run():
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            missing = await client.post(
                "/api/interview/missing/integrity/events",
                json={"event_type": "TAB_HIDDEN"},
            )
            unknown = await client.post(
                "/api/interview/missing/integrity/events",
                json={"event_type": "CANDIDATE_CHEATED"},
            )
            assert missing.status_code == 404
            assert unknown.status_code == 422

    asyncio.run(_run())

"""
Unit tests for in-memory session manager and multi-session isolation.
"""

from app.models.interview import DifficultyLevel
from app.services.candidate_service import candidate_service
from app.services.session_manager import SessionManager


def test_session_creation_and_retrieval():
    """Verify session creation and lookup."""
    mgr = SessionManager()
    profile = candidate_service.get_candidate_by_id_or_name("CAND-018")
    model = candidate_service.build_candidate_model(profile)

    session = mgr.create_session("sess-1", model, DifficultyLevel.INTERMEDIATE)
    assert session.sessionId == "sess-1"
    assert session.candidate_model.name == "Diane Foster"

    retrieved = mgr.get_session("sess-1")
    assert retrieved is not None
    assert retrieved.sessionId == "sess-1"


def test_multiple_sessions_remain_independent():
    """Verify that session A and session B do not overwrite each other."""
    mgr = SessionManager()
    cand1 = candidate_service.get_candidate_by_id_or_name("CAND-018")
    cand2 = candidate_service.get_candidate_by_id_or_name("CAND-010")

    model1 = candidate_service.build_candidate_model(cand1)
    model2 = candidate_service.build_candidate_model(cand2)

    sess_a = mgr.create_session("sess-A", model1, DifficultyLevel.ADVANCED)
    sess_b = mgr.create_session("sess-B", model2, DifficultyLevel.BEGINNER)

    # Mutate Session A
    sess_a.questions_asked = 5
    sess_a.days_asked = [7, 8]
    mgr.update_session(sess_a)

    # Session B should remain pristine
    fetched_b = mgr.get_session("sess-B")
    assert fetched_b.questions_asked == 0
    assert fetched_b.days_asked == []
    assert fetched_b.candidate_model.candidate_id == "CAND-010"

    fetched_a = mgr.get_session("sess-A")
    assert fetched_a.questions_asked == 5
    assert fetched_a.days_asked == [7, 8]
    assert fetched_a.candidate_model.candidate_id == "CAND-018"


def test_unknown_session_returns_none():
    """Verify non-existent session ID handling."""
    mgr = SessionManager()
    assert mgr.get_session("unknown-id-123") is None
    assert mgr.session_exists("unknown-id-123") is False


def test_session_deletion():
    """Verify session deletion."""
    mgr = SessionManager()
    cand = candidate_service.get_candidate_by_id_or_name("CAND-001")
    model = candidate_service.build_candidate_model(cand)

    mgr.create_session("sess-del", model)
    assert mgr.session_exists("sess-del") is True

    deleted = mgr.delete_session("sess-del")
    assert deleted is True
    assert mgr.session_exists("sess-del") is False
    assert mgr.get_session("sess-del") is None

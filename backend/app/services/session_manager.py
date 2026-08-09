"""
Session manager service: manages in-memory interview sessions keyed by sessionId.
"""

import logging
from typing import Dict, Optional
from ..models.candidate import CandidateModel
from ..models.interview import DifficultyLevel, InterviewPhase, InterviewSession

logger = logging.getLogger(__name__)


class SessionManager:
    """In-memory store for active interview sessions."""

    def __init__(self):
        self._sessions: Dict[str, InterviewSession] = {}

    def create_session(
        self,
        session_id: str,
        candidate_model: CandidateModel,
        initial_difficulty: DifficultyLevel = DifficultyLevel.INTERMEDIATE,
    ) -> InterviewSession:
        """
        Creates and stores a new interview session.
        """
        session = InterviewSession(
            sessionId=session_id,
            candidate_model=candidate_model,
            phase=InterviewPhase.INTRO,
            coverage={},
            current_day=None,
            difficulty=initial_difficulty,
            days_asked=[],
            questions_asked=0,
            question_log=[],
            answer_log=[],
            recent_turns=[],
            feedback=None,
            is_complete=False,
        )
        self._sessions[session_id] = session
        logger.info(f"Initialized new interview session: {session_id} for {candidate_model.name}")
        return session

    def get_session(self, session_id: str) -> Optional[InterviewSession]:
        """Retrieves an active session by session ID."""
        return self._sessions.get(session_id)

    def session_exists(self, session_id: str) -> bool:
        """Checks if a session ID is already registered."""
        return session_id in self._sessions

    def update_session(self, session: InterviewSession) -> None:
        """Updates in-memory session state."""
        self._sessions[session.sessionId] = session

    def delete_session(self, session_id: str) -> bool:
        """Deletes a session if it exists."""
        if session_id in self._sessions:
            del self._sessions[session_id]
            logger.info(f"Deleted session: {session_id}")
            return True
        return False

    def get_all_session_ids(self) -> list[str]:
        """Returns list of active session IDs."""
        return list(self._sessions.keys())

    def clear_all(self) -> None:
        """Clears all sessions (useful for test resets)."""
        self._sessions.clear()


session_manager = SessionManager()

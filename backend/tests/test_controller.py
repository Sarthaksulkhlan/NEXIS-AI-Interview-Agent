"""
Unit tests for the deterministic Interview Controller state machine.
Uses asyncio.run internally so tests run on plain pytest with 0 configuration.
"""

import asyncio
import pytest
from app.controller.interview_controller import interview_controller
from app.models.evaluation import AnswerEvaluation, EvaluationPattern, EvaluationScores
from app.models.interview import (
    ActionType,
    DifficultyLevel,
    InterviewPhase,
    InterviewSession,
    QuestionType,
)
from app.services.candidate_service import candidate_service
from app.services.curriculum_service import curriculum_service
from app.services.session_manager import session_manager


def test_1_strong_candidate_difficulty_increases():
    """Test 1: Strong answer should escalate difficulty (e.g. intermediate -> advanced)."""
    async def _run():
        session_id = "test-strong-001"
        candidate = candidate_service.get_candidate_by_id_or_name("CAND-018")
        await interview_controller.start_interview(session_id, candidate)

        session = session_manager.get_session(session_id)
        session.difficulty = DifficultyLevel.INTERMEDIATE

        strong_ans = (
            "We used HNSW indexing with cosine similarity in ChromaDB. For high-volume queries, "
            "we implemented metadata pre-filtering on plan IDs to avoid scanning irrelevant clusters. "
            "The trade-off was a slight increase in index build latency, but query p99 latency dropped from 85ms to 12ms."
        )

        await interview_controller.handle_candidate_answer(session_id, strong_ans)

        updated_session = session_manager.get_session(session_id)
        assert updated_session.difficulty in (DifficultyLevel.ADVANCED, DifficultyLevel.EXPERT)
        assert updated_session.questions_asked == 2

    asyncio.run(_run())


def test_2_weak_candidate_difficulty_decreases_diagnostic():
    """Test 2: Weak answer decreases difficulty and triggers diagnostic follow-up."""
    async def _run():
        session_id = "test-weak-001"
        candidate = candidate_service.get_candidate_by_id_or_name("CAND-010")
        await interview_controller.start_interview(session_id, candidate)

        session = session_manager.get_session(session_id)
        session.difficulty = DifficultyLevel.ADVANCED

        weak_ans = "I am not familiar with vector indexing, I don't know how it works under the hood."
        await interview_controller.handle_candidate_answer(session_id, weak_ans)

        updated_session = session_manager.get_session(session_id)
        assert updated_session.difficulty in (DifficultyLevel.INTERMEDIATE, DifficultyLevel.BEGINNER)
        assert updated_session.questions_asked == 2

    asyncio.run(_run())


def test_3_partial_answer_targeted_followup():
    """Test 3: Partial answer triggers targeted clarification/follow-up on same topic."""
    async def _run():
        session_id = "test-partial-001"
        candidate = candidate_service.get_candidate_by_id_or_name("CAND-001")
        await interview_controller.start_interview(session_id, candidate)

        session = session_manager.get_session(session_id)
        initial_day = session.current_day

        partial_ans = "We used LangChain text splitters with 500 token chunks to process documents."
        await interview_controller.handle_candidate_answer(session_id, partial_ans)

        updated_session = session_manager.get_session(session_id)
        assert updated_session.current_day == initial_day
        assert updated_session.question_log[-1].is_followup is True

    asyncio.run(_run())


def test_4_vague_answer_clarification():
    """Test 4: Vague/hand-wavy answer triggers clarification follow-up."""
    async def _run():
        session_id = "test-vague-001"
        candidate = candidate_service.get_candidate_by_id_or_name("CAND-001")
        await interview_controller.start_interview(session_id, candidate)

        vague_ans = "We used standard best practices to make sure everything was scalable and fast."
        await interview_controller.handle_candidate_answer(session_id, vague_ans)

        updated_session = session_manager.get_session(session_id)
        assert updated_session.questions_asked == 2

    asyncio.run(_run())


def test_5_skipped_topic_never_selected():
    """Test 5: Explicitly skipped topics are NEVER selected for questioning."""
    candidate = candidate_service.get_candidate_by_id_or_name("CAND-011")  # Mia Alvarez
    model = candidate_service.build_candidate_model(candidate)

    skipped = [7, 8, 12, 16, 22]
    for s in skipped:
        assert s in model.skipped_days
        assert s not in model.eligible_days

    session = InterviewSession(
        sessionId="test-skip-001",
        candidate_model=model,
        difficulty=DifficultyLevel.BEGINNER,
    )

    for _ in range(10):
        next_day = interview_controller.select_next_day(session)
        assert next_day not in skipped, f"Selected skipped day {next_day}!"
        session.days_asked.append(next_day)


def test_6_eight_questions_three_days_continues():
    """Test 6: 8 questions + 3 days -> CANNOT end (must reach 4 unique days)."""
    candidate = candidate_service.get_candidate_by_id_or_name("CAND-001")
    model = candidate_service.build_candidate_model(candidate)

    session = InterviewSession(
        sessionId="test-8q-3d",
        candidate_model=model,
        questions_asked=8,
        days_asked=[7, 7, 7, 8, 8, 8, 10, 10],  # 8 questions, 3 unique days
    )

    dummy_eval = AnswerEvaluation(
        addressed_objectives=[0],
        scores=EvaluationScores(correctness=8, depth=8, reasoning=8, tradeoffs=7, completeness=8),
        pattern=EvaluationPattern.STRONG,
    )

    assert interview_controller.has_minimum_questions(session) is True
    assert interview_controller.has_minimum_days(session) is False
    assert interview_controller.minimum_requirements_met(session) is False
    assert interview_controller.should_end_interview(session, dummy_eval) is False


def test_7_eight_questions_four_days_eligible_to_end():
    """Test 7: 8 questions + 4 days -> Eligible to end."""
    candidate = candidate_service.get_candidate_by_id_or_name("CAND-001")
    model = candidate_service.build_candidate_model(candidate)

    session = InterviewSession(
        sessionId="test-8q-4d",
        candidate_model=model,
        questions_asked=8,
        days_asked=[7, 8, 10, 12, 7, 8, 10, 12],  # 8 questions, 4 unique days
    )

    dummy_eval = AnswerEvaluation(
        addressed_objectives=[0],
        scores=EvaluationScores(correctness=8, depth=8, reasoning=8, tradeoffs=7, completeness=8),
        pattern=EvaluationPattern.STRONG,
    )

    assert interview_controller.has_minimum_questions(session) is True
    assert interview_controller.has_minimum_days(session) is True
    assert interview_controller.minimum_requirements_met(session) is True
    assert interview_controller.should_end_interview(session, dummy_eval) is True


def test_8_seven_questions_four_days_continues():
    """Test 8: 7 questions + 4 days -> CANNOT end (must reach 8 questions)."""
    candidate = candidate_service.get_candidate_by_id_or_name("CAND-001")
    model = candidate_service.build_candidate_model(candidate)

    session = InterviewSession(
        sessionId="test-7q-4d",
        candidate_model=model,
        questions_asked=7,
        days_asked=[7, 8, 10, 12, 7, 8, 10],  # 7 questions, 4 unique days
    )

    dummy_eval = AnswerEvaluation(
        addressed_objectives=[0],
        scores=EvaluationScores(correctness=8, depth=8, reasoning=8, tradeoffs=7, completeness=8),
        pattern=EvaluationPattern.STRONG,
    )

    assert interview_controller.has_minimum_questions(session) is False
    assert interview_controller.has_minimum_days(session) is True
    assert interview_controller.minimum_requirements_met(session) is False
    assert interview_controller.should_end_interview(session, dummy_eval) is False


def test_9_question_repetition_prevention():
    """Test 9: Repetition check prevents asking the exact same question twice."""
    from app.models.interview import QuestionLogItem
    day_8 = curriculum_service.get_day(8)

    q_log = [
        QuestionLogItem(
            id=1,
            day=8,
            topic=day_8.title,
            type=day_8.type,
            difficulty=DifficultyLevel.INTERMEDIATE,
            text="What are vector databases and how do they work?",
            question_type=QuestionType.CONCEPTUAL,
        )
    ]

    is_rep = interview_controller._is_question_repeated(
        q_log, "What are vector databases and how do they work?"
    )
    assert is_rep is True

    alt_q = interview_controller._get_alternative_question(
        day_8, DifficultyLevel.INTERMEDIATE, QuestionType.CONCEPTUAL
    )
    assert len(alt_q) > 10
    assert alt_q != q_log[0].text


def test_10_multiple_sessions_remain_independent():
    """Test 10: Candidate A session and Candidate B session maintain independent state."""
    cand_a = candidate_service.get_candidate_by_id_or_name("CAND-018")
    cand_b = candidate_service.get_candidate_by_id_or_name("CAND-010")

    model_a = candidate_service.build_candidate_model(cand_a)
    model_b = candidate_service.build_candidate_model(cand_b)

    sess_a = session_manager.create_session("session-A", model_a, DifficultyLevel.ADVANCED)
    sess_b = session_manager.create_session("session-B", model_b, DifficultyLevel.BEGINNER)

    sess_a.questions_asked = 6
    sess_a.days_asked = [7, 8, 10]
    session_manager.update_session(sess_a)

    re_b = session_manager.get_session("session-B")
    assert re_b.questions_asked == 0
    assert re_b.days_asked == []
    assert re_b.difficulty == DifficultyLevel.BEGINNER
    assert re_b.candidate_model.name == "Gerald Combs"

    re_a = session_manager.get_session("session-A")
    assert re_a.questions_asked == 6
    assert re_a.candidate_model.name == "Diane Foster"

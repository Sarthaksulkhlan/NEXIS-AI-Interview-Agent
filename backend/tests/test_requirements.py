"""
Tests verifying the non-negotiable minimum requirements:
- questions >= 8
- unique_curriculum_days >= 4
- controller prevents early termination
"""

import asyncio
import pytest
from app.controller.interview_controller import interview_controller
from app.models.candidate import CandidateModel
from app.models.interview import InterviewSession, DifficultyLevel
from app.services.candidate_service import candidate_service


def test_minimum_requirements_met_function():
    """Verify the boolean minimum_requirements_met check."""
    profile = candidate_service.get_candidate_by_id_or_name("CAND-018")
    model = candidate_service.build_candidate_model(profile)

    session = InterviewSession(
        sessionId="req-test-1",
        candidate_model=model,
        difficulty=DifficultyLevel.INTERMEDIATE,
    )

    # 0 questions, 0 days -> False
    assert interview_controller.minimum_requirements_met(session) is False

    # 7 questions, 4 days -> False (questions < 8)
    session.questions_asked = 7
    session.days_asked = [7, 8, 10, 12, 7, 8, 10]
    assert len(set(session.days_asked)) == 4
    assert interview_controller.minimum_requirements_met(session) is False

    # 8 questions, 3 days -> False (unique days < 4)
    session.questions_asked = 8
    session.days_asked = [7, 7, 7, 8, 8, 8, 10, 10]
    assert len(set(session.days_asked)) == 3
    assert interview_controller.minimum_requirements_met(session) is False

    # 8 questions, 4 days -> True
    session.questions_asked = 8
    session.days_asked = [7, 8, 10, 12, 7, 8, 10, 12]
    assert len(set(session.days_asked)) == 4
    assert interview_controller.minimum_requirements_met(session) is True

    # 10 questions, 5 days -> True
    session.questions_asked = 10
    session.days_asked = [7, 8, 10, 12, 13, 7, 8, 10, 12, 13]
    assert len(set(session.days_asked)) == 5
    assert interview_controller.minimum_requirements_met(session) is True


def test_full_session_reaches_both_floors():
    """
    Simulate a complete turn sequence from start to finish.
    Assert that when done == True:
    - session.questions_asked >= 8
    - len(set(session.days_asked)) >= 4
    """
    async def _run():
        session_id = "req-sim-001"
        candidate_profile = candidate_service.get_candidate_by_id_or_name("CAND-001")

        # Start interview
        res = await interview_controller.start_interview(session_id, candidate_profile)
        assert res.done is False
        assert res.reply

        # Run turns until completion
        done = False
        turn_count = 0
        max_turns = 15

        answers = [
            "In our knowledge base, we used Sentence Transformers with a chunk size of 512 tokens and 50 tokens overlap. We stored cosine similarity metrics in ChromaDB.",
            "We implemented metadata filtering on the healthcare plan ID before executing the HNSW vector search to eliminate irrelevant policy tiers and keep latency under 15ms.",
            "For hybrid retrieval, we used a query router with Reciprocal Rank Fusion to merge SQL claims data with semantic vector matches.",
            "When designing prompts, we used few-shot templates with strict system guardrails forbidding hallucinations.",
            "In FastAPI, we built async endpoints with background task logging and connection pooling.",
            "Our multi-agent architecture uses a supervisor agent in LangGraph that delegates domain queries to specialized sub-agents.",
            "We built an MCP server exposing custom healthcare tools over JSON-RPC with input validation.",
            "For Docker deployment, we created multi-stage builds and configured Kubernetes liveness and readiness health probes.",
            "We monitor token latency and error rates using Prometheus metrics exported to Grafana dashboards.",
        ]

        while not done and turn_count < max_turns:
            ans = answers[turn_count % len(answers)]
            res = await interview_controller.handle_candidate_answer(session_id, ans)
            turn_count += 1
            done = res.done

        assert done is True, "Interview failed to complete within turn limit"
        assert res.feedback is not None, "Feedback missing on final response"

        from app.services.session_manager import session_manager
        session = session_manager.get_session(session_id)
        assert session is not None
        assert session.questions_asked >= 8, f"Expected >= 8 questions, got {session.questions_asked}"
        assert len(set(session.days_asked)) >= 4, f"Expected >= 4 unique days, got {len(set(session.days_asked))}"

    asyncio.run(_run())

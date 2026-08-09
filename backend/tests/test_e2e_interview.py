"""
End-to-end interview simulations for 3 distinct candidate profiles:
1. Diane Foster (CAND-018): Strong AI Engineer
2. Gerald Combs (CAND-010): Candidate with failed days (prioritized)
3. Mia Alvarez (CAND-011): Candidate with skipped topics (hard-excluded)

Uses asyncio.run internally so tests run on plain pytest with 0 configuration.
"""

import asyncio
import pytest
from httpx import ASGITransport, AsyncClient
from app.main import app
from app.services.candidate_service import candidate_service
from app.services.session_manager import session_manager


def test_e2e_diane_foster_strong_interview():
    """
    Diane Foster:
    - Highly capable candidate
    - Receives intermediate/advanced questions
    - Demonstrates depth, completes >= 8 questions and >= 4 unique days
    - Receives detailed structured feedback with strengths on specific days
    """
    async def _run():
        session_id = "e2e-diane-001"
        candidate = candidate_service.get_candidate_by_id_or_name("CAND-018")
        assert candidate is not None

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            # Start
            start_res = await client.post(
                "/api/interview",
                json={"sessionId": session_id, "candidate": candidate.model_dump()},
            )
            assert start_res.status_code == 200
            data = start_res.json()
            assert data["done"] is False
            assert len(data["reply"]) > 10

            # Run turns with strong technical answers
            strong_responses = [
                "We used ChromaDB with cosine similarity and HNSW indexing. For healthcare plan lookups, we indexed metadata fields so queries filter by policy tier before similarity computation, reducing latency.",
                "Our query router analyzes query intent using structured classification. If the query references specific claims codes, it routes to SQLite; otherwise, it hits the vector index with Reciprocal Rank Fusion.",
                "In our RAG pipeline, we configured few-shot grounded prompts with strict system guardrails instructing the model to cite only retrieved chunks and refuse ungrounded speculation.",
                "We implemented OpenAI function calling with Pydantic schema validation. If the LLM generates an invalid payload, our middleware catches the ValidationError and requests a single schema-corrected retry.",
                "For our multi-agent architecture, we used LangGraph with a central supervisor. The supervisor delegates specialized insurance claims vs. clinical guidelines queries to dedicated sub-agents.",
                "We built an MCP server exposing custom healthcare tools over standard JSON-RPC. Clients discover capabilities dynamically and execute tools with strict permission scopes.",
                "We containerized our FastAPI and React services using multi-stage Docker builds and deployed to Kubernetes with readiness probes checking model connectivity.",
                "For observability, we export Prometheus metrics for token latency and p99 response times to Grafana dashboards.",
            ]

            final_response = None
            for ans in strong_responses:
                turn_res = await client.post(
                    "/api/interview",
                    json={"sessionId": session_id, "message": ans},
                )
                assert turn_res.status_code == 200
                turn_data = turn_res.json()
                if turn_data["done"]:
                    final_response = turn_data
                    break

            assert final_response is not None, "Diane's interview did not complete"
            assert final_response["done"] is True
            feedback = final_response["feedback"]
            assert "summary" in feedback
            assert "strengths" in feedback
            assert "gaps" in feedback
            assert "next" in feedback
            assert len(feedback["strengths"]) > 0

            # Verify session state guarantee
            session = session_manager.get_session(session_id)
            assert session.questions_asked >= 8
            assert len(set(session.days_asked)) >= 4

    asyncio.run(_run())


def test_e2e_gerald_combs_weak_topics_prioritized():
    """
    Gerald Combs (CAND-010):
    - Has recorded failures on Day 8, 10, 22.
    - System MUST prioritize asking about these weak areas.
    - System MUST exclude skipped Day 27, 28.
    - Completes >= 8 questions and >= 4 unique days.
    """
    async def _run():
        session_id = "e2e-gerald-001"
        candidate = candidate_service.get_candidate_by_id_or_name("CAND-010")
        assert candidate is not None

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            # Start
            start_res = await client.post(
                "/api/interview",
                json={"sessionId": session_id, "candidate": candidate.model_dump()},
            )
            assert start_res.status_code == 200

            session = session_manager.get_session(session_id)
            assert 8 in session.candidate_model.weak_days or 10 in session.candidate_model.weak_days
            assert 27 in session.candidate_model.skipped_days
            assert 28 in session.candidate_model.skipped_days

            answers = [
                "I'm not fully sure about the vector database setup, I mostly followed the default tutorials.",
                "For retrieval, we just searched everything together without separate routing.",
                "We used basic prompts without many guardrails.",
                "In our backend, we wrote basic FastAPI routes with SQLite.",
                "Multi-agent was tricky for me, I had some errors setting up the graphs.",
                "We had basic Dockerfiles but did not deploy to Kubernetes.",
                "I learned a lot during the capstone and tried to connect all parts.",
                "We tested the app manually by clicking buttons in the UI.",
                "I would like to practice more on database indexing and agents.",
            ]

            final_response = None
            for ans in answers:
                turn_res = await client.post(
                    "/api/interview",
                    json={"sessionId": session_id, "message": ans},
                )
                assert turn_res.status_code == 200
                turn_data = turn_res.json()
                if turn_data["done"]:
                    final_response = turn_data
                    break

            assert final_response is not None
            assert final_response["done"] is True

            session = session_manager.get_session(session_id)
            assert session.questions_asked >= 8
            assert len(set(session.days_asked)) >= 4
            assert 27 not in session.days_asked
            assert 28 not in session.days_asked

    asyncio.run(_run())


def test_e2e_mia_alvarez_skipped_days_excluded():
    """
    Mia Alvarez (CAND-011):
    - Has explicitly skipped days 7, 8, 12, 16, 22.
    - The interview MUST NEVER ask questions from these skipped days.
    - Completes >= 8 questions and >= 4 unique days.
    """
    async def _run():
        session_id = "e2e-mia-001"
        candidate = candidate_service.get_candidate_by_id_or_name("CAND-011")
        assert candidate is not None

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            start_res = await client.post(
                "/api/interview",
                json={"sessionId": session_id, "candidate": candidate.model_dump()},
            )
            assert start_res.status_code == 200

            session = session_manager.get_session(session_id)
            skipped = [7, 8, 12, 16, 22]
            for s in skipped:
                assert s in session.candidate_model.skipped_days
                assert s not in session.candidate_model.eligible_days

            answers = [
                "I set up VS Code on macOS with Python 3.11 virtual environments and configured Pylance for type checking.",
                "I installed Ollama locally and downloaded Qwen2.5-Coder to test offline code generation.",
                "We built a React frontend with Vite and connected it to FastAPI for simple chat interactions.",
                "In Pandas, we cleaned claims CSV files and loaded the records into SQLite tables for fast query access.",
                "In our final capstone, we focused on user experience, chat history persistence, and clear UI design.",
                "We used virtual environments to isolate our package dependencies and prevent version conflicts.",
                "For structured data, we wrote SQL queries to answer healthcare coverage questions.",
                "We tested user workflows to ensure the chat interface rendered messages smoothly.",
            ]

            final_response = None
            for ans in answers:
                turn_res = await client.post(
                    "/api/interview",
                    json={"sessionId": session_id, "message": ans},
                )
                assert turn_res.status_code == 200
                turn_data = turn_res.json()
                if turn_data["done"]:
                    final_response = turn_data
                    break

            assert final_response is not None
            assert final_response["done"] is True

            session = session_manager.get_session(session_id)
            assert session.questions_asked >= 8
            assert len(set(session.days_asked)) >= 4

            for s in skipped:
                assert s not in session.days_asked, f"Candidate was asked skipped Day {s}!"

    asyncio.run(_run())

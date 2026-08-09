"""
Feedback Generator service: compiles final actionable interview feedback.
Adheres strictly to the schema {summary, strengths[], gaps[], next[]} defined in technical-spec.md.
"""

import logging
from typing import Any, Dict, List
from ..config import PROMPTS_DIR, settings
from ..models.candidate import CandidateModel
from ..models.interview import AnswerLogItem, FeedbackReport, QuestionLogItem
from .client import extract_json_from_text, llm_client

logger = logging.getLogger(__name__)


class FeedbackGenerator:
    """Generates structured final candidate feedback report."""

    def __init__(self):
        self.system_prompt_template = self._load_prompt_template()

    def _load_prompt_template(self) -> str:
        prompt_file = PROMPTS_DIR / "feedback.txt"
        if prompt_file.exists():
            return prompt_file.read_text(encoding="utf-8")
        return (
            "You are a technical feedback reviewer. Generate structured JSON: "
            "{'summary': '...', 'strengths': [...], 'gaps': [...], 'next': [...]}"
        )

    async def generate_feedback(
        self,
        candidate_model: CandidateModel,
        question_log: List[QuestionLogItem],
        answer_log: List[AnswerLogItem],
        covered_days: List[int],
    ) -> FeedbackReport:
        """
        Generates the final FeedbackReport matching the exact technical specification schema.
        """
        if settings.MOCK_LLM:
            return self._generate_mock_feedback(
                candidate_model=candidate_model,
                question_log=question_log,
                answer_log=answer_log,
                covered_days=covered_days,
            )

        user_prompt = self._build_feedback_prompt(
            candidate_model=candidate_model,
            question_log=question_log,
            answer_log=answer_log,
            covered_days=covered_days,
        )

        for attempt in range(2):
            try:
                json_data = await llm_client.generate_json(
                    system_prompt=self.system_prompt_template,
                    user_prompt=user_prompt,
                    temperature=0.2,
                    max_tokens=900,
                )

                summary = str(json_data.get("summary", "")).strip()
                raw_strengths = json_data.get("strengths", [])
                raw_gaps = json_data.get("gaps", [])
                raw_next = json_data.get("next", [])

                strengths = [str(s).strip() for s in raw_strengths if str(s).strip()]
                gaps = [str(g).strip() for g in raw_gaps if str(g).strip()]
                next_steps = [str(n).strip() for n in raw_next if str(n).strip()]

                if summary and strengths and gaps and next_steps:
                    return FeedbackReport(
                        summary=summary,
                        strengths=strengths,
                        gaps=gaps,
                        next=next_steps,
                    )
            except Exception as e:
                logger.warning(f"Feedback generation attempt {attempt + 1} failed: {e}")

        raise RuntimeError("The configured LLM failed to return a valid structured feedback report.")

    def _build_feedback_prompt(
        self,
        candidate_model: CandidateModel,
        question_log: List[QuestionLogItem],
        answer_log: List[AnswerLogItem],
        covered_days: List[int],
    ) -> str:
        transcript_lines = []
        for q, a in zip(question_log, answer_log):
            transcript_lines.append(
                f"[Day {q.day}: {q.topic} - Diff: {q.difficulty.value}]\n"
                f"Q: {q.text}\n"
                f"A: {a.text}\n"
                f"Eval Pattern: {a.evaluation.pattern.value}, Scores: {a.evaluation.scores.model_dump()}\n"
            )

        transcript_str = "\n".join(transcript_lines)

        return f"""CANDIDATE PROFILE:
- Name: {candidate_model.name}
- Job Role: {candidate_model.job_role}
- Experience: {candidate_model.years_experience} years
- Education: {candidate_model.education}
- Historical Weak Topics: {candidate_model.weak_days}
- Historical Strong Topics: {candidate_model.strong_days}
- Curriculum Days Covered in this Interview: {covered_days}

INTERVIEW TRANSCRIPT & STRUCTURED EVALUATION LOG:
{transcript_str}

TASK:
Produce an evidence-based, actionable feedback report based ONLY on the observed answers and curriculum topics.
Return strictly valid JSON with this exact structure:
{{
  "summary": "2-3 sentence executive assessment summarizing performance across the {len(covered_days)} covered days.",
  "strengths": [
    "Concrete demonstrated technical strength with specific evidence",
    "Concrete demonstrated technical strength with specific evidence"
  ],
  "gaps": [
    "Specific technical gap or missed implementation depth with concrete reference",
    "Specific technical gap or missed implementation depth with concrete reference"
  ],
  "next": [
    "Actionable, curriculum-grounded study recommendation or practice item",
    "Actionable, curriculum-grounded study recommendation or practice item"
  ]
}}"""

    def _generate_mock_feedback(
        self,
        candidate_model: CandidateModel,
        question_log: List[QuestionLogItem],
        answer_log: List[AnswerLogItem],
        covered_days: List[int],
    ) -> FeedbackReport:
        """Deterministic, grounded feedback generator based on actual logs."""
        strong_topics = []
        weak_topics = []
        partial_topics = []

        for q, a in zip(question_log, answer_log):
            pattern = a.evaluation.pattern.value
            if pattern == "strong":
                strong_topics.append((q.day, q.topic))
            elif pattern in ("weak", "off_topic", "empty"):
                weak_topics.append((q.day, q.topic))
            else:
                partial_topics.append((q.day, q.topic))

        # Deduplicate
        unique_strong = list(dict.fromkeys(strong_topics))
        unique_weak = list(dict.fromkeys(weak_topics))
        unique_partial = list(dict.fromkeys(partial_topics))

        # Build strengths
        strengths = []
        if unique_strong:
            for day, top in unique_strong[:3]:
                strengths.append(
                    f"Demonstrated solid architectural depth and practical trade-off awareness on Day {day} ({top})."
                )
        else:
            strengths.append(
                f"Maintained steady participation across {len(covered_days)} distinct curriculum topics throughout the session."
            )
            strengths.append(
                f"Showed foundational conceptual familiarity with core AI engineering workflows and tooling."
            )

        # Build gaps
        gaps = []
        if unique_weak:
            for day, top in unique_weak[:3]:
                gaps.append(
                    f"Struggled with concrete mechanics, failure recovery, and implementation specifics on Day {day} ({top})."
                )
        elif unique_partial:
            for day, top in unique_partial[:3]:
                gaps.append(
                    f"Provided high-level or textbook definitions on Day {day} ({top}) but lacked depth on latency, scale, and operational trade-offs."
                )
        else:
            gaps.append(
                "Could push deeper into production-grade edge cases, distributed concurrency, and automated guardrail verification."
            )

        # Build next recommendations
        next_steps = []
        if unique_weak:
            for day, top in unique_weak[:2]:
                next_steps.append(
                    f"Revisit Day {day} ({top}) code walkthroughs, focusing on real-world hands-on exercises and debugging failure cases."
                )
        if unique_partial:
            for day, top in unique_partial[:2]:
                next_steps.append(
                    f"Deepen knowledge in Day {day} ({top}) by analyzing performance benchmarks, token budget trade-offs, and architecture design patterns."
                )
        if not next_steps:
            next_steps.append(
                "Build end-to-end integration tests that benchmark latency, cost, and guardrail precision under simulated adversarial inputs."
            )
            next_steps.append(
                "Prepare multi-agent production failure recovery playbooks for complex tool orchestration pipelines."
            )

        # Summary
        score_avg = 0.0
        if answer_log:
            total_correct = sum(a.evaluation.scores.correctness for a in answer_log)
            score_avg = round(total_correct / len(answer_log), 1)

        summary = (
            f"{candidate_model.name} completed a comprehensive {len(question_log)}-question interview covering "
            f"{len(covered_days)} curriculum days ({', '.join(f'Day {d}' for d in covered_days)}). "
            f"Overall performance averaged {score_avg}/10 on technical correctness with clear distinction between "
            f"high-confidence modules and areas requiring deeper practical implementation."
        )

        return FeedbackReport(
            summary=summary,
            strengths=strengths,
            gaps=gaps,
            next=next_steps,
        )


feedback_generator = FeedbackGenerator()

"""
Deterministic Interview Controller: the core intelligence and state machine of the Interview Agent.
Guiding principle: THE CONTROLLER DECIDES. THE LLM SPEAKS.

Deterministic responsibilities:
- Builds candidate model (strictly excludes skipped, prioritizes failed)
- Manages complete interview lifecycle (INTRO -> QUESTIONING -> WRAP_UP -> FEEDBACK -> DONE)
- Tracks coverage and objective checklists
- Selects curriculum days and enforces dependency transitions
- Selects question types and difficulty dynamically
- Prevents question repetition
- Enforces strict minimum requirement guarantee (>=8 questions, >=4 unique days)
- Gates interview termination deterministically
"""

import logging
from typing import Any, Dict, List, Optional, Set, Tuple
from ..config import settings
from ..models.candidate import CandidateModel
from ..models.curriculum import CurriculumDay
from ..models.evaluation import AnswerEvaluation, EvaluationPattern
from ..models.interview import (
    ActionType,
    DifficultyLevel,
    FeedbackReport,
    InterviewPhase,
    InterviewResponse,
    InterviewSession,
    QuestionLogItem,
    QuestionType,
    AnswerLogItem,
    TurnItem,
)
from ..services.candidate_service import candidate_service
from ..services.curriculum_service import curriculum_service
from ..services.coverage_tracker import coverage_tracker
from ..services.session_manager import session_manager
from ..llm.question_generator import question_generator
from ..llm.answer_evaluator import answer_evaluator
from ..llm.feedback_generator import feedback_generator

logger = logging.getLogger(__name__)


class InterviewController:
    """Core deterministic orchestrator of the interview system."""

    def __init__(self):
        self.min_questions = settings.MIN_QUESTIONS_REQUIRED
        self.min_unique_days = settings.MIN_UNIQUE_DAYS_REQUIRED
        self.max_followups = settings.MAX_FOLLOWUPS_PER_DAY
        self.max_total_limit = settings.MAX_TOTAL_QUESTIONS_LIMIT

    # =========================================================================
    # 1. Start Interview Flow
    # =========================================================================

    async def start_interview(
        self,
        session_id: str,
        candidate_data: Any,
    ) -> InterviewResponse:
        """
        Initializes a new interview session deterministically.
        1. Validates candidate data
        2. Builds candidate model
        3. Determines starting difficulty based on candidate mastery
        4. Selects initial curriculum day deterministically (prioritizing candidate weak/priority days)
        5. Initializes coverage tracker for the selected day
        6. Generates first personalized question
        7. Stores question in session state
        8. Returns initial interview response
        """
        candidate_model = candidate_service.build_candidate_model(candidate_data)

        # Fallback if candidate somehow has no eligible days
        if not candidate_model.eligible_days:
            all_days = curriculum_service.get_all_days()
            candidate_model.eligible_days = [
                d for d in all_days if d not in candidate_model.skipped_days
            ]
            if not candidate_model.eligible_days:
                candidate_model.eligible_days = all_days[:4]

        initial_difficulty = self._determine_initial_difficulty(candidate_model)

        session = session_manager.create_session(
            session_id=session_id,
            candidate_model=candidate_model,
            initial_difficulty=initial_difficulty,
        )
        session.phase = InterviewPhase.QUESTIONING

        first_day_num = self.select_initial_day(candidate_model)
        curriculum_day = curriculum_service.get_day(first_day_num)
        if not curriculum_day:
            first_day_num = candidate_model.eligible_days[0]
            curriculum_day = curriculum_service.get_day(first_day_num)

        session.current_day = first_day_num
        day_key = f"day_{first_day_num}"
        session.coverage[day_key] = coverage_tracker.initialize_day_coverage(
            curriculum_day=curriculum_day,
            difficulty=initial_difficulty,
        )

        q_type = self.select_question_type(
            difficulty=initial_difficulty,
            action=ActionType.NEW_TOPIC,
            is_followup=False,
        )

        question_text = await question_generator.generate_question(
            curriculum_day=curriculum_day,
            topic=curriculum_day.title,
            objectives=curriculum_day.objectives,
            action=ActionType.NEW_TOPIC,
            difficulty=initial_difficulty,
            question_type=q_type,
            candidate_name=candidate_model.name,
            is_first_question=True,
        )

        question_item = QuestionLogItem(
            id=1,
            day=first_day_num,
            topic=curriculum_day.title,
            type=curriculum_day.type,
            difficulty=initial_difficulty,
            text=question_text,
            question_type=q_type,
            is_followup=False,
            target_objectives=[0],
        )
        session.question_log.append(question_item)
        session.days_asked.append(first_day_num)
        session.questions_asked = 1
        session.recent_turns.append(TurnItem(speaker="interviewer", text=question_text))

        session_manager.update_session(session)

        # Structured Controller Logging
        logger.info(
            f"SESSION: {session_id} | QUESTION: 1 | DAY: {first_day_num} | "
            f"TOPIC: {curriculum_day.title} | ACTION: NEW_TOPIC | "
            f"DIFFICULTY: {initial_difficulty.value} | TYPE: {q_type.value} | UNIQUE_DAYS: 1"
        )

        return InterviewResponse(
            reply=question_text,
            done=False,
        )

    # =========================================================================
    # 2. Process Turn Flow
    # =========================================================================

    async def handle_candidate_answer(
        self,
        session_id: str,
        candidate_message: str,
        precomputed_evaluation: AnswerEvaluation | None = None,
    ) -> InterviewResponse:
        """
        Processes a candidate turn through the deterministic state machine:
        1. Retrieve session state
        2. Evaluate candidate answer against ground-truth curriculum objectives
        3. Update coverage checklist and answer log
        4. Check minimum requirements guarantee
        5. Decide next deterministic action (FOLLOW_UP, ESCALATE, NEW_TOPIC, WRAP_UP)
        6. Select next topic and adapt difficulty
        7. Generate next question or finalize feedback report
        """
        session = session_manager.get_session(session_id)
        if not session:
            raise KeyError(f"No active interview session found with ID '{session_id}'")

        if session.is_complete:
            return InterviewResponse(
                reply="Interview is already completed. Thank you.",
                done=True,
                feedback=session.feedback,
            )

        current_day_num = session.current_day or session.days_asked[-1]
        curriculum_day = curriculum_service.get_day(current_day_num)
        day_key = f"day_{current_day_num}"
        day_cov = session.coverage.get(day_key)

        last_question = session.question_log[-1] if session.question_log else None
        last_question_text = last_question.text if last_question else curriculum_day.title

        # Step 1: Evaluator grades answer against ground truth
        evaluation = precomputed_evaluation or await answer_evaluator.evaluate_answer(
            curriculum_day=curriculum_day,
            question_text=last_question_text,
            candidate_answer=candidate_message,
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

        # Step 2: Update coverage checklist
        if day_cov:
            coverage_tracker.mark_objectives_addressed(
                day_cov, evaluation.addressed_objectives
            )

        # Step 3: Log answer & update recent turns
        answer_item = AnswerLogItem(
            question_id=session.questions_asked,
            day=current_day_num,
            text=candidate_message,
            evaluation=evaluation,
        )
        session.answer_log.append(answer_item)
        session.recent_turns.append(TurnItem(speaker="candidate", text=candidate_message))
        if len(session.recent_turns) > settings.RECENT_TURNS_CONTEXT_LIMIT * 2:
            session.recent_turns = session.recent_turns[-settings.RECENT_TURNS_CONTEXT_LIMIT * 2 :]

        # Step 4: Check deterministic termination conditions
        can_end = self.can_end_interview(session)
        should_wrap_up = self.should_end_interview(session, evaluation)

        logger.info(
            f"SESSION: {session_id} | TURN_EVAL: Q#{session.questions_asked} | "
            f"DAY: {current_day_num} | PATTERN: {evaluation.pattern.value} | "
            f"SCORE: {evaluation.scores.correctness}/10 | "
            f"QS: {session.questions_asked}/{self.min_questions} | "
            f"DAYS: {len(set(session.days_asked))}/{self.min_unique_days} | "
            f"CAN_END: {can_end} | SHOULD_WRAP_UP: {should_wrap_up}"
        )

        if can_end and should_wrap_up:
            return await self.finalize_interview(session)

        # Step 5: Deterministic Decision Engine
        action, next_day_num, follow_up_reason = self.evaluate_next_action(
            session=session,
            current_day_cov=day_cov,
            evaluation=evaluation,
        )

        # Step 6: Select adapted difficulty
        next_difficulty = self.select_difficulty(session.difficulty, evaluation.pattern, evaluation)
        session.difficulty = next_difficulty

        # Step 7: Topic Transition handling
        if action in (ActionType.NEW_TOPIC, ActionType.WRAP_UP) or next_day_num != current_day_num:
            session.current_day = next_day_num
            current_day_num = next_day_num
            curriculum_day = curriculum_service.get_day(next_day_num)
            day_key = f"day_{next_day_num}"

            if day_key not in session.coverage:
                session.coverage[day_key] = coverage_tracker.initialize_day_coverage(
                    curriculum_day=curriculum_day,
                    difficulty=next_difficulty,
                )
            day_cov = session.coverage[day_key]
        else:
            if day_cov:
                coverage_tracker.increment_followup_depth(day_cov)

        # Step 8: Select Question Type and Generate Next Question
        is_followup = action in (ActionType.FOLLOW_UP, ActionType.ESCALATE, ActionType.REDIRECT)
        next_q_num = session.questions_asked + 1

        unaddressed = coverage_tracker.get_unaddressed_objectives(day_cov) if day_cov else [0]
        target_objs = unaddressed[:2] if unaddressed else [0]

        q_type = self.select_question_type(
            difficulty=next_difficulty,
            action=action,
            is_followup=is_followup,
        )

        next_question_text = await question_generator.generate_question(
            curriculum_day=curriculum_day,
            topic=curriculum_day.title,
            objectives=curriculum_day.objectives,
            action=action,
            difficulty=next_difficulty,
            question_type=q_type,
            previous_question=last_question_text,
            previous_answer=candidate_message,
            follow_up_reason=follow_up_reason,
            question_history=session.question_log,
            candidate_name=session.candidate_model.name,
            is_first_question=False,
        )

        # Question repetition prevention check
        if self._is_question_repeated(session.question_log, next_question_text):
            next_question_text = self._get_alternative_question(
                curriculum_day=curriculum_day,
                difficulty=next_difficulty,
                q_type=q_type,
            )

        q_item = QuestionLogItem(
            id=next_q_num,
            day=current_day_num,
            topic=curriculum_day.title,
            type=curriculum_day.type,
            difficulty=next_difficulty,
            text=next_question_text,
            question_type=q_type,
            is_followup=is_followup,
            follow_up_reason=follow_up_reason,
            target_objectives=target_objs,
        )
        session.question_log.append(q_item)
        session.days_asked.append(current_day_num)
        session.questions_asked = next_q_num
        session.recent_turns.append(TurnItem(speaker="interviewer", text=next_question_text))

        session_manager.update_session(session)

        # Structured Controller Logging
        followup_depth = day_cov.follow_up_depth if day_cov else 0
        unique_days_count = len(set(session.days_asked))
        logger.info(
            f"SESSION: {session_id} | QUESTION: {next_q_num} | DAY: {current_day_num} | "
            f"TOPIC: {curriculum_day.title} | PATTERN: {evaluation.pattern.value} | "
            f"ACTION: {action.value} | DIFFICULTY: {next_difficulty.value} | "
            f"TYPE: {q_type.value} | FOLLOWUP_DEPTH: {followup_depth} | UNIQUE_DAYS: {unique_days_count}"
        )

        return InterviewResponse(
            reply=next_question_text,
            done=False,
        )

    # Alias for backward compatibility
    process_turn = handle_candidate_answer

    # =========================================================================
    # 3. Deterministic Minimum Requirement Guarantees
    # =========================================================================

    def has_minimum_questions(self, session: InterviewSession) -> bool:
        """Returns True if questions asked is at least 8."""
        return session.questions_asked >= self.min_questions

    def has_minimum_days(self, session: InterviewSession) -> bool:
        """Returns True if unique curriculum days covered is at least 4."""
        return len(set(session.days_asked)) >= self.min_unique_days

    def minimum_requirements_met(self, session: InterviewSession) -> bool:
        """
        Hard deterministic code check:
        Guarantees questions_asked >= 8 AND unique_curriculum_days >= 4.
        The LLM can NEVER override this check.
        """
        return self.has_minimum_questions(session) and self.has_minimum_days(session)

    def can_end_interview(self, session: InterviewSession) -> bool:
        """
        The interview CANNOT end before minimum requirements are met,
        unless the absolute safety ceiling is reached.
        """
        return self.minimum_requirements_met(session) or session.questions_asked >= self.max_total_limit

    def should_end_interview(self, session: InterviewSession, last_eval: AnswerEvaluation) -> bool:
        """
        Determines if a natural wrap-up point has been reached once minimum requirements are met.
        Edge cases:
        - 8 questions + 3 days -> False (cannot end, continues to 4th day)
        - 7 questions + 4 days -> False (cannot end, continues to 8th question)
        - 8 questions + 4 days -> True (eligible to end)
        """
        if not self.minimum_requirements_met(session):
            return False
        return True

    _should_wrap_up = should_end_interview

    # =========================================================================
    # 4. Decision Engine & Topic Selection
    # =========================================================================

    def select_initial_day(self, candidate_model: CandidateModel) -> int:
        """
        Deterministically selects the initial curriculum day for questioning:
        1. Prioritize weak days (passed == False)
        2. Prioritize uncertain days (attempts >= 3)
        3. Prioritize strong days in curriculum order
        4. Exclude skipped days and untracked days
        """
        if candidate_model.weak_days:
            return candidate_model.weak_days[0]
        if candidate_model.uncertain_days:
            return candidate_model.uncertain_days[0]
        if candidate_model.strong_days:
            return candidate_model.strong_days[0]
        if candidate_model.eligible_days:
            return candidate_model.eligible_days[0]
        return curriculum_service.get_all_days()[0]

    def evaluate_next_action(
        self,
        session: InterviewSession,
        current_day_cov: Optional[Any],
        evaluation: AnswerEvaluation,
    ) -> Tuple[ActionType, int, Optional[str]]:
        """
        Deterministic decision engine:
        Evaluates current day status, candidate answer pattern, and coverage
        to decide whether to FOLLOW_UP, ESCALATE, REDIRECT, or switch to a NEW_TOPIC.
        """
        current_day = session.current_day or session.days_asked[-1]
        unique_days_count = len(set(session.days_asked))

        can_followup = coverage_tracker.can_followup(
            current_day_cov, self.max_followups
        ) if current_day_cov else False

        needs_more_days = unique_days_count < self.min_unique_days

        # Day Floor Priority: if staying on this day risks failing the 4-day floor, force day change
        if needs_more_days and (self.min_unique_days - unique_days_count) >= (self.min_questions - session.questions_asked):
            next_topic = self.select_next_day(session)
            return ActionType.NEW_TOPIC, next_topic, "DAY_FLOOR_PRIORITY"

        pattern = evaluation.pattern

        if pattern == EvaluationPattern.STRONG:
            if can_followup and current_day_cov and len(current_day_cov.addressed) < len(current_day_cov.objectives):
                return ActionType.ESCALATE, current_day, "STRONG_ANSWER_TRADE_OFFS"
            else:
                next_topic = self.select_next_day(session)
                return ActionType.NEW_TOPIC, next_topic, "DAY_COMPLETED_STRONG"

        elif pattern == EvaluationPattern.PARTIAL:
            if can_followup:
                return ActionType.FOLLOW_UP, current_day, "PARTIAL_ANSWER_PROBE_DEPTH"
            else:
                next_topic = self.select_next_day(session)
                return ActionType.NEW_TOPIC, next_topic, "FOLLOWUP_CAP_REACHED"

        elif pattern in (EvaluationPattern.WEAK, EvaluationPattern.EMPTY):
            if can_followup:
                return ActionType.FOLLOW_UP, current_day, "WEAK_ANSWER_DIAGNOSTIC"
            else:
                next_topic = self.select_next_day(session)
                return ActionType.NEW_TOPIC, next_topic, "WEAK_AREA_PIVOT"

        elif pattern == EvaluationPattern.VAGUE:
            if can_followup:
                return ActionType.FOLLOW_UP, current_day, "VAGUE_ANSWER_ASK_EXAMPLE"
            else:
                next_topic = self.select_next_day(session)
                return ActionType.NEW_TOPIC, next_topic, "FOLLOWUP_CAP_REACHED"

        elif pattern == EvaluationPattern.OFF_TOPIC:
            if can_followup:
                return ActionType.REDIRECT, current_day, "OFF_TOPIC_REDIRECT"
            else:
                next_topic = self.select_next_day(session)
                return ActionType.NEW_TOPIC, next_topic, "OFF_TOPIC_PIVOT"

        if can_followup:
            return ActionType.FOLLOW_UP, current_day, "STANDARD_FOLLOW_UP"
        next_topic = self.select_next_day(session)
        return ActionType.NEW_TOPIC, next_topic, "NEXT_CURRICULUM_TOPIC"

    _decide_next_action = evaluate_next_action

    def select_next_day(self, session: InterviewSession) -> int:
        """
        Deterministic topic selection algorithm:
        1. Filter strictly to candidate's eligible_days (hard-excluding skipped topics).
        2. Priority hierarchy:
           a. Weak days (passed == False) that haven't been asked yet.
           b. Uncertain days (attempts >= 3) that haven't been asked yet.
           c. Strong days that haven't been asked yet.
           d. Natural curriculum dependency proximity to the current day.
        3. If all eligible days have been asked at least once, choose the least-covered eligible day.
        4. Always guarantee at least 4 unique days across the interview.
        """
        eligible = session.candidate_model.eligible_days
        if not eligible:
            eligible = curriculum_service.get_all_days()

        asked_set = set(session.days_asked)
        unasked_eligible = [d for d in eligible if d not in asked_set]

        unasked_weak = [d for d in session.candidate_model.weak_days if d in unasked_eligible]
        if unasked_weak:
            return unasked_weak[0]

        unasked_uncertain = [d for d in session.candidate_model.uncertain_days if d in unasked_eligible]
        if unasked_uncertain:
            return unasked_uncertain[0]

        unasked_strong = [d for d in session.candidate_model.strong_days if d in unasked_eligible]
        if unasked_strong:
            current = session.current_day or unasked_strong[0]
            return sorted(unasked_strong, key=lambda d: abs(d - current))[0]

        if unasked_eligible:
            current = session.current_day or unasked_eligible[0]
            return sorted(unasked_eligible, key=lambda d: abs(d - current))[0]

        day_question_counts = {d: session.days_asked.count(d) for d in eligible}
        min_asked_day = min(eligible, key=lambda d: day_question_counts.get(d, 0))
        return min_asked_day

    _select_next_topic = select_next_day

    # =========================================================================
    # 5. Question Type & Difficulty Management
    # =========================================================================

    def select_question_type(
        self,
        difficulty: DifficultyLevel,
        action: ActionType,
        is_followup: bool,
    ) -> QuestionType:
        """Selects structured question type based on difficulty and action."""
        if action == ActionType.ESCALATE or difficulty == DifficultyLevel.EXPERT:
            return QuestionType.TRADEOFF
        if difficulty == DifficultyLevel.ADVANCED:
            return QuestionType.SYSTEM_DESIGN if not is_followup else QuestionType.PRODUCTION
        if difficulty == DifficultyLevel.INTERMEDIATE:
            return QuestionType.SCENARIO if is_followup else QuestionType.COMPARISON
        # Beginner
        return QuestionType.HOW if is_followup else QuestionType.CONCEPTUAL

    def select_difficulty(
        self,
        current_diff: DifficultyLevel,
        pattern: EvaluationPattern,
        evaluation: AnswerEvaluation,
    ) -> DifficultyLevel:
        """
        Dynamically adjusts difficulty:
        - Strong answer + high correctness (>=8): escalate (beginner -> intermediate -> advanced -> expert)
        - Weak / Vague / Empty answer (<=3): decrease difficulty (expert -> advanced -> intermediate -> beginner)
        - Partial answer: maintain level
        """
        levels = [
            DifficultyLevel.BEGINNER,
            DifficultyLevel.INTERMEDIATE,
            DifficultyLevel.ADVANCED,
            DifficultyLevel.EXPERT,
        ]
        curr_idx = levels.index(current_diff)

        if pattern == EvaluationPattern.STRONG and evaluation.scores.correctness >= 8:
            new_idx = min(curr_idx + 1, len(levels) - 1)
            return levels[new_idx]
        elif pattern in (EvaluationPattern.WEAK, EvaluationPattern.EMPTY) or evaluation.scores.correctness <= 3:
            new_idx = max(curr_idx - 1, 0)
            return levels[new_idx]
        else:
            return current_diff

    _adjust_difficulty = select_difficulty

    def _determine_initial_difficulty(self, candidate: CandidateModel) -> DifficultyLevel:
        """Determines starting difficulty from candidate mastery ratio."""
        if candidate.mastery_ratio >= 0.85:
            return DifficultyLevel.ADVANCED
        elif candidate.mastery_ratio >= 0.50:
            return DifficultyLevel.INTERMEDIATE
        else:
            return DifficultyLevel.BEGINNER

    # =========================================================================
    # 6. Question Repetition Prevention
    # =========================================================================

    def _is_question_repeated(
        self,
        question_log: List[QuestionLogItem],
        new_text: str,
    ) -> bool:
        """Checks if exact or near-identical question text has already been asked."""
        norm_new = new_text.lower().strip()
        for q in question_log:
            if q.text.lower().strip() == norm_new:
                return True
        return False

    def _get_alternative_question(
        self,
        curriculum_day: CurriculumDay,
        difficulty: DifficultyLevel,
        q_type: QuestionType,
    ) -> str:
        """Generates an alternative deterministic question to avoid repetition."""
        obj = curriculum_day.objectives[-1] if curriculum_day.objectives else curriculum_day.title
        return f"Regarding {curriculum_day.title} at {difficulty.value} level, can you elaborate on your implementation for: {obj}?"

    # =========================================================================
    # 7. Finalize & Feedback Generation
    # =========================================================================

    async def finalize_interview(self, session: InterviewSession) -> InterviewResponse:
        """
        Finalizes the interview, invokes the FeedbackGenerator once,
        marks session complete, and returns the final response matching the technical spec.
        """
        session.phase = InterviewPhase.FEEDBACK
        covered_days = list(dict.fromkeys(session.days_asked))

        feedback_report = await feedback_generator.generate_feedback(
            candidate_model=session.candidate_model,
            question_log=session.question_log,
            answer_log=session.answer_log,
            covered_days=covered_days,
        )

        session.feedback = feedback_report
        session.phase = InterviewPhase.DONE
        session.is_complete = True
        session_manager.update_session(session)

        closing_reply = "Thank you for completing the technical interview. Your assessment and feedback report have been compiled."

        logger.info(
            f"SESSION_DONE: {session.sessionId} | TOTAL_QUESTIONS: {session.questions_asked} | "
            f"UNIQUE_DAYS: {len(covered_days)} | PHASE: DONE"
        )

        return InterviewResponse(
            reply=closing_reply,
            done=True,
            feedback=feedback_report,
        )

    _finalize_interview = finalize_interview


interview_controller = InterviewController()

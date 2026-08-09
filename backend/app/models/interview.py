"""
Interview session state and API request/response models.
"""

from enum import Enum
from typing import Any, Dict, List, Optional, Set, Union
from pydantic import BaseModel, Field
from .candidate import CandidateModel, CandidateProfile
from .evaluation import AnswerEvaluation


class InterviewPhase(str, Enum):
    """Lifecycle phases of an interview session."""

    INTRO = "INTRO"
    QUESTIONING = "QUESTIONING"
    WRAP_UP = "WRAP_UP"
    FEEDBACK = "FEEDBACK"
    DONE = "DONE"


class DifficultyLevel(str, Enum):
    """Interview question difficulty levels."""

    BEGINNER = "beginner"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"
    EXPERT = "expert"


class ActionType(str, Enum):
    """Next action decided deterministically by the controller."""

    NEW_TOPIC = "NEW_TOPIC"
    FOLLOW_UP = "FOLLOW_UP"
    ESCALATE = "ESCALATE"
    REDIRECT = "REDIRECT"
    WRAP_UP = "WRAP_UP"


class QuestionType(str, Enum):
    """Types of questions categorized by depth and format."""

    CONCEPTUAL = "CONCEPTUAL"
    WHY = "WHY"
    HOW = "HOW"
    COMPARISON = "COMPARISON"
    SCENARIO = "SCENARIO"
    DEBUGGING = "DEBUGGING"
    SYSTEM_DESIGN = "SYSTEM_DESIGN"
    TRADEOFF = "TRADEOFF"
    PRODUCTION = "PRODUCTION"


class DayCoverage(BaseModel):
    """Per-day objective checklist tracking candidate coverage."""

    day: int = Field(..., description="Curriculum day number")
    title: str = Field(..., description="Day title")
    type: str = Field(..., description="Curriculum day type (e.g. BUILD, AI_CORE)")
    objectives: List[str] = Field(..., description="List of objectives from curriculum")
    addressed: Set[int] = Field(default_factory=set, description="Set of objective indices addressed so far")
    follow_up_depth: int = Field(default=0, description="Count of follow-up questions asked on this day")
    difficulty_here: DifficultyLevel = Field(default=DifficultyLevel.BEGINNER, description="Current difficulty on this day")


class QuestionLogItem(BaseModel):
    """Record of a question asked to the candidate."""

    id: int = Field(..., description="1-based question number")
    day: int = Field(..., description="Curriculum day number")
    topic: str = Field(..., description="Day title / topic")
    type: str = Field(..., description="Question classification type")
    difficulty: DifficultyLevel = Field(..., description="Difficulty level of the question")
    text: str = Field(..., description="Actual question text asked")
    question_type: QuestionType = Field(default=QuestionType.CONCEPTUAL, description="Question structural type")
    is_followup: bool = Field(default=False, description="Whether this was a follow-up")
    follow_up_reason: Optional[str] = Field(default=None, description="Reason code for follow-up")
    target_objectives: List[int] = Field(default_factory=list, description="Target objective indices")


class AnswerLogItem(BaseModel):
    """Record of an answer given by the candidate along with its evaluation."""

    question_id: int = Field(..., description="Associated question ID")
    day: int = Field(..., description="Curriculum day number")
    text: str = Field(..., description="Candidate raw response text")
    evaluation: AnswerEvaluation = Field(..., description="Structured evaluation output")


class TurnItem(BaseModel):
    """Raw utterance turn stored for conversational continuity context."""

    speaker: str = Field(..., description="'interviewer' or 'candidate'")
    text: str = Field(..., description="Utterance text")


class FeedbackReport(BaseModel):
    """
    Final feedback payload matching technical specification exact schema:
    {
      "summary": "...",
      "strengths": ["..."],
      "gaps": ["..."],
      "next": ["..."]
    }
    """

    summary: str = Field(..., description="Executive summary of the candidate's interview performance")
    strengths: List[str] = Field(..., description="Specific demonstrated strengths with concrete evidence")
    gaps: List[str] = Field(..., description="Specific areas of struggle, missing depth, or gaps")
    next: List[str] = Field(..., description="Actionable next steps and study recommendations")


class InterviewSession(BaseModel):
    """
    In-memory interview session state owned by the Controller.
    """

    sessionId: str = Field(..., description="Unique interview session ID")
    candidate_model: CandidateModel = Field(..., description="Deterministic candidate profile model")
    phase: InterviewPhase = Field(default=InterviewPhase.INTRO, description="Current interview phase")
    coverage: Dict[str, DayCoverage] = Field(default_factory=dict, description="Active per-day coverage trackers ('day_X')")
    current_day: Optional[int] = Field(default=None, description="Current active curriculum day number")
    difficulty: DifficultyLevel = Field(default=DifficultyLevel.BEGINNER, description="Global current difficulty")
    days_asked: List[int] = Field(default_factory=list, description="Chronological log of day numbers asked")
    questions_asked: int = Field(default=0, description="Total questions asked so far")
    question_log: List[QuestionLogItem] = Field(default_factory=list, description="Complete log of questions asked")
    answer_log: List[AnswerLogItem] = Field(default_factory=list, description="Complete log of answers & evaluations")
    multimodal_log: List[Dict[str, Any]] = Field(default_factory=list, description="Real media processing results by question")
    recent_turns: List[TurnItem] = Field(default_factory=list, description="Recent conversation turns for natural context")
    feedback: Optional[FeedbackReport] = Field(default=None, description="Final structured feedback report")
    is_complete: bool = Field(default=False, description="Whether the interview is marked complete")


# ==========================================
# API Request / Response Models
# ==========================================

class StartInterviewRequest(BaseModel):
    """First request to POST /api/interview to initialize an interview."""

    sessionId: str = Field(..., description="Unique session ID")
    candidate: Union[CandidateProfile, Dict[str, Any]] = Field(..., description="Candidate JSON profile")


class TurnInterviewRequest(BaseModel):
    """Subsequent request to POST /api/interview with candidate's latest message."""

    sessionId: str = Field(..., description="Unique session ID")
    message: str = Field(..., description="Candidate's response message")


class InterviewResponse(BaseModel):
    """
    Standard response format for POST /api/interview:
    - Normal turn: { "reply": "...", "done": false }
    - End turn:    { "reply": "...", "done": true, "feedback": { summary, strengths, gaps, next } }
    """

    reply: str = Field(..., description="Interviewer response or feedback message")
    done: bool = Field(default=False, description="True when the interview has ended")
    feedback: Optional[FeedbackReport] = Field(default=None, description="Present only on final response")

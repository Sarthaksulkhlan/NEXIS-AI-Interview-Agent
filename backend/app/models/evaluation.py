"""
Evaluation Pydantic models for structured grading of candidate answers.
"""

from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field


class EvaluationPattern(str, Enum):
    """Classification pattern of the candidate's answer."""

    STRONG = "strong"        # Correct, deep, practical, covers trade-offs
    PARTIAL = "partial"      # Correct concept, missing depth or implementation details
    WEAK = "weak"            # Incorrect, flawed assumptions, confusion
    VAGUE = "vague"          # Hand-wavy, buzzwordy, lacked concrete details
    OFF_TOPIC = "off_topic"  # Answered something unrelated or ignored the question
    EMPTY = "empty"          # No real answer, refused, or said "I don't know"


class EvaluationScores(BaseModel):
    """Granular component scores for an answer (scale 0-10)."""

    correctness: int = Field(default=0, ge=0, le=10, description="Technical accuracy and validity")
    depth: int = Field(default=0, ge=0, le=10, description="Depth of explanation beyond surface definitions")
    reasoning: int = Field(default=0, ge=0, le=10, description="Logical structure and technical justification")
    tradeoffs: int = Field(default=0, ge=0, le=10, description="Discussion of trade-offs, constraints, edge cases")
    completeness: int = Field(default=0, ge=0, le=10, description="Extent to which asked question was addressed")


class AnswerEvaluation(BaseModel):
    """Structured evaluation output returned by the Evaluator."""

    addressed_objectives: List[int] = Field(
        default_factory=list,
        description="0-based indices of curriculum objectives satisfied by this answer",
    )
    scores: EvaluationScores = Field(
        default_factory=EvaluationScores,
        description="Granular dimension scores",
    )
    pattern: EvaluationPattern = Field(
        default=EvaluationPattern.PARTIAL,
        description="High-level evaluation classification pattern",
    )
    rationale: Optional[str] = Field(
        default=None,
        description="Brief internal explanation for the grade and pattern (optional)",
    )

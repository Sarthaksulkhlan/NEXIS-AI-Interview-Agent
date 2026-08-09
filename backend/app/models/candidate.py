"""
Candidate profile and candidate model schemas.
"""

from typing import List, Optional, Union
from pydantic import BaseModel, Field


class CandidateMember(BaseModel):
    """Personal and professional profile of the candidate."""

    id: str = Field(..., description="Unique candidate identifier, e.g. CAND-001")
    name: str = Field(..., description="Candidate full name")
    jobRole: str = Field(..., description="Current job role")
    yearsExperience: Union[int, float] = Field(..., description="Years of professional experience")
    education: str = Field(..., description="Educational background")
    status: str = Field(default="COMPLETED", description="Enrollment status")


class CandidateMission(BaseModel):
    """A mission/day entry recorded in the candidate's history."""

    day: int = Field(..., description="Curriculum day number")
    title: str = Field(..., description="Mission title")
    passed: Optional[bool] = Field(default=None, description="True if passed, False if failed, None if skipped/not attempted")
    skipped: Optional[bool] = Field(default=False, description="True if candidate explicitly skipped this mission")
    attempts: Optional[int] = Field(default=None, description="Number of attempts taken to pass")


class CandidateSignals(BaseModel):
    """Aggregate engagement and performance signals."""

    commitDays: Optional[int] = Field(default=0, description="Total days committed")
    missionsCompleted: Optional[int] = Field(default=0, description="Total missions completed")
    missionsFirstTry: Optional[int] = Field(default=0, description="Missions passed on first try")


class CandidateProfile(BaseModel):
    """Full candidate profile from candidates.json or API payload."""

    member: CandidateMember = Field(..., description="Member demographics and profile")
    missions: List[CandidateMission] = Field(default_factory=list, description="List of recorded missions")
    signals: Optional[CandidateSignals] = Field(default=None, description="Cohort engagement signals")


class CandidateModel(BaseModel):
    """
    Deterministic candidate assessment model computed at session initialization.
    Categorizes topics based strictly on historical mission performance.
    """

    candidate_id: str = Field(..., description="Unique candidate ID")
    name: str = Field(..., description="Candidate name")
    job_role: str = Field(..., description="Candidate job role")
    years_experience: Union[int, float] = Field(..., description="Candidate experience")
    education: str = Field(..., description="Candidate education")

    strong_days: List[int] = Field(
        default_factory=list,
        description="Days passed on 1-2 attempts (high confidence areas)",
    )
    uncertain_days: List[int] = Field(
        default_factory=list,
        description="Days passed with 3+ attempts (potential struggle areas)",
    )
    weak_days: List[int] = Field(
        default_factory=list,
        description="Days failed (passed == False, highest priority for probing)",
    )
    skipped_days: List[int] = Field(
        default_factory=list,
        description="Days explicitly skipped (hard-excluded from interview)",
    )
    untracked_days: List[int] = Field(
        default_factory=list,
        description="Days with no recorded mission signal",
    )
    mastery_ratio: float = Field(
        default=0.0,
        description="Ratio of first-try completions to total completed missions",
    )
    eligible_days: List[int] = Field(
        default_factory=list,
        description="Universe of eligible days: strong + uncertain + weak (strictly excludes skipped & untracked)",
    )

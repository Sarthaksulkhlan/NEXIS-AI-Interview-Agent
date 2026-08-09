"""
Candidate service: deterministically models candidate profiles and categorizes curriculum days.
Zero LLM calls for classification. Excludes skipped topics, prioritizes failed topics.
"""

import json
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional
from ..models.candidate import (
    CandidateMember,
    CandidateMission,
    CandidateModel,
    CandidateProfile,
    CandidateSignals,
)
from ..models.curriculum import CurriculumDay
from .curriculum_service import curriculum_service
from ..config import settings

logger = logging.getLogger(__name__)


class CandidateService:
    """Service to parse, validate, and build deterministic candidate models."""

    def __init__(self, candidates_path: Optional[Path] = None):
        self.candidates_path = candidates_path or settings.CANDIDATES_PATH
        self.candidates_catalog: Dict[str, CandidateProfile] = {}
        self.load_catalog()

    def load_catalog(self) -> None:
        """Loads candidates.json if present for convenience and testing."""
        if not self.candidates_path.exists():
            logger.warning(f"Candidates file not found at {self.candidates_path}.")
            return

        try:
            with open(self.candidates_path, "r", encoding="utf-8") as f:
                raw_data = json.load(f)

            candidates_list = raw_data.get("candidates", [])
            for item in candidates_list:
                profile = CandidateProfile.model_validate(item)
                self.candidates_catalog[profile.member.id] = profile
                self.candidates_catalog[profile.member.name.lower()] = profile

            logger.info(f"Loaded {len(candidates_list)} candidates from catalog.")
        except Exception as e:
            logger.warning(f"Could not load candidates catalog: {e}")

    def get_candidate_by_id_or_name(self, query: str) -> Optional[CandidateProfile]:
        """Looks up a candidate from catalog by ID or lowercase name."""
        return self.candidates_catalog.get(query) or self.candidates_catalog.get(query.lower())

    def build_candidate_model(self, raw_candidate: Any) -> CandidateModel:
        """
        Deterministically builds a CandidateModel from raw dict or CandidateProfile.

        Rules:
        - Skipped topics (skipped == True) MUST be hard-excluded.
        - Failed topics (passed == False) are weak_days and prioritized.
        - Passed with <= 2 attempts are strong_days.
        - Passed with >= 3 attempts are uncertain_days.
        - Curriculum days with no mission record are untracked_days.
        - Eligible days = strong_days + uncertain_days + weak_days.
        """
        profile: CandidateProfile

        if isinstance(raw_candidate, CandidateProfile):
            profile = raw_candidate
        elif isinstance(raw_candidate, dict):
            # Check if this is an ID string or object referencing candidate catalog
            if "member" in raw_candidate:
                profile = CandidateProfile.model_validate(raw_candidate)
            elif "id" in raw_candidate and raw_candidate["id"] in self.candidates_catalog:
                profile = self.candidates_catalog[raw_candidate["id"]]
            else:
                raise ValueError(
                    "Invalid candidate payload. Provide a complete profile with 'member', "
                    "'missions', and 'signals', or a known candidate ID."
                )
        else:
            raise ValueError(f"Invalid candidate payload type: {type(raw_candidate)}")

        all_curriculum_days = set(curriculum_service.get_all_days())
        missions = profile.missions

        strong_days: List[int] = []
        uncertain_days: List[int] = []
        weak_days: List[int] = []
        skipped_days: List[int] = []
        mission_days: set[int] = set()

        for m in missions:
            mission_days.add(m.day)
            # Skipped topics are hard-excluded
            if m.skipped is True:
                skipped_days.append(m.day)
                continue

            # Explicit failure (passed == False)
            if m.passed is False:
                weak_days.append(m.day)
                continue

            # Passed topics categorized by attempt count
            if m.passed is True:
                attempts = m.attempts if m.attempts is not None else 1
                if attempts <= 2:
                    strong_days.append(m.day)
                else:
                    uncertain_days.append(m.day)

        # Untracked days have no mission signal
        untracked_days = sorted(list(all_curriculum_days - mission_days))

        # Eligible days for interview questioning
        eligible_days = sorted(list(set(strong_days + uncertain_days + weak_days)))

        # Mastery ratio calculation
        if profile.signals and profile.signals.missionsCompleted and profile.signals.missionsCompleted > 0:
            first_try = profile.signals.missionsFirstTry or 0
            completed = profile.signals.missionsCompleted
            mastery_ratio = round(first_try / max(completed, 1), 3)
        elif eligible_days:
            mastery_ratio = round(len(strong_days) / max(len(eligible_days), 1), 3)
        else:
            mastery_ratio = 0.5

        candidate_model = CandidateModel(
            candidate_id=profile.member.id,
            name=profile.member.name,
            job_role=profile.member.jobRole,
            years_experience=profile.member.yearsExperience,
            education=profile.member.education,
            strong_days=sorted(strong_days),
            uncertain_days=sorted(uncertain_days),
            weak_days=sorted(weak_days),
            skipped_days=sorted(skipped_days),
            untracked_days=sorted(untracked_days),
            mastery_ratio=mastery_ratio,
            eligible_days=eligible_days,
        )

        logger.info(
            f"Built candidate model for {candidate_model.name} ({candidate_model.candidate_id}): "
            f"eligible={len(eligible_days)}, weak={len(weak_days)}, "
            f"uncertain={len(uncertain_days)}, strong={len(strong_days)}, "
            f"skipped={len(skipped_days)}, untracked={len(untracked_days)}, "
            f"mastery_ratio={mastery_ratio}"
        )

        return candidate_model


# Global singleton instance
candidate_service = CandidateService()

"""
Coverage tracker service: maintains a flat per-day objective checklist.
Grounded directly in curriculum.json — no invented concept graphs or hallucinated nodes.
"""

from typing import List, Set
from ..models.curriculum import CurriculumDay
from ..models.interview import DayCoverage, DifficultyLevel
from ..config import settings


class CoverageTrackerService:
    """Manages flat per-day coverage records and follow-up depth limits."""

    @staticmethod
    def initialize_day_coverage(
        curriculum_day: CurriculumDay,
        difficulty: DifficultyLevel = DifficultyLevel.BEGINNER,
    ) -> DayCoverage:
        """
        Initializes a DayCoverage record for a curriculum day when selected.
        Objectives are copied verbatim from the curriculum.
        """
        return DayCoverage(
            day=curriculum_day.day,
            title=curriculum_day.title,
            type=curriculum_day.type,
            objectives=list(curriculum_day.objectives),
            addressed=set(),
            follow_up_depth=0,
            difficulty_here=difficulty,
        )

    # Alias for backward compatibility
    init_day_coverage = initialize_day_coverage

    @staticmethod
    def mark_objectives_addressed(
        coverage: DayCoverage,
        addressed_indices: List[int],
    ) -> None:
        """
        Marks valid 0-based objective indices as addressed after answer evaluation.
        Protects against invalid out-of-bounds indices (e.g. index 100).
        """
        total = len(coverage.objectives)
        for idx in addressed_indices:
            if isinstance(idx, int) and 0 <= idx < total:
                coverage.addressed.add(idx)

    @staticmethod
    def is_day_complete(coverage: DayCoverage) -> bool:
        """
        Returns True if all objectives on this day have been addressed,
        or if at least 60% of objectives are addressed and at least one follow-up has occurred.
        """
        if not coverage.objectives:
            return True

        total = len(coverage.objectives)
        addressed_count = len(coverage.addressed)

        if addressed_count >= total:
            return True
        if addressed_count >= max(2, int(total * 0.6)) and coverage.follow_up_depth >= 1:
            return True

        return False

    @staticmethod
    def get_unaddressed_objectives(coverage: DayCoverage) -> List[int]:
        """Returns 0-based indices of curriculum objectives that have not yet been addressed."""
        total = len(coverage.objectives)
        return [i for i in range(total) if i not in coverage.addressed]

    @staticmethod
    def can_followup(
        coverage: DayCoverage,
        max_followups: int = settings.MAX_FOLLOWUPS_PER_DAY,
    ) -> bool:
        """
        Determines whether further follow-up questioning is allowed on this day
        without exceeding the follow-up cap (default: 2 follow-ups max, for 3 total questions max).
        """
        return coverage.follow_up_depth < max_followups

    @staticmethod
    def increment_followup_depth(coverage: DayCoverage) -> int:
        """Increments and returns the follow-up count on this day."""
        coverage.follow_up_depth += 1
        return coverage.follow_up_depth

    # Alias for backward compatibility
    increment_followup = increment_followup_depth

    @staticmethod
    def get_followup_depth(coverage: DayCoverage) -> int:
        """Returns current follow-up depth for this day."""
        return coverage.follow_up_depth


coverage_tracker = CoverageTrackerService()

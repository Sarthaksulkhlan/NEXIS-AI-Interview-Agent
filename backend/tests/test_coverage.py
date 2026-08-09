"""
Unit tests for flat per-day coverage tracker and follow-up caps.
"""

from app.models.interview import DifficultyLevel
from app.services.curriculum_service import curriculum_service
from app.services.coverage_tracker import coverage_tracker


def test_coverage_initialization():
    """Verify DayCoverage is initialized directly with curriculum objectives."""
    day_8 = curriculum_service.get_day(8)
    assert day_8 is not None

    cov = coverage_tracker.init_day_coverage(day_8, DifficultyLevel.INTERMEDIATE)
    assert cov.day == 8
    assert cov.title == "Vector Databases Overview"
    assert len(cov.objectives) == 5
    assert len(cov.addressed) == 0
    assert cov.follow_up_depth == 0
    assert cov.difficulty_here == DifficultyLevel.INTERMEDIATE


def test_mark_objectives_addressed():
    """Verify addressed objective indices are added to the set."""
    day_8 = curriculum_service.get_day(8)
    cov = coverage_tracker.init_day_coverage(day_8)

    coverage_tracker.mark_objectives_addressed(cov, [0, 2])
    assert cov.addressed == {0, 2}

    unaddressed = coverage_tracker.get_unaddressed_objectives(cov)
    assert unaddressed == [1, 3, 4]


def test_followup_cap_enforcement():
    """Verify follow-up cap prevents getting stuck on a single topic."""
    day_10 = curriculum_service.get_day(10)
    cov = coverage_tracker.init_day_coverage(day_10)

    assert coverage_tracker.can_followup(cov, max_followups=2) is True

    coverage_tracker.increment_followup(cov)  # depth = 1
    assert coverage_tracker.can_followup(cov, max_followups=2) is True

    coverage_tracker.increment_followup(cov)  # depth = 2
    assert coverage_tracker.can_followup(cov, max_followups=2) is False


def test_day_completeness():
    """Verify day completeness logic."""
    day_7 = curriculum_service.get_day(7)
    cov = coverage_tracker.init_day_coverage(day_7)

    # Initially not complete
    assert coverage_tracker.is_day_complete(cov) is False

    # Mark 4 out of 5 objectives and 1 follow-up
    coverage_tracker.mark_objectives_addressed(cov, [0, 1, 2, 3])
    cov.follow_up_depth = 1
    assert coverage_tracker.is_day_complete(cov) is True

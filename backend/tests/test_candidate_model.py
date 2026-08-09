"""
Unit tests for deterministic candidate modeling.
Verifies topic categorization, excluded skipped days, identified failed days, and mastery ratio.
"""

import pytest
from app.models.candidate import CandidateProfile
from app.services.candidate_service import candidate_service
from app.services.curriculum_service import curriculum_service


def test_candidate_catalog_loaded():
    """Verify candidate catalog loaded all 20 candidates."""
    catalog = candidate_service.candidates_catalog
    assert len(catalog) >= 20, f"Expected at least 20 candidates, found {len(catalog)}"
    assert "CAND-001" in catalog
    assert "CAND-018" in catalog  # Diane Foster
    assert "CAND-010" in catalog  # Gerald Combs
    assert "CAND-011" in catalog  # Mia Alvarez


def test_diane_foster_strong_candidate():
    """
    Diane Foster (CAND-018):
    All attempts = 1, passed = true.
    Should have many strong days, 0 weak days, 0 skipped days, high mastery ratio.
    """
    profile = candidate_service.get_candidate_by_id_or_name("CAND-018")
    assert profile is not None

    model = candidate_service.build_candidate_model(profile)
    assert model.candidate_id == "CAND-018"
    assert model.name == "Diane Foster"
    assert len(model.strong_days) >= 8
    assert len(model.weak_days) == 0
    assert len(model.skipped_days) == 0
    assert model.mastery_ratio == 1.0  # 31 / 31
    assert all(d in model.eligible_days for d in model.strong_days)


def test_gerald_combs_weak_candidate():
    """
    Gerald Combs (CAND-010):
    Day 8 passed=false, Day 10 passed=false, Day 22 passed=false.
    Days 27, 28 skipped.
    """
    profile = candidate_service.get_candidate_by_id_or_name("CAND-010")
    assert profile is not None

    model = candidate_service.build_candidate_model(profile)
    assert model.candidate_id == "CAND-010"
    assert 8 in model.weak_days
    assert 10 in model.weak_days
    assert 22 in model.weak_days
    assert 27 in model.skipped_days
    assert 28 in model.skipped_days

    # Crucial: Skipped days MUST NEVER be in eligible_days
    assert 27 not in model.eligible_days
    assert 28 not in model.eligible_days

    # Weak days MUST be in eligible_days (for prioritized probing)
    assert 8 in model.eligible_days
    assert 10 in model.eligible_days
    assert 22 in model.eligible_days


def test_mia_alvarez_skipped_topics():
    """
    Mia Alvarez (CAND-011):
    Days 7, 8, 12, 16, 22 are explicitly skipped.
    """
    profile = candidate_service.get_candidate_by_id_or_name("CAND-011")
    assert profile is not None

    model = candidate_service.build_candidate_model(profile)
    assert model.candidate_id == "CAND-011"
    for skipped_day in [7, 8, 12, 16, 22]:
        assert skipped_day in model.skipped_days
        assert skipped_day not in model.eligible_days


def test_isabella_rossi_failures():
    """
    Isabella Rossi (CAND-016):
    Day 7 passed=false, Day 12 passed=false, Day 22 passed=false.
    Days 27, 28 skipped.
    """
    profile = candidate_service.get_candidate_by_id_or_name("CAND-016")
    assert profile is not None

    model = candidate_service.build_candidate_model(profile)
    assert 7 in model.weak_days
    assert 12 in model.weak_days
    assert 22 in model.weak_days
    assert 27 in model.skipped_days
    assert 28 in model.skipped_days
    assert 27 not in model.eligible_days
    assert 28 not in model.eligible_days


def test_custom_candidate_payload():
    """Test raw dictionary candidate parsing."""
    raw_payload = {
        "member": {
            "id": "CUSTOM-999",
            "name": "Jordan Lee",
            "jobRole": "MLOps Engineer",
            "yearsExperience": 4,
            "education": "BS Information Systems",
            "status": "COMPLETED",
        },
        "missions": [
            {"day": 8, "title": "Vector Databases", "passed": True, "attempts": 1},
            {"day": 10, "title": "Retrieval", "passed": False, "attempts": 3},
            {"day": 23, "title": "MCP", "skipped": True},
        ],
        "signals": {
            "commitDays": 20,
            "missionsCompleted": 2,
            "missionsFirstTry": 1,
        },
    }

    model = candidate_service.build_candidate_model(raw_payload)
    assert model.candidate_id == "CUSTOM-999"
    assert model.name == "Jordan Lee"
    assert model.strong_days == [8]
    assert model.weak_days == [10]
    assert model.skipped_days == [23]
    assert 23 not in model.eligible_days
    assert 10 in model.eligible_days
    assert 8 in model.eligible_days

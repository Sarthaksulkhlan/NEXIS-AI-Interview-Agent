"""
Unit tests for curriculum loading, validation, indexing, and error handling.
Does not use Windows temp directory fixtures to avoid OS permission errors.
"""

import json
import os
import shutil
import pytest
from pathlib import Path
from app.services.curriculum_service import CurriculumService, curriculum_service

SCRATCH_DIR = Path(__file__).resolve().parent / ".scratch_test_data"


@pytest.fixture(autouse=True)
def setup_teardown_scratch():
    """Creates local scratch folder inside project and cleans up after tests."""
    SCRATCH_DIR.mkdir(parents=True, exist_ok=True)
    yield
    if SCRATCH_DIR.exists():
        shutil.rmtree(SCRATCH_DIR, ignore_errors=True)


def test_curriculum_loaded_successfully():
    """Verify curriculum loaded 31 days and 8 modules."""
    assert len(curriculum_service.curriculum_by_day) == 31
    assert len(curriculum_service.modules) == 8
    all_days = curriculum_service.get_all_days()
    assert all_days == list(range(1, 32))


def test_curriculum_day_lookup():
    """Verify O(1) day lookup."""
    day_8 = curriculum_service.get_day(8)
    assert day_8 is not None
    assert day_8.day == 8
    assert day_8.title == "Vector Databases Overview"
    assert day_8.type == "BUILD"
    assert "ChromaDB" in day_8.tools
    assert len(day_8.objectives) == 5

    # Non-existent day returns None
    assert curriculum_service.get_day(999) is None
    assert curriculum_service.get_day(-1) is None


def test_curriculum_module_lookup():
    """Verify module lookup for a day."""
    mod = curriculum_service.get_module_for_day(8)
    assert mod is not None
    assert mod.title == "Embeddings & Vector Search"
    assert mod.days == [7, 10]


def test_curriculum_missing_file_error():
    """Verify FileNotFoundError on missing curriculum file."""
    fake_path = SCRATCH_DIR / "nonexistent.json"
    with pytest.raises(FileNotFoundError):
        CurriculumService(curriculum_path=fake_path)


def test_curriculum_invalid_json_error():
    """Verify ValueError on corrupted JSON syntax."""
    bad_json_path = SCRATCH_DIR / "bad.json"
    bad_json_path.write_text("{ this is not valid json }", encoding="utf-8")
    with pytest.raises(ValueError):
        CurriculumService(curriculum_path=bad_json_path)


def test_curriculum_duplicate_day_detection():
    """Verify duplicate day detection."""
    data = {
        "cohort": "Test Cohort",
        "modules": [{"n": 1, "title": "Test", "days": [1, 2]}],
        "days": [
            {
                "day": 1,
                "title": "Day 1",
                "type": "SETUP",
                "tools": ["Python"],
                "objectives": ["Obj 1"],
            },
            {
                "day": 1,  # Duplicate!
                "title": "Day 1 Duplicate",
                "type": "SETUP",
                "tools": ["Python"],
                "objectives": ["Obj 2"],
            },
        ],
    }
    dup_path = SCRATCH_DIR / "dup.json"
    dup_path.write_text(json.dumps(data), encoding="utf-8")
    with pytest.raises(ValueError, match="Duplicate curriculum day"):
        CurriculumService(curriculum_path=dup_path)

"""
Curriculum service: loads, validates, and indexes curriculum.json once at startup.
Direct dictionary lookup by integer day number. Zero embeddings, zero vector search.
"""

import json
import logging
from pathlib import Path
from typing import Dict, List, Optional
from ..models.curriculum import CurriculumData, CurriculumDay, CurriculumModule
from ..config import settings

logger = logging.getLogger(__name__)


class CurriculumService:
    """
    In-memory curriculum index service.
    Loads curriculum.json at startup and provides deterministic lookups.
    """

    def __init__(self, curriculum_path: Optional[Path] = None):
        self.curriculum_path = curriculum_path or settings.CURRICULUM_PATH
        self.curriculum_data: Optional[CurriculumData] = None
        self.curriculum_by_day: Dict[int, CurriculumDay] = {}
        self.modules: List[CurriculumModule] = []
        self.dependency_chain: List[int] = []
        self.load_curriculum()

    def load_curriculum(self, custom_path: Optional[Path] = None) -> None:
        """
        Reads curriculum JSON once, validates against Pydantic model,
        and constructs dictionary indexed by day number.
        Fails clearly if curriculum is missing, malformed, or has duplicate/invalid days.
        """
        target_path = custom_path or self.curriculum_path
        if not target_path.exists():
            raise FileNotFoundError(
                f"Curriculum data file not found at {target_path}. "
                f"Ensure curriculum.json is located in the data directory."
            )

        try:
            with open(target_path, "r", encoding="utf-8") as f:
                raw_data = json.load(f)
        except json.JSONDecodeError as e:
            raise ValueError(f"Invalid JSON format in curriculum file {target_path}: {e}") from e

        # Validate structure against Pydantic schema
        self.curriculum_data = CurriculumData.model_validate(raw_data)

        # Validate duplicate and invalid day numbers
        seen_days = set()
        day_dict: Dict[int, CurriculumDay] = {}

        for day_obj in self.curriculum_data.days:
            day_num = day_obj.day
            if not isinstance(day_num, int) or day_num < 1 or day_num > 31:
                raise ValueError(f"Invalid day number {day_num}. Day numbers must be integers between 1 and 31.")
            if day_num in seen_days:
                raise ValueError(f"Duplicate curriculum day detected: Day {day_num} appears multiple times.")
            seen_days.add(day_num)
            day_dict[day_num] = day_obj

        # Build direct day index (read-only from application logic)
        self.curriculum_by_day = day_dict
        self.modules = self.curriculum_data.modules
        self.dependency_chain = sorted(self.curriculum_by_day.keys())

        logger.info(
            f"Curriculum loaded successfully: {len(self.curriculum_by_day)} days across "
            f"{len(self.modules)} modules from {target_path.name}."
        )

    def get_day(self, day_number: int) -> Optional[CurriculumDay]:
        """Direct O(1) lookup of a curriculum day by day number."""
        return self.curriculum_by_day.get(day_number)

    def get_all_days(self) -> List[int]:
        """Returns all valid curriculum day numbers in natural dependency order."""
        return list(self.dependency_chain)

    def get_module_for_day(self, day_number: int) -> Optional[CurriculumModule]:
        """Returns the module encompassing the given day number."""
        for mod in self.modules:
            if len(mod.days) == 2 and mod.days[0] <= day_number <= mod.days[1]:
                return mod
        return None

    def get_adjacent_eligible_days(
        self,
        current_day: int,
        eligible_days: List[int],
        already_asked: List[int],
    ) -> List[int]:
        """
        Returns eligible days sorted by dependency closeness to the current day,
        prioritizing days not yet asked.
        """
        unasked = [d for d in eligible_days if d not in already_asked]
        pool = unasked if unasked else [d for d in eligible_days if d != current_day]
        return sorted(pool, key=lambda d: abs(d - current_day))


# Global singleton instance loaded once at startup
curriculum_service = CurriculumService()

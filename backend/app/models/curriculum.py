"""
Curriculum Pydantic schemas.
"""

from typing import List
from pydantic import BaseModel, Field


class CurriculumDay(BaseModel):
    """Represents a single day/unit in the curriculum."""

    day: int = Field(..., description="Day number (1-31)")
    title: str = Field(..., description="Title of the topic/day")
    type: str = Field(..., description="Day type: SETUP, BUILD, AI_CORE, SHIP_IT, LEARN, OPTIMIZE, CAPSTONE")
    tools: List[str] = Field(default_factory=list, description="Tools/technologies used on this day")
    objectives: List[str] = Field(..., min_length=1, description="Specific learning objectives for this day")


class CurriculumModule(BaseModel):
    """Represents a grouping module of days."""

    n: int = Field(..., description="Module number")
    title: str = Field(..., description="Module title")
    days: List[int] = Field(..., description="Start and end day index range [start, end]")


class CurriculumData(BaseModel):
    """Root model for the loaded curriculum JSON."""

    cohort: str = Field(..., description="Cohort metadata description")
    modules: List[CurriculumModule] = Field(default_factory=list, description="List of modules")
    days: List[CurriculumDay] = Field(..., min_length=1, description="List of all curriculum days")

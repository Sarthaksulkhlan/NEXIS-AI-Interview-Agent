"""Structured, non-diagnostic interview integrity event models."""

from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field, field_validator


class IntegrityEventType(str, Enum):
    TAB_HIDDEN = "TAB_HIDDEN"
    WINDOW_BLUR = "WINDOW_BLUR"
    FULLSCREEN_EXITED = "FULLSCREEN_EXITED"
    CAMERA_DISABLED = "CAMERA_DISABLED"
    CAMERA_INTERRUPTED = "CAMERA_INTERRUPTED"
    CAMERA_RECONNECTED = "CAMERA_RECONNECTED"
    MIC_DISABLED = "MIC_DISABLED"
    MIC_INTERRUPTED = "MIC_INTERRUPTED"
    MIC_RECONNECTED = "MIC_RECONNECTED"
    CANDIDATE_NOT_VISIBLE = "CANDIDATE_NOT_VISIBLE"
    COPY_EVENT = "COPY_EVENT"
    PASTE_EVENT = "PASTE_EVENT"


class IntegritySource(str, Enum):
    BROWSER = "browser"
    MEDIA = "media"
    VISION = "vision"


class RiskLevel(str, Enum):
    NORMAL = "NORMAL"
    LOW = "LOW RISK"
    MEDIUM = "MEDIUM RISK"
    HIGH = "HIGH RISK"


class IntegrityEventInput(BaseModel):
    event_type: IntegrityEventType
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    duration_seconds: Optional[float] = Field(default=None, ge=0, le=3600)
    metadata: Dict[str, Any] = Field(default_factory=dict)

    @field_validator("metadata")
    @classmethod
    def limit_metadata(cls, value: Dict[str, Any]) -> Dict[str, Any]:
        allowed = {"question_id", "track_kind", "reason"}
        return {key: value[key] for key in allowed if key in value}


class IntegrityEvent(BaseModel):
    id: int
    event_type: IntegrityEventType
    timestamp: datetime
    duration_seconds: Optional[float] = None
    severity: str
    source: IntegritySource
    metadata: Dict[str, Any] = Field(default_factory=dict)


class IntegritySummary(BaseModel):
    risk_level: RiskLevel
    risk_score: int = Field(ge=0, le=100)
    event_count: int = Field(ge=0)
    reasons: List[str] = Field(default_factory=list)
    events: List[IntegrityEvent] = Field(default_factory=list)
    review_required: bool = False


class IntegrityEventResponse(BaseModel):
    event: IntegrityEvent
    summary: IntegritySummary

"""Server-owned event validation, storage, and deterministic risk aggregation."""

from collections import Counter
from datetime import datetime, timezone
from typing import Dict, List

from ..models.integrity import (
    IntegrityEvent, IntegrityEventInput, IntegrityEventType, IntegritySource,
    IntegritySummary, RiskLevel,
)


POLICY = {
    IntegrityEventType.TAB_HIDDEN: (6, "low", IntegritySource.BROWSER),
    IntegrityEventType.WINDOW_BLUR: (2, "low", IntegritySource.BROWSER),
    IntegrityEventType.FULLSCREEN_EXITED: (4, "low", IntegritySource.BROWSER),
    IntegrityEventType.CAMERA_DISABLED: (12, "medium", IntegritySource.MEDIA),
    IntegrityEventType.CAMERA_INTERRUPTED: (6, "low", IntegritySource.MEDIA),
    IntegrityEventType.CAMERA_RECONNECTED: (0, "informational", IntegritySource.MEDIA),
    IntegrityEventType.MIC_DISABLED: (10, "medium", IntegritySource.MEDIA),
    IntegrityEventType.MIC_INTERRUPTED: (5, "low", IntegritySource.MEDIA),
    IntegrityEventType.MIC_RECONNECTED: (0, "informational", IntegritySource.MEDIA),
    IntegrityEventType.CANDIDATE_NOT_VISIBLE: (8, "low", IntegritySource.VISION),
    IntegrityEventType.COPY_EVENT: (1, "low", IntegritySource.BROWSER),
    IntegrityEventType.PASTE_EVENT: (3, "low", IntegritySource.BROWSER),
}


class IntegrityRiskAggregator:
    """Transparent policy: base weight + duration + repetition, capped at 100."""

    def aggregate(self, events: List[IntegrityEvent]) -> IntegritySummary:
        counts = Counter(event.event_type for event in events)
        score = 0
        contributions: Counter[IntegrityEventType] = Counter()
        for event in events:
            base = POLICY[event.event_type][0]
            duration = event.duration_seconds or 0
            duration_points = min(12, int(duration // 5)) if base else 0
            repetition_points = min(10, max(0, counts[event.event_type] - 1) * 2) if base else 0
            points = base + duration_points + repetition_points
            score += points
            contributions[event.event_type] += points
        score = min(100, score)
        level = RiskLevel.NORMAL if score < 5 else RiskLevel.LOW if score < 20 else RiskLevel.MEDIUM if score < 50 else RiskLevel.HIGH
        reasons = [
            f"{kind.value.replace('_', ' ').title()}: {counts[kind]} event(s), {points} point(s)"
            for kind, points in contributions.most_common() if points > 0
        ]
        return IntegritySummary(
            risk_level=level, risk_score=score, event_count=len(events), reasons=reasons,
            events=events, review_required=level == RiskLevel.HIGH,
        )


class IntegrityService:
    def __init__(self) -> None:
        self._events: Dict[str, List[IntegrityEvent]] = {}
        self.aggregator = IntegrityRiskAggregator()

    def record(self, session_id: str, raw: IntegrityEventInput) -> IntegrityEvent:
        now = datetime.now(timezone.utc)
        timestamp = raw.timestamp if raw.timestamp.tzinfo else raw.timestamp.replace(tzinfo=timezone.utc)
        if abs((now - timestamp.astimezone(timezone.utc)).total_seconds()) > 300:
            timestamp = now
        base, severity, source = POLICY[raw.event_type]
        events = self._events.setdefault(session_id, [])
        event = IntegrityEvent(
            id=len(events) + 1, event_type=raw.event_type, timestamp=timestamp,
            duration_seconds=raw.duration_seconds, severity=severity, source=source,
            metadata=raw.metadata,
        )
        events.append(event)
        return event

    def summary(self, session_id: str) -> IntegritySummary:
        return self.aggregator.aggregate(list(self._events.get(session_id, [])))

    def clear(self, session_id: str) -> None:
        self._events.pop(session_id, None)


integrity_service = IntegrityService()

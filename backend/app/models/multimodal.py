"""
Multimodal data models for video, audio, and speech delivery analysis.
Strictly adheres to privacy and non-invasive observable communication guidelines.
"""

from typing import List, Optional
from pydantic import BaseModel, Field
from .evaluation import AnswerEvaluation, EvaluationPattern, EvaluationScores
from .interview import FeedbackReport


class AudioAnalysis(BaseModel):
    """Observable speech and audio delivery signals."""

    duration_seconds: float = Field(default=0.0, description="Duration of candidate speech in seconds")
    speech_detected: bool = Field(default=True, description="Whether verbal speech was detected in the audio track")
    words_count: int = Field(default=0, description="Total word count in spoken response")
    speaking_rate_wpm: Optional[float] = Field(default=None, description="Words per minute speaking cadence")


class VideoAnalysis(BaseModel):
    """Observable presentation and camera signals (no sensitive facial profiling)."""

    camera_available: bool = Field(default=True, description="Whether camera video stream was captured")
    candidate_visible: bool = Field(default=True, description="Whether candidate is observable in frame")
    frame_count_sampled: int = Field(default=0, description="Number of sampled frames analyzed")
    duration_seconds: float = Field(default=0.0, description="Total video response duration")
    frame_quality_ok: bool = Field(default=True, description="Whether visual clarity and lighting are adequate")
    presentation_notes: Optional[str] = Field(
        default=None,
        description="Observable communication and delivery observations",
    )


class MultimodalResponseEvaluation(BaseModel):
    """Combined multimodal evaluation returned after processing a video/audio turn."""

    transcript: str = Field(..., description="Transcribed candidate speech")
    technical_evaluation: AnswerEvaluation = Field(..., description="Curriculum-grounded technical evaluation")
    audio_analysis: AudioAnalysis = Field(default_factory=AudioAnalysis, description="Audio signals")
    video_analysis: VideoAnalysis = Field(default_factory=VideoAnalysis, description="Video presentation signals")
    communication_feedback: Optional[str] = Field(
        default=None,
        description="Observable presentation and delivery feedback",
    )


class MultimodalInterviewResponse(BaseModel):
    """API response for video interview turns."""

    reply: str = Field(..., description="Interviewer response or next question")
    done: bool = Field(default=False, description="True when interview is complete")
    multimodal_analysis: Optional[MultimodalResponseEvaluation] = Field(
        default=None,
        description="Detailed multimodal analysis of the submitted video response",
    )
    feedback: Optional[FeedbackReport] = Field(
        default=None,
        description="Final feedback report if interview is complete",
    )

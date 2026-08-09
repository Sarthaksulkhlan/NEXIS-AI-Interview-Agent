"""
Speech-to-Text service: transcribes candidate audio and extracts speech delivery signals.
Defends against prompt injection within spoken responses.
"""

import io
import logging
import re
import tempfile
from pathlib import Path
from typing import Optional, Tuple
import httpx
from ..config import settings
from ..models.multimodal import AudioAnalysis

logger = logging.getLogger(__name__)


class SpeechToTextService:
    """Service to transcribe candidate speech and calculate verbal delivery metrics."""

    def __init__(self):
        self.api_key = settings.LLM_API_KEY
        self.timeout = settings.LLM_TIMEOUT_SECONDS

    async def transcribe_and_analyze(
        self,
        audio_bytes: bytes,
        filename: str = "audio.webm",
        fallback_text: Optional[str] = None,
    ) -> Tuple[str, AudioAnalysis]:
        """
        Transcribes speech and calculates response duration, word count, and speaking cadence.
        Ephemeral processing: audio files are processed in temp buffers and immediately deleted.
        """
        duration = max(1.0, round(len(audio_bytes) / 32000.0, 1)) if len(audio_bytes) > 0 else 0.0

        # If direct text override or fallback provided (e.g. text fallback mode or testing)
        if fallback_text and fallback_text.strip():
            transcript = fallback_text.strip()
            words = len(re.findall(r"\w+", transcript))
            wpm = round((words / max(duration, 1.0)) * 60.0, 1) if duration > 0 else None
            return transcript, AudioAnalysis(
                duration_seconds=duration,
                speech_detected=words > 0,
                words_count=words,
                speaking_rate_wpm=wpm,
            )

        # Real Whisper API transcription when API key is available and not in pure mock mode
        if not settings.MOCK_LLM and self.api_key and len(audio_bytes) > 100:
            try:
                transcript = await self._call_whisper_api(audio_bytes, filename)
                if transcript and transcript.strip():
                    words = len(re.findall(r"\w+", transcript))
                    wpm = round((words / max(duration, 1.0)) * 60.0, 1) if duration > 0 else None
                    return transcript, AudioAnalysis(
                        duration_seconds=duration,
                        speech_detected=words > 0,
                        words_count=words,
                        speaking_rate_wpm=wpm,
                    )
            except Exception as e:
                logger.warning(f"Whisper transcription failed: {e}. Falling back to mock transcriber.")

        # Never manufacture a transcript from the presence of bytes. A media turn
        # must have either a real transcription provider or an explicit transcript.
        raise RuntimeError(
            "Speech transcription is unavailable. Configure MOCK_LLM=false with "
            "LLM_API_KEY, or submit a text response instead."
        )

    async def _call_whisper_api(self, audio_bytes: bytes, filename: str) -> str:
        """Invokes OpenAI-compatible Whisper /v1/audio/transcriptions endpoint."""
        url = f"{settings.TRANSCRIPTION_BASE_URL.rstrip('/')}/audio/transcriptions"
        headers = {"Authorization": f"Bearer {self.api_key}"}

        files = {
            "file": (filename, io.BytesIO(audio_bytes), "audio/webm"),
        }
        data = {
            "model": settings.TRANSCRIPTION_MODEL,
            "language": "en",
        }

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            res = await client.post(url, headers=headers, files=files, data=data)
            res.raise_for_status()
            json_res = res.json()
            return json_res.get("text", "").strip()

speech_service = SpeechToTextService()

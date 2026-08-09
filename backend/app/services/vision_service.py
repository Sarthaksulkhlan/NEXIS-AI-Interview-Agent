"""
Vision Analysis service: analyzes observable presentation and video stream signals.
Strict ethical boundary: NO emotion detection, NO personality profiling, NO psychological profiling.
Extracts strictly observable properties: camera functioning, candidate visibility, frame stability, and duration.
All video frames and temporary files are immediately and ephemerally cleaned up.
"""

import io
import logging
import os
import tempfile
from typing import List, Optional, Tuple
import cv2
import numpy as np
from ..models.multimodal import VideoAnalysis

logger = logging.getLogger(__name__)


class VisionAnalysisService:
    """Service to sample video keyframes and extract observable presentation properties."""

    def analyze_video(
        self,
        video_bytes: bytes,
        filename: str = "video.webm",
    ) -> VideoAnalysis:
        """
        Samples video keyframes from bytes buffer and calculates observable presentation metrics.
        Guarantees immediate cleanup of temporary media files.
        """
        if not video_bytes or len(video_bytes) < 100:
            return VideoAnalysis(
                camera_available=False,
                candidate_visible=False,
                frame_count_sampled=0,
                duration_seconds=0.0,
                frame_quality_ok=False,
                presentation_notes="No active video stream detected.",
            )

        # Write to secure temporary file for OpenCV frame decoding
        temp_fd, temp_path = tempfile.mkstemp(suffix=".webm")
        try:
            with os.fdopen(temp_fd, "wb") as f:
                f.write(video_bytes)

            cap = cv2.VideoCapture(temp_path)
            if not cap.isOpened():
                # Bytes alone do not prove that a camera or candidate was visible.
                duration = round(len(video_bytes) / 64000.0, 1)
                return VideoAnalysis(
                    camera_available=False,
                    candidate_visible=False,
                    frame_count_sampled=0,
                    duration_seconds=max(1.0, duration),
                    frame_quality_ok=False,
                    presentation_notes="The uploaded video could not be decoded for visual analysis.",
                )

            fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
            total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            duration = round(total_frames / fps, 1) if total_frames > 0 else max(1.0, len(video_bytes) / 64000.0)

            # Sample up to 3 evenly distributed frames across the video
            sample_indices = [
                int(total_frames * 0.25),
                int(total_frames * 0.50),
                int(total_frames * 0.75),
            ] if total_frames >= 4 else [0]

            brightness_scores: List[float] = []
            candidate_visible = False
            sampled_count = 0
            face_detector = cv2.CascadeClassifier(
                cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
            )

            for frame_idx in sample_indices:
                cap.set(cv2.CAP_PROP_POS_FRAMES, frame_idx)
                ret, frame = cap.read()
                if ret and frame is not None:
                    sampled_count += 1
                    # Convert to grayscale to evaluate ambient lighting & contrast
                    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
                    mean_val = float(np.mean(gray))
                    brightness_scores.append(mean_val)
                    faces = face_detector.detectMultiScale(
                        gray, scaleFactor=1.1, minNeighbors=5, minSize=(40, 40)
                    )
                    if len(faces) > 0:
                        candidate_visible = True

            cap.release()

            avg_brightness = np.mean(brightness_scores) if brightness_scores else 128.0
            quality_ok = 25.0 <= avg_brightness <= 245.0

            presentation_notes = (
                "A face was detected in sampled frames and lighting was suitable for analysis."
                if candidate_visible and quality_ok
                else "No face was detected in sampled frames, or lighting was unsuitable; this is an observable warning, not a cheating determination."
            )

            return VideoAnalysis(
                camera_available=True,
                candidate_visible=candidate_visible,
                frame_count_sampled=sampled_count,
                duration_seconds=duration,
                frame_quality_ok=quality_ok,
                presentation_notes=presentation_notes,
            )

        except Exception as e:
            logger.warning(f"Video analysis encountered decoding exception: {e}")
            duration = round(len(video_bytes) / 64000.0, 1)
            return VideoAnalysis(
                camera_available=False,
                candidate_visible=False,
                frame_count_sampled=0,
                duration_seconds=max(1.0, duration),
                frame_quality_ok=False,
                presentation_notes="Video analysis failed; no visibility conclusion was recorded.",
            )
        finally:
            # Ephemeral privacy guarantee: strictly remove temporary video file
            if os.path.exists(temp_path):
                try:
                    os.remove(temp_path)
                except OSError:
                    pass


vision_service = VisionAnalysisService()

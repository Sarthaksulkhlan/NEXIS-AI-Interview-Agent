import { CandidateRecord } from '../types';

export interface FeedbackReport {
  summary: string;
  strengths: string[];
  gaps: string[];
  next: string[];
}

export interface InterviewResponse {
  reply: string;
  done: boolean;
  feedback?: FeedbackReport | null;
  multimodal_analysis?: {
    transcript?: string;
  } | null;
}

export interface MessageItem {
  id: string;
  speaker: 'interviewer' | 'candidate';
  text: string;
  timestamp: string;
}

export interface SessionStateResponse {
  sessionId: string;
  phase: 'INTRO' | 'QUESTIONING' | 'WRAP_UP' | 'FEEDBACK' | 'DONE';
  current_day: number | null;
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  days_asked: number[];
  questions_asked: number;
  is_complete: boolean;
  coverage: Record<string, {
    day: number;
    title: string;
    type: string;
    objectives: string[];
  }>;
  question_log: Array<{
    id: number; day: number; topic: string; type: string; difficulty: string;
    text: string; is_followup: boolean; follow_up_reason?: string | null;
  }>;
  answer_log: Array<{
    question_id: number; day: number; text: string;
    evaluation: {
      addressed_objectives: number[];
      scores: Record<'correctness' | 'depth' | 'reasoning' | 'tradeoffs' | 'completeness', number>;
      pattern: string;
      rationale?: string | null;
    };
  }>;
  multimodal_log?: Array<{
    question_id: number;
    transcript: string;
    communication_feedback?: string | null;
    audio_analysis: { duration_seconds: number; speech_detected: boolean; words_count: number; speaking_rate_wpm?: number | null };
    video_analysis: { camera_available: boolean; candidate_visible: boolean; frame_count_sampled: number; frame_quality_ok: boolean; presentation_notes?: string | null };
  }>;
}

export type IntegrityEventType =
  | 'TAB_HIDDEN' | 'WINDOW_BLUR' | 'CAMERA_DISABLED' | 'CAMERA_INTERRUPTED'
  | 'CAMERA_RECONNECTED' | 'MIC_DISABLED' | 'MIC_INTERRUPTED' | 'MIC_RECONNECTED';

export interface IntegritySummary {
  risk_level: 'NORMAL' | 'LOW RISK' | 'MEDIUM RISK' | 'HIGH RISK';
  risk_score: number;
  event_count: number;
  reasons: string[];
  review_required: boolean;
}

const parseError = async (response: Response, fallback: string) => {
  try {
    const body = await response.json();
    if (body.detail) {
      if (typeof body.detail === 'string') return body.detail;
      if (Array.isArray(body.detail)) {
        return body.detail.map((e: any) => `${e.loc?.join('.')}: ${e.msg}`).join(' | ');
      }
    }
    return body.error || fallback;
  } catch {
    return fallback;
  }
};

const getBaseUrl = () => {
  // Use direct backend URL if provided via Vercel/Vite env vars (requires backend CORS).
  // Otherwise defaults to relative path, leveraging the local server.ts proxy.
  return import.meta.env?.VITE_INTERVIEW_BACKEND_URL || '';
};

export class InterviewApiService {
  static async startInterview(
    sessionId: string,
    candidate: CandidateRecord
  ): Promise<InterviewResponse> {
    // Map the local CandidateRecord to the exact schema the backend expects
    const backendCandidate = {
      member: {
        id: candidate.member.id,
        name: candidate.member.name,
        cohort: candidate.member.education || 'Unknown',
        github: candidate.member.name.toLowerCase().replace(/\s/g, '')
      },
      days_completed: candidate.missions.filter(m => m.passed || m.attempts && m.attempts > 0).map(m => m.day),
      strengths: ['Python', 'Software Engineering'], 
      focus_areas: [candidate.member.jobRole]
    };

    const response = await fetch(`${getBaseUrl()}/api/interview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, candidate: backendCandidate }),
    });

    if (!response.ok) {
      throw new Error(await parseError(response, 'Interview service unavailable. Please try again.'));
    }

    return (await response.json()) as InterviewResponse;
  }

  static async sendTurn(sessionId: string, message: string): Promise<InterviewResponse> {
    const response = await fetch(`${getBaseUrl()}/api/interview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, message }),
    });

    if (!response.ok) {
      throw new Error(await parseError(response, 'Interview service unavailable. Please try again.'));
    }

    return (await response.json()) as InterviewResponse;
  }

  static async getSessionState(sessionId: string): Promise<SessionStateResponse | null> {
    try {
      const response = await fetch(`${getBaseUrl()}/api/session/${encodeURIComponent(sessionId)}`);
      if (!response.ok) return null;
      const body = (await response.json()) as SessionStateResponse;
      return {
        ...body,
        // This additive field is absent from sessions produced by older/text-only
        // backend deployments. Absence means no recorded multimodal results.
        multimodal_log: body.multimodal_log ?? [],
      };
    } catch {
      return null;
    }
  }

  static async sendVideoTurn(sessionId: string, questionId: number, videoBlob: Blob): Promise<InterviewResponse> {
    const formData = new FormData();
    formData.append('sessionId', sessionId);
    formData.append('questionId', String(questionId));
    formData.append('video', videoBlob, 'recording.webm');

    const response = await fetch(`${getBaseUrl()}/api/interview/video`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(await parseError(response, 'Interview service unavailable. Please try again.'));
    }

    return (await response.json()) as InterviewResponse;
  }

  static async recordIntegrityEvent(
    sessionId: string,
    event_type: IntegrityEventType,
    metadata: Record<string, string | number> = {}
  ): Promise<IntegritySummary> {
    const response = await fetch(`${getBaseUrl()}/api/interview/${encodeURIComponent(sessionId)}/integrity/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_type, metadata }),
    });
    if (!response.ok) throw new Error(await parseError(response, 'Unable to record integrity signal.'));
    const body = await response.json();
    return body.summary as IntegritySummary;
  }

  static async getIntegritySummary(sessionId: string): Promise<IntegritySummary> {
    const response = await fetch(`${getBaseUrl()}/api/interview/${encodeURIComponent(sessionId)}/integrity`);
    if (!response.ok) throw new Error(await parseError(response, 'Unable to load integrity summary.'));
    return (await response.json()) as IntegritySummary;
  }
}

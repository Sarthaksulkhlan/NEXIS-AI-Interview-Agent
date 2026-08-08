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
}

const parseError = async (response: Response, fallback: string) => {
  try {
    const body = await response.json();
    return body.detail || body.error || fallback;
  } catch {
    return fallback;
  }
};

export class InterviewApiService {
  static async startInterview(
    sessionId: string,
    candidate: CandidateRecord
  ): Promise<InterviewResponse> {
    const response = await fetch('/api/interview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, candidate }),
    });

    if (!response.ok) {
      throw new Error(await parseError(response, 'Interview service unavailable. Please try again.'));
    }

    return (await response.json()) as InterviewResponse;
  }

  static async sendTurn(sessionId: string, message: string): Promise<InterviewResponse> {
    const response = await fetch('/api/interview', {
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
      const response = await fetch(`/api/session/${encodeURIComponent(sessionId)}`);
      if (!response.ok) return null;
      return (await response.json()) as SessionStateResponse;
    } catch {
      return null;
    }
  }

  static async sendVideoTurn(sessionId: string, videoBlob: Blob): Promise<InterviewResponse> {
    const formData = new FormData();
    formData.append('sessionId', sessionId);
    formData.append('video', videoBlob, 'recording.webm');

    const response = await fetch('/api/interview/video', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(await parseError(response, 'Interview service unavailable. Please try again.'));
    }

    return (await response.json()) as InterviewResponse;
  }
}

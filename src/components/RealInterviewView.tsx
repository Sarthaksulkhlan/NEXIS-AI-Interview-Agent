import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Bot, Camera, Check, Loader2, Mic, Send, Square, Terminal, UserRound, Video, Zap } from 'lucide-react';
import { CandidateProfile, CandidateRecord } from '../types';
import {
  FeedbackReport,
  InterviewApiService,
  MessageItem,
  SessionStateResponse,
} from '../services/interviewApi';

interface RealInterviewViewProps {
  candidate: CandidateProfile | null;
  onFeedbackReady: (feedback: FeedbackReport, sessionId: string) => void;
  onReturnHome: () => void;
}

const SELECTED_CANDIDATE_KEY = 'nexis:selectedCandidate';
const INTERVIEW_SESSION_KEY = 'nexis:interviewSessionId';
const INTERVIEW_MESSAGES_KEY = 'nexis:interviewMessages';

const newId = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;

const readStoredCandidate = (): CandidateRecord | null => {
  try {
    const raw = sessionStorage.getItem(SELECTED_CANDIDATE_KEY);
    return raw ? (JSON.parse(raw) as CandidateRecord) : null;
  } catch {
    return null;
  }
};

export const RealInterviewView: React.FC<RealInterviewViewProps> = ({
  candidate,
  onFeedbackReady,
  onReturnHome,
}) => {
  const candidateRecord = useMemo(
    () => candidate?.rawRecord || readStoredCandidate(),
    [candidate]
  );
  const [sessionId, setSessionId] = useState(() => sessionStorage.getItem(INTERVIEW_SESSION_KEY) || '');
  const [messages, setMessages] = useState<MessageItem[]>(() => {
    try {
      const raw = sessionStorage.getItem(INTERVIEW_MESSAGES_KEY);
      return raw ? (JSON.parse(raw) as MessageItem[]) : [];
    } catch {
      return [];
    }
  });
  const [answer, setAnswer] = useState('');
  const [sessionState, setSessionState] = useState<SessionStateResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [videoMode, setVideoMode] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraStatus, setCameraStatus] = useState<'idle' | 'ready' | 'denied'>('idle');
  const [microphoneStatus, setMicrophoneStatus] = useState<'idle' | 'ready' | 'denied'>('idle');
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const startedRef = useRef(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!sessionId || !messages.length || isComplete) return;
    const record = (eventType: 'TAB_HIDDEN' | 'WINDOW_BLUR') => {
      void InterviewApiService.recordIntegrityEvent(sessionId, eventType).catch(() => {
        setError('An interview integrity signal could not be recorded. Your interview can continue.');
      });
    };
    const onVisibility = () => { if (document.hidden) record('TAB_HIDDEN'); };
    const onBlur = () => record('WINDOW_BLUR');
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('blur', onBlur);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('blur', onBlur);
    };
  }, [isComplete, messages.length, sessionId]);

  useEffect(() => {
    sessionStorage.setItem(INTERVIEW_MESSAGES_KEY, JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    if (videoRef.current && cameraStream) {
      videoRef.current.srcObject = cameraStream;
    }
  }, [cameraStream, videoMode]);

  useEffect(() => {
    return () => {
      cameraStream?.getTracks().forEach((track) => track.stop());
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [cameraStream]);

  useEffect(() => {
    if (!candidateRecord || startedRef.current || messages.length > 0) return;
    startedRef.current = true;

    const sid = sessionId || newId();
    setSessionId(sid);
    sessionStorage.setItem(INTERVIEW_SESSION_KEY, sid);
    setIsLoading(true);
    setError(null);

    InterviewApiService.startInterview(sid, candidateRecord)
      .then(async (response) => {
        setMessages([
          {
            id: newId(),
            speaker: 'interviewer',
            text: response.reply,
            timestamp: new Date().toLocaleTimeString(),
          },
        ]);
        const state = await InterviewApiService.getSessionState(sid);
        if (state) setSessionState(state);
        if (response.done && response.feedback) {
          setIsComplete(true);
          onFeedbackReady(response.feedback, sid);
        }
      })
      .catch((reason: unknown) => {
        setError(reason instanceof Error ? reason.message : 'Interview service unavailable. Please try again.');
      })
      .finally(() => setIsLoading(false));
  }, [candidateRecord, messages.length, onFeedbackReady, sessionId]);

  const submitAnswer = async () => {
    const trimmed = answer.trim();
    if (!trimmed || isLoading || isComplete || !sessionId) return;

    const candidateMessage: MessageItem = {
      id: newId(),
      speaker: 'candidate',
      text: trimmed,
      timestamp: new Date().toLocaleTimeString(),
    };

    setMessages((items) => [...items, candidateMessage]);
    setAnswer('');
    setIsLoading(true);
    setError(null);

    try {
      const response = await InterviewApiService.sendTurn(sessionId, trimmed);
      setMessages((items) => [
        ...items,
        {
          id: newId(),
          speaker: 'interviewer',
          text: response.reply,
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);
      const state = await InterviewApiService.getSessionState(sessionId);
      if (state) setSessionState(state);

      if (response.done) {
        setIsComplete(true);
        if (response.feedback) {
          onFeedbackReady(response.feedback, sessionId);
        } else {
          setError('No interview feedback available.');
        }
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Interview service unavailable. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const enableCamera = async (): Promise<MediaStream | null> => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraStatus('denied');
      setError('Camera and microphone are not available in this browser.');
      return null;
    }

    try {
      const [videoResult, audioResult] = await Promise.allSettled([
        navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 640 }, height: { ideal: 420 } }, audio: false }),
        navigator.mediaDevices.getUserMedia({ video: false, audio: true }),
      ]);
      setCameraStatus(videoResult.status === 'fulfilled' ? 'ready' : 'denied');
      setMicrophoneStatus(audioResult.status === 'fulfilled' ? 'ready' : 'denied');
      if (videoResult.status === 'rejected' || audioResult.status === 'rejected') {
        if (videoResult.status === 'fulfilled') videoResult.value.getTracks().forEach((track) => track.stop());
        if (audioResult.status === 'fulfilled') audioResult.value.getTracks().forEach((track) => track.stop());
        const missing = [videoResult.status === 'rejected' ? 'camera' : '', audioResult.status === 'rejected' ? 'microphone' : ''].filter(Boolean).join(' and ');
        void Promise.allSettled([
          ...(videoResult.status === 'rejected' ? [InterviewApiService.recordIntegrityEvent(sessionId, 'CAMERA_DISABLED', { reason: 'permission_denied_or_unavailable' })] : []),
          ...(audioResult.status === 'rejected' ? [InterviewApiService.recordIntegrityEvent(sessionId, 'MIC_DISABLED', { reason: 'permission_denied_or_unavailable' })] : []),
        ]);
        setError(`The ${missing} could not be enabled. Check browser permissions and connected devices, or use a text response.`);
        return null;
      }
      const stream = new MediaStream([...videoResult.value.getVideoTracks(), ...audioResult.value.getAudioTracks()]);
      setCameraStream(stream);
      setCameraStatus('ready');
      setMicrophoneStatus('ready');
      setError(null);
      stream.getVideoTracks().forEach((track) => {
        track.addEventListener('ended', () => {
          setCameraStatus('denied');
          void InterviewApiService.recordIntegrityEvent(sessionId, 'CAMERA_INTERRUPTED', { track_kind: 'video' });
        });
      });
      stream.getAudioTracks().forEach((track) => {
        track.addEventListener('ended', () => {
          setMicrophoneStatus('denied');
          void InterviewApiService.recordIntegrityEvent(sessionId, 'MIC_INTERRUPTED', { track_kind: 'audio' });
        });
      });
      return stream;
    } catch (reason) {
      setCameraStatus('denied');
      setMicrophoneStatus('denied');
      const permissionDenied = reason instanceof DOMException && reason.name === 'NotAllowedError';
      setError(permissionDenied ? 'Media permission was denied. You can continue with a text response.' : 'Media devices are unavailable. You can continue with a text response.');
      void Promise.allSettled([
        InterviewApiService.recordIntegrityEvent(sessionId, 'CAMERA_DISABLED', { reason: permissionDenied ? 'permission_denied' : 'device_unavailable' }),
        InterviewApiService.recordIntegrityEvent(sessionId, 'MIC_DISABLED', { reason: permissionDenied ? 'permission_denied' : 'device_unavailable' }),
      ]);
      return null;
    }
  };

  const startRecording = async () => {
    if (isLoading || isComplete) return;
    let stream = cameraStream;

    if (!stream) {
      stream = await enableCamera();
    }

    if (!stream) return;

    chunksRef.current = [];
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')
      ? 'video/webm;codecs=vp8,opus'
      : 'video/webm';
    const recorder = new MediaRecorder(stream, { mimeType });

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunksRef.current.push(event.data);
    };
    recorder.onstop = () => {
      const videoBlob = new Blob(chunksRef.current, { type: 'video/webm' });
      void submitVideoAnswer(videoBlob);
    };

    recorderRef.current = recorder;
    recorder.start(500);
    setIsRecording(true);
    setRecordSeconds(0);
    timerRef.current = window.setInterval(() => setRecordSeconds((value) => value + 1), 1000);
  };

  const stopRecording = () => {
    if (!recorderRef.current || !isRecording) return;
    recorderRef.current.stop();
    setIsRecording(false);
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const submitVideoAnswer = async (videoBlob: Blob) => {
    if (!sessionId || isLoading || isComplete) return;

    setIsLoading(true);
    setError(null);
    setMessages((items) => [
      ...items,
      {
        id: newId(),
        speaker: 'candidate',
        text: 'Video response submitted for transcription and evaluation.',
        timestamp: new Date().toLocaleTimeString(),
      },
    ]);

    try {
      if (videoBlob.size === 0 || !videoBlob.type.startsWith('video/webm')) {
        throw new Error('The browser produced an empty or unsupported recording. Please record again or use a text response.');
      }
      const questionId = sessionState?.questions_asked;
      if (!questionId) throw new Error('The current backend question could not be identified. Refresh the session before recording.');
      const response = await InterviewApiService.sendVideoTurn(sessionId, questionId, videoBlob);
      const transcript = response.multimodal_analysis?.transcript;
      if (transcript) {
        setMessages((items) => items.map((item, index) => (
          index === items.length - 1 ? { ...item, text: transcript } : item
        )));
      }
      setMessages((items) => [
        ...items,
        {
          id: newId(),
          speaker: 'interviewer',
          text: response.reply,
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);

      const state = await InterviewApiService.getSessionState(sessionId);
      if (state) setSessionState(state);

      if (response.done) {
        setIsComplete(true);
        if (response.feedback) onFeedbackReady(response.feedback, sessionId);
        else setError('No interview feedback available.');
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Interview service unavailable. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  if (!candidateRecord) {
    return (
      <div className="w-full max-w-[1000px] mx-auto px-4 md:px-10 py-16">
        <div className="bg-[#0d1117]/90 border border-amber-500/40 rounded-xl p-8 text-[#e1e2e7]">
          <AlertTriangle className="w-7 h-7 text-amber-400 mb-4" />
          <h1 className="font-sans text-2xl font-bold mb-2">No candidate selected</h1>
          <p className="text-[#b9caca] mb-6">
            No candidate selected. Please return to Nexis and select a candidate.
          </p>
          <button onClick={onReturnHome} className="bg-white text-black px-5 py-2.5 rounded-full font-bold text-sm">
            Return to Nexis
          </button>
        </div>
      </div>
    );
  }

  const member = candidateRecord.member;
  const currentCoverage = sessionState?.current_day
    ? sessionState.coverage[`day_${sessionState.current_day}`]
    : null;

  return (
    <div className="flex-1 w-full max-w-[1440px] mx-auto px-4 md:px-10 py-8 text-[#e1e2e7]">
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-6">
        <main className="bg-[#0d1117]/88 border border-[#1f2937] rounded-xl min-h-[640px] flex flex-col overflow-hidden shadow-xl">
          <div className="border-b border-[#1f2937] p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="font-mono text-xs text-[#00dce5] uppercase tracking-wider font-bold flex items-center gap-2">
                <Zap className="w-4 h-4" />
                Real Adaptive Interview
              </div>
              <h1 className="text-xl md:text-2xl font-bold mt-1">
                {member.name} · {member.jobRole}
              </h1>
            </div>
            <div className="font-mono text-[11px] text-[#b9caca] bg-[#05070a] border border-[#323539] rounded-lg px-3 py-2">
              SESSION {sessionId ? sessionId.slice(0, 8).toUpperCase() : 'STARTING'}
            </div>
          </div>

          <div className="flex-1 p-5 md:p-6 space-y-4 overflow-y-auto">
            {messages.map((message) => {
              const isInterviewer = message.speaker === 'interviewer';
              return (
                <div key={message.id} className={`flex ${isInterviewer ? 'justify-start' : 'justify-end'}`}>
                  <div
                    className={`max-w-[860px] rounded-xl border p-4 ${
                      isInterviewer
                        ? 'bg-[#05070a] border-[#00dce5]/30 text-[#e1e2e7]'
                        : 'bg-[#00dce5]/10 border-[#00dce5]/40 text-[#e1e2e7]'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-mono text-[11px] mb-2 text-[#b9caca]">
                      {isInterviewer ? <Bot className="w-4 h-4 text-[#00dce5]" /> : <UserRound className="w-4 h-4 text-[#d0bcff]" />}
                      <span>{isInterviewer ? 'AI Interviewer' : member.name}</span>
                      <span>|</span>
                      <span>{message.timestamp}</span>
                    </div>
                    <p className="whitespace-pre-wrap leading-relaxed text-sm md:text-base">{message.text}</p>
                  </div>
                </div>
              );
            })}

            {isLoading && (
              <div className="flex items-center gap-2 font-mono text-xs text-[#00dce5]">
                <Loader2 className="w-4 h-4 animate-spin" />
                Waiting for interview service...
              </div>
            )}

            {error && (
              <div className="border border-red-400/40 bg-red-950/20 text-red-200 rounded-lg p-3 text-sm">
                {error}
              </div>
            )}
          </div>

          <div className="border-t border-[#1f2937] bg-[#05070a]/70 p-4">
            <div className="mb-4 rounded-xl border border-[#1f2937] bg-[#0d1117] p-4">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-3">
                <div>
                  <div className="font-mono text-xs text-[#00dce5] uppercase font-bold flex items-center gap-2">
                    <Video className="w-4 h-4" />
                    Video Interview Response
                  </div>
                  <p className="text-xs text-[#b9caca] mt-1">
                    Record a camera and microphone answer. The backend transcribes it and continues the same interview session.
                  </p>
                </div>
                <button
                  onClick={() => setVideoMode((value) => !value)}
                  disabled={isLoading || isComplete}
                  className="rounded-lg border border-[#00dce5]/50 bg-[#00dce5]/10 text-[#00dce5] px-4 py-2 font-mono text-xs font-bold disabled:opacity-40"
                >
                  {videoMode ? 'Hide Video' : 'Use Video Answer'}
                </button>
              </div>

              {videoMode && (
                <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-4 items-stretch">
                  <div className="relative min-h-[168px] rounded-lg border border-[#323539] bg-black overflow-hidden flex items-center justify-center">
                    {cameraStatus === 'ready' ? (
                      <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-center text-[#b9caca] text-xs p-4">
                        <Camera className="w-7 h-7 mx-auto mb-2 text-[#00dce5]" />
                        Camera preview appears here.
                      </div>
                    )}
                    {isRecording && (
                      <div className="absolute top-2 left-2 flex items-center gap-2 rounded-full bg-red-500/90 text-white px-3 py-1 font-mono text-[11px] font-bold">
                        <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                        REC {formatTimer(recordSeconds)}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col justify-between gap-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-mono text-[11px] text-[#b9caca]">
                      <div className="rounded-lg bg-[#05070a] border border-[#1f2937] px-3 py-2 flex items-center gap-2">
                        <Camera className="w-4 h-4 text-[#00dce5]" />
                        Camera: {cameraStatus === 'ready' ? 'Ready' : cameraStatus === 'denied' ? 'Unavailable' : 'Not enabled'}
                      </div>
                      <div className="rounded-lg bg-[#05070a] border border-[#1f2937] px-3 py-2 flex items-center gap-2">
                        <Mic className="w-4 h-4 text-[#d0bcff]" />
                        Microphone: {microphoneStatus === 'ready' ? 'Ready' : microphoneStatus === 'denied' ? 'Unavailable' : 'Not enabled'}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      {(cameraStatus !== 'ready' || microphoneStatus !== 'ready') && (
                        <button
                          onClick={enableCamera}
                          disabled={isLoading || isComplete}
                          className="rounded-lg bg-[#0a0d14] border border-[#323539] text-[#e1e2e7] px-4 py-2 font-mono text-xs font-bold disabled:opacity-40 flex items-center gap-2"
                        >
                          <Camera className="w-4 h-4" />
                          Enable Camera & Microphone
                        </button>
                      )}
                      {!isRecording ? (
                        <button
                          onClick={startRecording}
                          disabled={isLoading || isComplete || cameraStatus !== 'ready' || microphoneStatus !== 'ready'}
                          className="rounded-lg bg-red-500 text-white px-4 py-2 font-mono text-xs font-bold disabled:opacity-40 flex items-center gap-2"
                        >
                          <Video className="w-4 h-4" />
                          Start Video Answer
                        </button>
                      ) : (
                        <button
                          onClick={stopRecording}
                          className="rounded-lg bg-white text-black px-4 py-2 font-mono text-xs font-bold flex items-center gap-2"
                        >
                          <Square className="w-4 h-4" />
                          Stop & Submit
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col md:flex-row gap-3">
              <textarea
                value={answer}
                onChange={(event) => setAnswer(event.target.value)}
                onKeyDown={(event) => {
                  if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
                    event.preventDefault();
                    submitAnswer();
                  }
                }}
                disabled={isLoading || isComplete}
                placeholder={isComplete ? 'Interview complete.' : 'Type your technical response...'}
                className="min-h-[92px] flex-1 resize-none rounded-lg bg-[#0a0d14] border border-[#323539] focus:border-[#00dce5] focus:outline-none text-[#e1e2e7] p-3 font-mono text-sm"
              />
              <button
                onClick={submitAnswer}
                disabled={!answer.trim() || isLoading || isComplete}
                className="md:w-36 rounded-lg bg-white text-black font-bold text-sm disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 px-4 py-3"
              >
                {isComplete ? <Check className="w-4 h-4" /> : <Send className="w-4 h-4" />}
                {isComplete ? 'Done' : 'Submit'}
              </button>
            </div>
          </div>
        </main>

        <aside className="space-y-4">
          <div className="bg-[#0d1117]/90 border border-[#1f2937] rounded-xl p-5">
            <div className="font-mono text-xs text-[#00dce5] uppercase font-bold mb-3 flex items-center gap-2">
              <Terminal className="w-4 h-4" />
              Session Telemetry
            </div>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-[#b9caca]">Questions Asked</dt>
                <dd className="font-mono text-[#e1e2e7]">{sessionState?.questions_asked ?? messages.filter((m) => m.speaker === 'interviewer').length}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-[#b9caca]">Current Day</dt>
                <dd className="font-mono text-[#00dce5]">{sessionState?.current_day ? `Day ${sessionState.current_day}` : 'Starting'}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-[#b9caca]">Difficulty</dt>
                <dd className="font-mono text-[#d0bcff] capitalize">{sessionState?.difficulty ?? 'analyzing'}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-[#b9caca]">Phase</dt>
                <dd className="font-mono text-[#4ade80]">{sessionState?.phase ?? 'INTRO'}</dd>
              </div>
            </dl>
          </div>

          <div className="bg-[#0d1117]/90 border border-[#1f2937] rounded-xl p-5">
            <div className="font-mono text-xs text-[#b9caca] uppercase font-bold mb-2">Current Curriculum Topic</div>
            <h2 className="font-bold text-[#e1e2e7]">{currentCoverage?.title || 'Waiting for first backend question'}</h2>
            {currentCoverage?.objectives && (
              <ul className="mt-3 space-y-2 text-xs text-[#b9caca] list-disc pl-4">
                {currentCoverage.objectives.slice(0, 4).map((objective) => (
                  <li key={objective}>{objective}</li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
};

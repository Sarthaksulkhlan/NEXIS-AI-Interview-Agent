import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle, RotateCcw, Route, ShieldAlert } from 'lucide-react';
import { CandidateProfile } from '../types';
import { FeedbackReport, IntegritySummary, InterviewApiService, SessionStateResponse } from '../services/interviewApi';

interface RealFeedbackViewProps {
  feedback: FeedbackReport | null;
  candidate: CandidateProfile;
  sessionId: string;
  onRetakeSession: () => void;
}

export const RealFeedbackView: React.FC<RealFeedbackViewProps> = ({
  feedback,
  candidate,
  sessionId,
  onRetakeSession,
}) => {
  const [session, setSession] = useState<SessionStateResponse | null>(null);
  const [integrity, setIntegrity] = useState<IntegritySummary | null>(null);

  useEffect(() => {
    if (!sessionId) return;
    void Promise.all([
      InterviewApiService.getSessionState(sessionId),
      InterviewApiService.getIntegritySummary(sessionId).catch(() => null),
    ]).then(([nextSession, nextIntegrity]) => {
      setSession(nextSession);
      setIntegrity(nextIntegrity);
    });
  }, [sessionId]);

  const curriculumBreakdown = useMemo(() => {
    if (!session) return [];
    return [...new Set(session.question_log.map((question) => question.day))].map((day) => {
      const questions = session.question_log.filter((question) => question.day === day);
      const answers = session.answer_log.filter((item) => item.day === day);
      const average = answers.length
        ? answers.reduce((sum, item) => sum + item.evaluation.scores.correctness, 0) / answers.length
        : 0;
      return { day, topic: questions[0]?.topic || `Day ${day}`, questions: questions.length, correctness: average.toFixed(1) };
    });
  }, [session]);
  const multimodalLog = session?.multimodal_log ?? [];

  if (!feedback) {
    return (
      <div className="w-full max-w-[1000px] mx-auto px-4 md:px-10 py-16">
        <div className="bg-[#0d1117]/90 border border-amber-500/40 rounded-xl p-8 text-[#e1e2e7]">
          <AlertTriangle className="w-7 h-7 text-amber-400 mb-4" />
          <h1 className="font-sans text-2xl font-bold mb-2">Feedback unavailable</h1>
          <p className="text-[#b9caca]">No interview feedback available.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1440px] mx-auto px-4 md:px-10 py-10 space-y-8 text-[#e1e2e7] font-sans">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-[#323539] pb-8">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-8 h-8 text-[#00dce5]" />
            <h1 className="font-sans font-extrabold text-2xl sm:text-3xl md:text-4xl text-[#e1e2e7] tracking-tight uppercase">
              Technical Assessment Report
            </h1>
          </div>
          <p className="font-mono text-xs text-[#b9caca] max-w-2xl mt-1">
            Session ID: <span className="text-[#00dce5]">{sessionId || 'N/A'}</span> | Candidate: {candidate.name} | Role: {candidate.targetRole}
          </p>
        </div>
      </header>

      <section className="bg-[#0c0e12]/90 border border-[#1f2937] p-6 md:p-8 rounded-xl shadow-xl backdrop-blur-md">
        <div className="flex items-center gap-2.5 mb-3 border-b border-[#323539] pb-3">
          <CheckCircle className="w-5 h-5 text-[#00dce5]" />
          <h2 className="font-sans text-lg font-semibold text-[#e1e2e7]">
            Backend Feedback Summary
          </h2>
        </div>
        <p className="font-sans text-base text-[#b9caca] leading-relaxed">{feedback.summary}</p>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <FeedbackList title="Strengths" icon="strength" items={feedback.strengths} />
        <FeedbackList title="Gaps" icon="gap" items={feedback.gaps} />
        <FeedbackList title="Next Steps" icon="next" items={feedback.next} />
      </section>

      {session && (
        <section className="bg-[#0c0e12]/90 border border-[#1f2937] p-6 md:p-8 rounded-xl space-y-5">
          <h2 className="text-lg font-semibold">Per-question analysis</h2>
          {session.question_log.map((question) => {
            const answerItem = session.answer_log.find((item) => item.question_id === question.id);
            return (
              <article key={question.id} className="border border-[#323539] rounded-lg p-4 space-y-2">
                <div className="font-mono text-xs text-[#00dce5]">Q{question.id} · Day {question.day} · {question.topic} · {question.difficulty}{question.is_followup ? ' · Follow-up' : ''}</div>
                <p className="font-semibold">{question.text}</p>
                <p className="text-sm text-[#b9caca]"><span className="text-[#e1e2e7]">Answer:</span> {answerItem?.text || 'No answer recorded.'}</p>
                {answerItem && (
                  <div className="text-sm text-[#b9caca]">
                    Evaluation: <span className="text-[#d0bcff]">{answerItem.evaluation.pattern}</span> · Correctness {answerItem.evaluation.scores.correctness}/10 · Depth {answerItem.evaluation.scores.depth}/10 · Reasoning {answerItem.evaluation.scores.reasoning}/10
                    {answerItem.evaluation.rationale && <p className="mt-1">{answerItem.evaluation.rationale}</p>}
                  </div>
                )}
              </article>
            );
          })}
        </section>
      )}

      {curriculumBreakdown.length > 0 && (
        <section className="bg-[#0c0e12]/90 border border-[#1f2937] p-6 md:p-8 rounded-xl">
          <h2 className="text-lg font-semibold mb-4">Curriculum breakdown</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {curriculumBreakdown.map((item) => (
              <div key={item.day} className="border border-[#323539] rounded-lg p-4 text-sm">
                <div className="text-[#00dce5] font-mono">Day {item.day} · {item.topic}</div>
                <div className="text-[#b9caca] mt-1">{item.questions} question(s) · Average correctness {item.correctness}/10</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {multimodalLog.length > 0 && (
        <section className="bg-[#0c0e12]/90 border border-[#1f2937] p-6 md:p-8 rounded-xl">
          <h2 className="text-lg font-semibold mb-3">Communication and media assessment</h2>
          <div className="space-y-2 text-sm text-[#b9caca]">
            {multimodalLog.map((item) => (
              <p key={item.question_id}>Question {item.question_id}: {item.communication_feedback || 'No communication observation returned.'}</p>
            ))}
          </div>
        </section>
      )}

      <section className="bg-[#0c0e12]/90 border border-[#1f2937] p-6 md:p-8 rounded-xl">
        <h2 className="text-lg font-semibold mb-3">Integrity summary</h2>
        {integrity ? (
          <div className="text-sm text-[#b9caca] space-y-2">
            <p>Status: <span className="text-[#00dce5]">{integrity.risk_level}</span> · Score {integrity.risk_score}/100 · {integrity.event_count} supported event(s)</p>
            {integrity.reasons.length > 0 && <ul className="list-disc pl-5">{integrity.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>}
            <p>Integrity signals are review aids and are not automatic cheating determinations.</p>
          </div>
        ) : <p className="text-sm text-[#b9caca]">No integrity summary was available for this session.</p>}
      </section>

      <div className="pt-4 flex justify-center">
        <button
          onClick={onRetakeSession}
          className="bg-[#0d1117] border border-[#00dce5] text-[#00dce5] hover:bg-[#00dce5]/10 font-mono text-xs font-semibold px-8 py-3.5 rounded transition-all shadow-[0_0_20px_-3px_rgba(0,220,229,0.3)] flex items-center gap-2 cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" />
          <span>START NEW TECHNICAL INTERVIEW SESSION</span>
        </button>
      </div>
    </div>
  );
};

const FeedbackList: React.FC<{
  title: string;
  icon: 'strength' | 'gap' | 'next';
  items: string[];
}> = ({ title, icon, items }) => {
  const Icon = icon === 'gap' ? ShieldAlert : icon === 'next' ? Route : CheckCircle;
  const color = icon === 'gap' ? 'text-red-400 border-l-red-400' : icon === 'next' ? 'text-[#d0bcff] border-l-[#d0bcff]' : 'text-[#00dce5] border-l-[#00dce5]';

  return (
    <div className="flex flex-col gap-4">
      <h3 className="font-sans text-lg font-bold text-[#e1e2e7] flex items-center gap-2">
        <Icon className={`w-5 h-5 ${color.split(' ')[0]}`} />
        {title}
      </h3>
      {items.length ? items.map((item, index) => (
        <div
          key={`${title}-${index}`}
          className={`bg-[#0c0e12] border-l-4 ${color} border-y border-r border-[#1f2937] p-5 rounded-r-lg shadow-md`}
        >
          <p className="font-sans text-sm text-[#b9caca] leading-relaxed">{item}</p>
        </div>
      )) : (
        <div className="bg-[#0c0e12] border border-[#1f2937] p-5 rounded-lg text-sm text-[#b9caca]">
          No items returned by backend.
        </div>
      )}
    </div>
  );
};

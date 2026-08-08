import React from 'react';
import { AlertTriangle, CheckCircle, RotateCcw, Route, ShieldAlert } from 'lucide-react';
import { CandidateProfile } from '../types';
import { FeedbackReport } from '../services/interviewApi';

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

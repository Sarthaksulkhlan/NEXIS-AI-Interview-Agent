import React from 'react';
import { InterviewSession } from '../types';
import { History, Play, CheckCircle, Clock, ChevronRight, Award } from 'lucide-react';

interface HistoryViewProps {
  sessions: InterviewSession[];
  onSelectSessionReport: (session: InterviewSession) => void;
  onStartNewSession: () => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  sessions,
  onSelectSessionReport,
  onStartNewSession,
}) => {
  return (
    <div className="w-full max-w-[1440px] mx-auto px-4 md:px-10 py-10 space-y-8 text-[#e1e2e7] font-sans">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#323539] pb-6">
        <div>
          <h1 className="font-sans font-extrabold text-2xl sm:text-3xl text-[#e1e2e7] flex items-center gap-3">
            <History className="w-7 h-7 text-[#00dce5]" />
            Session History
          </h1>
          <p className="font-mono text-xs text-[#b9caca] mt-1">
            Review your past AI engineering technical interviews, score breakdown, and growth trajectories.
          </p>
        </div>

        <button
          onClick={onStartNewSession}
          className="bg-[#0d1117] border border-[#00dce5] text-[#00dce5] hover:bg-[#00dce5]/10 font-mono text-xs font-semibold px-5 py-2.5 rounded transition-all shadow-[0_0_15px_-3px_rgba(0,220,229,0.3)] flex items-center gap-2 self-start md:self-auto cursor-pointer"
        >
          <Play className="w-3.5 h-3.5" />
          <span>Launch New Interview</span>
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {sessions.map((session) => (
          <div
            key={session.id}
            className="bg-[#0c0e12] border border-[#1f2937] p-5 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-[#00dce5]/50 transition-colors shadow-md group"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs text-[#00dce5] bg-[#00dce5]/10 px-2.5 py-0.5 rounded border border-[#00dce5]/30">
                  {session.id}
                </span>
                <span className="font-sans font-bold text-base text-[#e1e2e7]">
                  {session.targetRole}
                </span>
              </div>
              <p className="font-mono text-xs text-[#b9caca]">
                Candidate: {session.candidateName} • Date: {session.date} • Questions: {session.questionsAnswered}/{session.totalQuestions}
              </p>
            </div>

            <div className="flex items-center gap-6">
              <div className="text-right">
                <div className="font-sans text-2xl font-extrabold text-[#00dce5]">
                  {session.overallScore} <span className="text-xs text-[#b9caca] font-normal">/ 100</span>
                </div>
                <span className="font-mono text-[10px] text-[#4ade80] flex items-center gap-1 justify-end">
                  <CheckCircle className="w-3 h-3" />
                  {session.status}
                </span>
              </div>

              <button
                onClick={() => onSelectSessionReport(session)}
                className="bg-[#111417] border border-[#3a494a] text-[#e1e2e7] group-hover:border-[#00dce5] group-hover:text-[#00dce5] font-mono text-xs px-4 py-2 rounded transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <span>View Full Report</span>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

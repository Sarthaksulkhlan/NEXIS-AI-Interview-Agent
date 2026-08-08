import React, { useState, useEffect } from 'react';
import { AssessmentReport } from '../types';
import { RadarChart } from './RadarChart';
import {
  CheckCircle,
  Award,
  BarChart3,
  Check,
  AlertTriangle,
  Route,
  ChevronDown,
  ChevronUp,
  Brain,
  ShieldAlert,
  BookOpen,
  Cpu,
  Code,
  RotateCcw,
} from 'lucide-react';

interface AssessmentReportViewProps {
  report: AssessmentReport;
  onRetakeSession: () => void;
}

export const AssessmentReportView: React.FC<AssessmentReportViewProps> = ({
  report,
  onRetakeSession,
}) => {
  const [animatedScore, setAnimatedScore] = useState(0);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);

  useEffect(() => {
    let current = 0;
    const target = report.overallScore;
    const increment = Math.max(1, Math.floor(target / 40));
    const interval = setInterval(() => {
      current += increment;
      if (current >= target) {
        setAnimatedScore(target);
        clearInterval(interval);
      } else {
        setAnimatedScore(current);
      }
    }, 25);
    return () => clearInterval(interval);
  }, [report.overallScore]);

  const toggleAccordion = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  return (
    <div className="w-full max-w-[1440px] mx-auto px-4 md:px-10 py-10 space-y-10 text-[#e1e2e7] font-sans">
      {/* Header Section */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-[#323539] pb-8">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-8 h-8 text-[#00dce5]" />
            <h1 className="font-sans font-extrabold text-2xl sm:text-3xl md:text-4xl text-[#e1e2e7] tracking-tight uppercase">
              TECHNICAL ASSESSMENT REPORT
            </h1>
          </div>
          <p className="font-mono text-xs text-[#b9caca] max-w-2xl mt-1">
            Session ID: <span className="text-[#00dce5]">{report.sessionId}</span> | Role: {report.targetRole} | Timestamp: {report.timestamp}
          </p>
        </div>

        <div className="flex flex-col md:items-end gap-2">
          <div className="flex items-baseline gap-2">
            <span className="font-sans text-5xl md:text-6xl font-extrabold text-[#00dce5] drop-shadow-[0_0_20px_rgba(0,220,229,0.3)]">
              {animatedScore}
            </span>
            <span className="font-sans text-xl text-[#b9caca]">/ 100</span>
          </div>
          <span className="font-mono text-xs text-[#00dce5] bg-[#00dce5]/10 px-3 py-1 rounded border border-[#00dce5]/30 uppercase tracking-widest font-semibold">
            {report.scoreBadge}
          </span>
        </div>
      </header>

      {/* Executive AI Performance Synthesis */}
      <section className="bg-[#0c0e12]/90 border border-[#1f2937] p-6 md:p-8 rounded-xl relative overflow-hidden shadow-xl backdrop-blur-md">
        <div className="flex items-center gap-2.5 mb-3 border-b border-[#323539] pb-3">
          <Brain className="w-5 h-5 text-[#00dce5]" />
          <h2 className="font-sans text-lg font-semibold text-[#e1e2e7]">
            AI Performance Synthesis
          </h2>
        </div>
        <p className="font-sans text-base text-[#b9caca] leading-relaxed">
          {report.aiSynthesis}
        </p>
      </section>

      {/* Visualizations Grid: Radar Chart + Topic Proficiency Bars */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Competency Mapping Radar Chart */}
        <div className="bg-[#0c0e12] border border-[#1f2937] p-6 rounded-xl flex flex-col gap-4 shadow-lg">
          <h3 className="font-mono text-xs text-[#b9caca] border-b border-[#323539] pb-3 uppercase tracking-wider font-semibold flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-[#00dce5]" />
            Competency Mapping
          </h3>
          <div className="w-full flex items-center justify-center min-h-[280px]">
            <RadarChart data={report.competency} size={300} />
          </div>
        </div>

        {/* Topic Proficiency Horizontal Bars */}
        <div className="bg-[#0c0e12] border border-[#1f2937] p-6 rounded-xl flex flex-col gap-4 shadow-lg">
          <h3 className="font-mono text-xs text-[#b9caca] border-b border-[#323539] pb-3 uppercase tracking-wider font-semibold flex items-center gap-2">
            <Award className="w-4 h-4 text-[#00dce5]" />
            Topic Proficiency
          </h3>

          <div className="flex flex-col gap-5 mt-2 w-full">
            {report.proficiencies.map((prof, idx) => (
              <div key={idx} className="flex flex-col gap-1.5 w-full">
                <div className="flex justify-between items-center font-mono text-xs">
                  <span className="text-[#e1e2e7]">{prof.topic}</span>
                  <span
                    className={
                      prof.percentage >= 85
                        ? 'text-[#00dce5] font-bold'
                        : prof.percentage >= 60
                        ? 'text-[#d0bcff] font-bold'
                        : 'text-red-400 font-bold'
                    }
                  >
                    {prof.percentage}%
                  </span>
                </div>
                <div className="w-full h-2 bg-[#1f2937] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-1000 ease-out ${
                      prof.percentage >= 85
                        ? 'bg-[#00dce5] shadow-[0_0_10px_rgba(0,220,229,0.5)]'
                        : prof.percentage >= 60
                        ? 'bg-[#d0bcff] shadow-[0_0_10px_rgba(208,188,255,0.5)]'
                        : 'bg-red-400 shadow-[0_0_10px_rgba(248,113,113,0.5)]'
                    }`}
                    style={{ width: `${prof.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Strengths & Growth Areas Grid */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Strengths Column */}
        <div className="flex flex-col gap-4">
          <h3 className="font-sans text-lg font-bold text-[#e1e2e7] flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-[#00dce5]" />
            Key Strengths
          </h3>

          {report.strengths.map((item) => (
            <div
              key={item.id}
              className="bg-[#0c0e12] border-l-4 border-l-[#00dce5] border-y border-r border-[#1f2937] p-5 rounded-r-lg shadow-md hover:-translate-y-0.5 transition-transform"
            >
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-mono text-xs text-[#00dce5] font-bold tracking-wider">
                  {item.title}
                </h4>
                <span className="font-mono text-[11px] bg-[#00dce5]/10 text-[#00dce5] px-2 py-0.5 rounded border border-[#00dce5]/30">
                  {item.scoreLabel}
                </span>
              </div>
              <p className="font-sans text-sm text-[#b9caca] leading-relaxed">
                {item.description}
              </p>
            </div>
          ))}
        </div>

        {/* Growth Areas Column */}
        <div className="flex flex-col gap-4">
          <h3 className="font-sans text-lg font-bold text-[#e1e2e7] flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-red-400" />
            Areas for Growth
          </h3>

          {report.growthAreas.map((item) => (
            <div
              key={item.id}
              className="bg-[#0c0e12] border-l-4 border-l-red-400 border-y border-r border-[#1f2937] p-5 rounded-r-lg shadow-md hover:-translate-y-0.5 transition-transform"
            >
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-mono text-xs text-red-400 font-bold tracking-wider">
                  {item.title}
                </h4>
                <span className="font-mono text-[11px] bg-red-400/10 text-red-400 px-2 py-0.5 rounded border border-red-400/30">
                  {item.scoreLabel}
                </span>
              </div>
              <p className="font-sans text-sm text-[#b9caca] leading-relaxed">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Recommended Learning Roadmap */}
      <section className="bg-[#0c0e12] border border-[#1f2937] p-6 md:p-8 rounded-xl flex flex-col gap-6 shadow-xl">
        <div className="flex items-center gap-2 border-b border-[#323539] pb-3">
          <Route className="w-5 h-5 text-[#00dce5]" />
          <h3 className="font-sans text-lg font-bold text-[#e1e2e7]">
            Recommended Learning Roadmap
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
          {report.roadmap.map((step, idx) => (
            <div key={idx} className="flex flex-col items-center gap-3 text-center">
              <div className="w-12 h-12 rounded-full bg-[#05070a] border-2 border-[#00dce5] flex items-center justify-center font-mono font-bold text-[#00dce5] text-base shadow-[0_0_15px_rgba(0,220,229,0.3)]">
                {step.stepNumber}
              </div>
              <div className="bg-[#111417] border border-[#1f2937] w-full p-4 rounded-lg hover:border-[#00dce5] transition-colors">
                <BookOpen className="w-5 h-5 text-[#b9caca] mx-auto mb-2" />
                <h4 className="font-mono text-xs font-semibold text-[#e1e2e7] mb-1">
                  {step.title}
                </h4>
                <p className="text-xs text-[#b9caca]">{step.subtitle}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Interview Timeline Review Accordion */}
      <section className="flex flex-col gap-4">
        <h2 className="font-sans text-xl font-bold text-[#e1e2e7] border-b border-[#323539] pb-4">
          Interview Timeline Review
        </h2>

        <div className="relative pl-6 md:pl-8 border-l-2 border-[#1f2937] ml-2 md:ml-4 flex flex-col gap-6 mt-2">
          {report.timeline.map((item, idx) => {
            const isExpanded = expandedIndex === idx;

            return (
              <div key={idx} className="relative">
                {/* Timeline Dot */}
                <div
                  className={`absolute -left-[33px] md:-left-[41px] top-4 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    item.badgeType === 'primary'
                      ? 'bg-[#00dce5]/20 border-[#00dce5]'
                      : item.badgeType === 'secondary'
                      ? 'bg-[#d0bcff]/20 border-[#d0bcff]'
                      : 'bg-red-400/20 border-red-400'
                  }`}
                >
                  <div
                    className={`w-1.5 h-1.5 rounded-full ${
                      item.badgeType === 'primary'
                        ? 'bg-[#00dce5]'
                        : item.badgeType === 'secondary'
                        ? 'bg-[#d0bcff]'
                        : 'bg-red-400'
                    }`}
                  />
                </div>

                {/* Accordion Card */}
                <div className="bg-[#0c0e12] border border-[#1f2937] rounded-lg overflow-hidden transition-all shadow-md">
                  <div
                    onClick={() => toggleAccordion(idx)}
                    className="w-full flex items-center justify-between p-4 bg-[#0c0e12] hover:bg-[#191c1f] transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3 flex-1 overflow-hidden pr-2">
                      <span className="font-mono text-xs text-[#00dce5] shrink-0">
                        {item.time}
                      </span>
                      <span className="font-sans font-semibold text-sm sm:text-base text-[#e1e2e7] truncate">
                        {item.question}
                      </span>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-[#b9caca]" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-[#b9caca]" />
                    )}
                  </div>

                  {isExpanded && (
                    <div className="border-t border-[#323539] p-6 bg-[#05070a] flex flex-col gap-6">
                      <div>
                        <h4 className="font-mono text-xs text-[#b9caca] mb-2 uppercase tracking-wider">
                          Candidate Answer
                        </h4>
                        <div className="font-mono text-xs sm:text-sm text-[#e1e2e7] pl-4 border-l-2 border-[#3a494a] bg-[#111417] p-4 rounded-r whitespace-pre-wrap leading-relaxed">
                          "{item.userAnswer}"
                        </div>
                      </div>

                      <div
                        className={`p-4 rounded border ${
                          item.badgeType === 'primary'
                            ? 'bg-[#00dce5]/5 border-[#00dce5]/30 text-[#e1e2e7]'
                            : item.badgeType === 'secondary'
                            ? 'bg-[#d0bcff]/5 border-[#d0bcff]/30 text-[#e1e2e7]'
                            : 'bg-red-400/5 border-red-400/30 text-[#e1e2e7]'
                        }`}
                      >
                        <h4 className="font-mono text-xs font-bold mb-2 flex items-center gap-2">
                          <Brain className="w-4 h-4 text-[#00dce5]" />
                          AI Assessor Feedback
                        </h4>
                        <p className="font-sans text-sm text-[#b9caca] leading-relaxed">
                          {item.feedback}{' '}
                          <span className="font-mono font-bold text-[#00dce5] ml-2">
                            Score: {item.score}/10
                          </span>
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Retake Session CTA */}
      <div className="pt-6 flex justify-center">
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

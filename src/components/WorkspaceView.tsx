import React, { useState } from 'react';
import {
  CandidateProfile,
  QuestionTopic,
  QuestionItem,
  AnswerSubmission,
  LiveSignalMetrics,
} from '../types';
import {
  Bot,
  Send,
  Loader2,
  Check,
  Terminal,
  Activity,
  GitBranch,
  HeartPulse,
  Sparkles,
  ArrowRight,
  FileCode,
} from 'lucide-react';

interface WorkspaceViewProps {
  candidate: CandidateProfile;
  topics: QuestionTopic[];
  questions: QuestionItem[];
  onCompleteSession: (submissions: AnswerSubmission[]) => void;
  onEndSessionEarly: () => void;
}

export const WorkspaceView: React.FC<WorkspaceViewProps> = ({
  candidate,
  topics,
  questions,
  onCompleteSession,
  onEndSessionEarly,
}) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswerText, setUserAnswerText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [submitState, setSubmitState] = useState<'idle' | 'analyzing' | 'sent'>('idle');
  const [submissions, setSubmissions] = useState<AnswerSubmission[]>([]);

  const [liveSignals, setLiveSignals] = useState<LiveSignalMetrics>({
    technicalDepth: 'HIGH',
    communication: 'SOLID',
    reasoning: 'ANALYZING',
    depthValue: 85,
    commValue: 80,
    reasoningValue: 88,
  });

  const currentQ = questions[currentQuestionIndex] || questions[0];

  const handlePreFillHint = () => {
    if (currentQ.defaultPromptHint) {
      setUserAnswerText(currentQ.defaultPromptHint);
    } else {
      setUserAnswerText(
        `# Technical Approach\n\nTo manage HNSW index build times under high ingestion loads:\n\n1. **Two-Tiered Ingestion**: Buffer new vector writes in a fast, unindexed memory delta buffer (or flat index) to enable instant near real-time point lookups.\n2. **Background Graph Construction**: Run HNSW graph updates asynchronously on worker threads in batches.\n3. **Shadow Index Swapping**: Once the batch graph build completes, atomically swap pointers to ensure query read latency remains unaffected.`
      );
    }
  };

  const handleSubmit = async () => {
    if (!userAnswerText.trim()) return;

    setIsAnalyzing(true);
    setSubmitState('analyzing');

    try {
      const response = await fetch('/api/evaluate-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: currentQ.questionText,
          userAnswer: userAnswerText,
          candidateRole: candidate.targetRole,
        }),
      });

      const data = await response.json();

      const newSubmission: AnswerSubmission = {
        questionId: currentQ.id,
        questionText: currentQ.questionText,
        userAnswer: userAnswerText,
        timestamp: new Date().toLocaleTimeString(),
        aiFeedback: data.feedback,
        score: data.score || 8,
        depthScore: data.depthValue || 85,
        commScore: data.commValue || 80,
        reasoningScore: data.reasoningValue || 88,
      };

      const updatedSubmissions = [...submissions, newSubmission];
      setSubmissions(updatedSubmissions);

      if (data.technicalDepth) {
        setLiveSignals({
          technicalDepth: data.technicalDepth,
          communication: data.communication,
          reasoning: data.reasoning,
          depthValue: data.depthValue,
          commValue: data.commValue,
          reasoningValue: data.reasoningValue,
        });
      }

      setIsAnalyzing(false);
      setSubmitState('sent');

      setTimeout(() => {
        setSubmitState('idle');
        setUserAnswerText('');

        if (currentQuestionIndex < questions.length - 1) {
          setCurrentQuestionIndex((prev) => prev + 1);
        } else {
          // Finished all questions -> generate full report
          onCompleteSession(updatedSubmissions);
        }
      }, 1500);
    } catch (err) {
      console.error('Error submitting answer:', err);
      setIsAnalyzing(false);
      setSubmitState('idle');
    }
  };

  // Line numbers array (1 to 12)
  const lineNumbers = Array.from({ length: 12 }, (_, i) => i + 1);

  return (
    <div className="flex-1 flex w-full max-w-[1440px] mx-auto relative overflow-hidden font-sans">
      {/* Left Content Area (Technical Interview Canvas) */}
      <main className="flex-1 flex flex-col p-4 md:p-8 z-10 overflow-y-auto">
        {/* Day / Topic Badge */}
        <div className="mb-4">
          <span className="bg-[#0d1117] border border-[#1f2937] text-[#b9caca] font-mono text-[10px] sm:text-xs px-3 py-1 rounded tracking-wider uppercase inline-block">
            {currentQ.dayLabel}
          </span>
        </div>

        {/* AI Question Card */}
        <div className="bg-[#0d1117] border border-[#1f2937] rounded-xl p-6 md:p-8 relative shadow-xl mb-6">
          <div className="absolute -top-3.5 -left-3.5 w-9 h-9 rounded-lg border border-[#00dce5] bg-[#05070a] flex items-center justify-center shadow-[0_0_15px_rgba(0,220,229,0.3)]">
            <Bot className="w-5 h-5 text-[#00dce5]" />
          </div>

          <div className="flex justify-between items-start mb-4 pl-4">
            <span className="font-mono text-xs text-[#00dce5] font-semibold tracking-wider">
              {currentQ.versionLabel}
            </span>
            <button
              onClick={handlePreFillHint}
              className="text-[11px] font-mono text-[#d0bcff] hover:text-[#00dce5] bg-[#1d2023] px-2.5 py-1 rounded border border-[#3a494a] flex items-center gap-1.5 transition-colors"
            >
              <Sparkles className="w-3 h-3" />
              <span>Use Technical Template</span>
            </button>
          </div>

          <div className="font-sans text-base sm:text-lg md:text-xl font-medium text-[#e1e2e7] pl-4 mb-6 leading-relaxed">
            <p>{currentQ.questionText}</p>
          </div>

          {currentQ.followUpText && (
            <div className="pl-4">
              <div className="border-l-2 border-[#d0bcff] pl-4 py-1">
                <span className="font-mono text-xs text-[#d0bcff] flex items-center gap-2 mb-1 font-semibold animate-pulse">
                  ↳ FOLLOW-UP | BASED ON YOUR ANSWER
                </span>
                <p className="font-sans text-sm text-[#b9caca] leading-relaxed">
                  {currentQ.followUpText}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Response Editor Area */}
        <div className="flex-1 flex flex-col min-h-[360px] mb-6">
          <div className="flex justify-between items-center bg-[#05070a] border-t border-l border-r border-[#1f2937] rounded-t-lg px-4 py-2.5">
            <span className="font-mono text-xs text-[#b9caca] flex items-center gap-2">
              <FileCode className="w-4 h-4 text-[#00dce5]" />
              <span>response.md</span>
            </span>
            <div className="font-mono text-[10px] text-[#b9caca] bg-[#111417] px-2 py-0.5 rounded border border-[#1f2937]">
              MARKDOWN SUPPORTED
            </div>
          </div>

          <div className="flex-1 bg-[#0a0d14] border border-[#1f2937] rounded-b-lg flex transition-shadow duration-300 relative overflow-hidden group focus-within:border-[#00dce5] focus-within:shadow-[0_0_15px_-2px_rgba(0,220,229,0.3)]">
            {/* Line Numbers Column */}
            <div className="w-10 bg-[#05070a] border-r border-[#1f2937] flex flex-col items-end py-4 pr-2.5 font-mono text-xs text-[#323539] select-none shrink-0 leading-relaxed">
              {lineNumbers.map((num) => (
                <span key={num}>{num}</span>
              ))}
            </div>

            {/* Textarea Code Editor */}
            <textarea
              value={userAnswerText}
              onChange={(e) => setUserAnswerText(e.target.value)}
              className="flex-1 h-full bg-transparent text-[#e1e2e7] font-mono text-xs sm:text-sm resize-none focus:outline-none border-none p-4 placeholder:text-[#b9caca]/30 leading-relaxed min-h-[220px]"
              placeholder="Write your technical approach here... Markdown and code blocks are supported."
            />

            {/* Submission Overlay Controls */}
            <div className="absolute bottom-4 right-4 flex items-center gap-4 bg-[#0a0d14]/90 backdrop-blur-md p-2 rounded-lg border border-[#1f2937]">
              {submitState === 'analyzing' && (
                <span className="font-mono text-xs text-[#00dce5] flex items-center gap-2 animate-pulse">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  ANALYZING RESPONSE...
                </span>
              )}

              {submitState === 'sent' && (
                <span className="font-mono text-xs text-[#4ade80] flex items-center gap-2 font-bold">
                  <Check className="w-4 h-4" />
                  ANALYSIS COMPLETE
                </span>
              )}

              {submitState === 'idle' && (
                <button
                  onClick={handleSubmit}
                  disabled={!userAnswerText.trim()}
                  className="bg-[#0d1117] border border-[#00dce5] text-[#00dce5] hover:bg-[#00dce5]/10 disabled:opacity-40 disabled:cursor-not-allowed font-mono text-xs font-semibold px-6 py-2 rounded transition-all shadow-[0_0_15px_-3px_rgba(0,220,229,0.3)] hover:shadow-[0_0_25px_-3px_rgba(0,220,229,0.5)] flex items-center gap-2 cursor-pointer"
                >
                  <span>SUBMIT</span>
                  <Send className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Question Progress Footer */}
        <div className="flex justify-between items-center text-xs font-mono text-[#b9caca]">
          <span>
            Question {currentQuestionIndex + 1} of {questions.length}
          </span>
          <button
            onClick={onEndSessionEarly}
            className="text-xs text-red-400 hover:underline font-mono"
          >
            Finish & Generate Assessment Report
          </button>
        </div>
      </main>

      {/* Right Sidebar (Context & Live Signals) */}
      <aside className="hidden xl:flex flex-col w-80 bg-[#05070a] border-l border-[#1f2937] p-6 h-[calc(100vh-64px)] overflow-y-auto sticky top-16 z-10">
        {/* Topic Progression (Connected Timeline) */}
        <div className="mb-10">
          <h3 className="font-mono text-xs text-[#b9caca] mb-6 flex items-center gap-2 font-semibold uppercase tracking-wider">
            <GitBranch className="w-4 h-4 text-[#00dce5]" />
            Topic Progression
          </h3>

          <div className="relative pl-3 space-y-6 before:absolute before:inset-y-2 before:left-[15px] before:w-px before:bg-[#1f2937]">
            {topics.map((t, idx) => {
              const isCurrent = idx === currentQuestionIndex;
              const isDone = idx < currentQuestionIndex;

              return (
                <div key={t.id} className="relative flex items-start gap-4">
                  <div
                    className={`absolute -left-1.5 top-1.5 w-3 h-3 rounded-full bg-[#05070a] border-2 z-10 flex items-center justify-center ${
                      isDone
                        ? 'border-[#d0bcff] bg-[#d0bcff]'
                        : isCurrent
                        ? 'border-[#00dce5] shadow-[0_0_10px_#00dce5]'
                        : 'border-[#323539]'
                    }`}
                  >
                    {isCurrent && (
                      <div className="w-1.5 h-1.5 rounded-full bg-[#00dce5] animate-ping" />
                    )}
                  </div>

                  <div className="pl-3">
                    <p
                      className={`font-mono text-xs ${
                        isCurrent
                          ? 'text-[#00dce5] font-bold'
                          : isDone
                          ? 'text-[#e1e2e7] opacity-80'
                          : 'text-[#b9caca]/50'
                      }`}
                    >
                      {t.title}
                    </p>
                    <p className="font-mono text-[9px] text-[#b9caca] mt-0.5">
                      {isDone ? 'COMPLETED' : isCurrent ? 'IN PROGRESS' : 'UPCOMING'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Live Signals */}
        <div className="mb-10">
          <h3 className="font-mono text-xs text-[#b9caca] mb-6 flex items-center gap-2 font-semibold uppercase tracking-wider">
            <HeartPulse className="w-4 h-4 text-[#00dce5]" />
            Live Signals
          </h3>

          <div className="space-y-5">
            {/* Signal 1: Technical Depth */}
            <div>
              <div className="flex justify-between font-mono text-[10px] mb-2">
                <span className="text-[#e1e2e7]">TECHNICAL DEPTH</span>
                <span className="text-[#00dce5] font-bold">{liveSignals.technicalDepth}</span>
              </div>
              <div className="flex gap-1 h-2">
                {[20, 40, 60, 80, 100].map((step, i) => (
                  <div
                    key={i}
                    className={`flex-1 rounded-sm transition-all duration-500 ${
                      liveSignals.depthValue >= step
                        ? 'bg-[#00dce5] shadow-[0_0_8px_rgba(0,220,229,0.5)]'
                        : 'bg-[#1f2937]'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Signal 2: Communication */}
            <div>
              <div className="flex justify-between font-mono text-[10px] mb-2">
                <span className="text-[#e1e2e7]">COMMUNICATION</span>
                <span className="text-[#d0bcff] font-bold">{liveSignals.communication}</span>
              </div>
              <div className="flex gap-1 h-2">
                {[20, 40, 60, 80, 100].map((step, i) => (
                  <div
                    key={i}
                    className={`flex-1 rounded-sm transition-all duration-500 ${
                      liveSignals.commValue >= step
                        ? 'bg-[#d0bcff] shadow-[0_0_8px_rgba(208,188,255,0.5)]'
                        : 'bg-[#1f2937]'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Signal 3: Reasoning */}
            <div>
              <div className="flex justify-between font-mono text-[10px] mb-2">
                <span className="text-[#e1e2e7]">REASONING</span>
                <span className="text-[#4ade80] font-bold animate-pulse">
                  {liveSignals.reasoning}
                </span>
              </div>
              <div className="flex gap-1 h-2">
                {[20, 40, 60, 80, 100].map((step, i) => (
                  <div
                    key={i}
                    className={`flex-1 rounded-sm transition-all duration-500 ${
                      liveSignals.reasoningValue >= step
                        ? 'bg-[#4ade80] shadow-[0_0_8px_rgba(74,222,128,0.5)]'
                        : 'bg-[#1f2937]'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
};

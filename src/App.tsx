import React, { useState } from 'react';
import {
  ViewMode,
  CandidateProfile,
  QuestionTopic,
  QuestionItem,
  AnswerSubmission,
  AssessmentReport,
  InterviewSession,
} from './types';
import {
  allCandidateProfiles,
  generateQuestionsForCandidate,
} from './data/dataLoader';
import { sampleReport, initialSessions } from './data/mockData';
import { Header } from './components/Header';
import { ShaderBackground } from './components/ShaderBackground';
import { DashboardView } from './components/DashboardView';
import { WorkspaceView } from './components/WorkspaceView';
import { AssessmentReportView } from './components/AssessmentReportView';
import { HistoryView } from './components/HistoryView';
import { SettingsView } from './components/SettingsView';
import { Footer } from './components/Footer';
import { TrustModals, ModalType } from './components/TrustModals';
import { RealInterviewView } from './components/RealInterviewView';
import { RealFeedbackView } from './components/RealFeedbackView';
import { FeedbackReport } from './services/interviewApi';

const SELECTED_CANDIDATE_KEY = 'nexis:selectedCandidate';
const INTERVIEW_SESSION_KEY = 'nexis:interviewSessionId';
const INTERVIEW_MESSAGES_KEY = 'nexis:interviewMessages';
const INTERVIEW_FEEDBACK_KEY = 'nexis:interviewFeedback';

const viewForPath = (): ViewMode => {
  if (window.location.pathname === '/interview') return 'workspace';
  if (window.location.pathname === '/feedback') return 'report';
  return 'dashboard';
};

export default function App() {
  const [currentView, setCurrentView] = useState<ViewMode>(viewForPath);
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [candidate, setCandidate] = useState<CandidateProfile>(allCandidateProfiles[0]);
  const [realFeedback, setRealFeedback] = useState<FeedbackReport | null>(() => {
    try {
      const raw = sessionStorage.getItem(INTERVIEW_FEEDBACK_KEY);
      return raw ? (JSON.parse(raw) as FeedbackReport) : null;
    } catch {
      return null;
    }
  });
  const [realSessionId, setRealSessionId] = useState(() => sessionStorage.getItem(INTERVIEW_SESSION_KEY) || '');

  // Initial questions based on default candidate
  const initialGenerated = generateQuestionsForCandidate(allCandidateProfiles[0]);
  const [topics, setTopics] = useState<QuestionTopic[]>(initialGenerated.topics);
  const [questions, setQuestions] = useState<QuestionItem[]>(initialGenerated.questions);

  const [report, setReport] = useState<AssessmentReport>(sampleReport);
  const [sessions, setSessions] = useState<InterviewSession[]>(initialSessions);

  const navigateTo = (view: ViewMode) => {
    const nextPath = view === 'workspace' ? '/interview' : view === 'report' ? '/feedback' : '/';
    if (window.location.pathname !== nextPath) {
      window.history.pushState(null, '', nextPath);
    }
    setCurrentView(view);
  };

  // When candidate is selected / changed
  const handleSelectCandidateProfile = (selectedCandidate: CandidateProfile) => {
    setCandidate(selectedCandidate);
    const generated = generateQuestionsForCandidate(selectedCandidate);
    setTopics(generated.topics);
    setQuestions(generated.questions);
    sessionStorage.setItem(SELECTED_CANDIDATE_KEY, JSON.stringify(selectedCandidate.rawRecord));
  };

  const handleStartInterview = () => {
    sessionStorage.setItem(SELECTED_CANDIDATE_KEY, JSON.stringify(candidate.rawRecord));
    sessionStorage.removeItem(INTERVIEW_SESSION_KEY);
    sessionStorage.removeItem(INTERVIEW_MESSAGES_KEY);
    sessionStorage.removeItem(INTERVIEW_FEEDBACK_KEY);
    setRealFeedback(null);
    setRealSessionId('');
    navigateTo('workspace');
  };

  const handleRealFeedbackReady = (feedback: FeedbackReport, sessionId: string) => {
    sessionStorage.setItem(INTERVIEW_FEEDBACK_KEY, JSON.stringify(feedback));
    sessionStorage.setItem(INTERVIEW_SESSION_KEY, sessionId);
    setRealFeedback(feedback);
    setRealSessionId(sessionId);
    navigateTo('report');
  };

  const handleNavigate = (view: ViewMode) => {
    if (view === 'workspace') {
      handleStartInterview();
    } else {
      navigateTo(view);
    }
  };

  const handleCompleteSession = async (submissions: AnswerSubmission[]) => {
    try {
      // Call backend API to synthesize full assessment report
      const response = await fetch('/api/generate-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidateName: candidate.name,
          targetRole: candidate.targetRole,
          qaPairs: submissions.map((s) => ({
            question: s.questionText,
            userAnswer: s.userAnswer,
            aiFeedback: s.aiFeedback,
          })),
        }),
      });

      if (response.ok) {
        const generated: AssessmentReport = await response.json();
        const fullReport: AssessmentReport = {
          sessionId: `NEX-${Math.floor(1000 + Math.random() * 9000)}-X`,
          candidateName: candidate.name,
          targetRole: candidate.targetRole,
          timestamp: new Date().toISOString(),
          overallScore: generated.overallScore || 85,
          scoreBadge: generated.scoreBadge || 'STRONG TECHNICAL PERFORMANCE',
          aiSynthesis: generated.aiSynthesis || sampleReport.aiSynthesis,
          competency: generated.competency || sampleReport.competency,
          proficiencies: generated.proficiencies || sampleReport.proficiencies,
          strengths: generated.strengths || sampleReport.strengths,
          growthAreas: generated.growthAreas || sampleReport.growthAreas,
          roadmap: generated.roadmap || sampleReport.roadmap,
          timeline: submissions.map((sub, i) => ({
            time: sub.timestamp || `14:${10 + i * 12}:00`,
            question: sub.questionText,
            userAnswer: sub.userAnswer,
            feedback: sub.aiFeedback || 'Solid technical approach addressing primary architectural constraints.',
            score: sub.score || 8,
            badgeType: (sub.score || 8) >= 8 ? 'primary' : (sub.score || 8) >= 6 ? 'secondary' : 'error',
          })),
        };

        setReport(fullReport);

        const newSessionRecord: InterviewSession = {
          id: fullReport.sessionId,
          date: new Date().toISOString().split('T')[0],
          candidateName: candidate.name,
          targetRole: candidate.targetRole,
          overallScore: fullReport.overallScore,
          status: 'Completed',
          questionsAnswered: submissions.length,
          totalQuestions: questions.length,
          report: fullReport,
        };

        setSessions((prev) => [newSessionRecord, ...prev]);
      } else {
        setReport({
          ...sampleReport,
          candidateName: candidate.name,
          targetRole: candidate.targetRole,
        });
      }
    } catch (error) {
      console.error('Failed to generate report:', error);
      setReport({
        ...sampleReport,
        candidateName: candidate.name,
        targetRole: candidate.targetRole,
      });
    }

    navigateTo('report');
  };

  const handleEndSessionEarly = () => {
    setReport({
      ...sampleReport,
      candidateName: candidate.name,
      targetRole: candidate.targetRole,
    });
    navigateTo('report');
  };

  const handleSelectSessionReport = (session: InterviewSession) => {
    if (session.report) {
      setReport(session.report);
    } else {
      setReport({
        ...sampleReport,
        sessionId: session.id,
        candidateName: session.candidateName,
        targetRole: session.targetRole,
        overallScore: session.overallScore,
      });
    }
    navigateTo('report');
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#05070a] text-[#e1e2e7] font-sans relative selection:bg-[#00dce5] selection:text-[#002021]">
      {/* Dynamic Animated WebGL Shader Canvas Background */}
      <ShaderBackground variant={currentView === 'workspace' ? 'cyan_violet' : 'cyan_violet'} />

      {/* Main Top Console Header */}
      <Header
        currentView={currentView}
        onNavigate={handleNavigate}
        onEndSession={handleEndSessionEarly}
        onOpenModal={setActiveModal}
        questionIndex={1}
        totalQuestions={questions.length}
      />

      {/* View Switcher */}
      <div className="flex-1 flex flex-col relative z-10">
        {currentView === 'dashboard' && (
          <DashboardView
            candidate={candidate}
            onUpdateCandidateProfile={handleSelectCandidateProfile}
            onStartInterview={handleStartInterview}
          />
        )}

        {currentView === 'workspace' && (
          <RealInterviewView
            candidate={candidate}
            onFeedbackReady={handleRealFeedbackReady}
            onReturnHome={() => navigateTo('dashboard')}
          />
        )}

        {currentView === 'report' && (
          realFeedback ? (
            <RealFeedbackView
              feedback={realFeedback}
              candidate={candidate}
              sessionId={realSessionId}
              onRetakeSession={handleStartInterview}
            />
          ) : (
            <RealFeedbackView
              feedback={null}
              candidate={candidate}
              sessionId={realSessionId}
              onRetakeSession={handleStartInterview}
            />
          )
        )}

        {currentView === 'history' && (
          <HistoryView
            sessions={sessions}
            onSelectSessionReport={handleSelectSessionReport}
            onStartNewSession={handleStartInterview}
          />
        )}

        {currentView === 'settings' && (
          <SettingsView
            candidate={candidate}
            onSaveCandidate={setCandidate}
          />
        )}
      </div>

      {/* Footer */}
      <Footer onOpenModal={setActiveModal} />

      {/* Modals for System Status, Privacy, Terms, and License */}
      <TrustModals
        activeModal={activeModal}
        onClose={() => setActiveModal(null)}
      />
    </div>
  );
}

import React, { useState } from 'react';
import {
  ViewMode,
  CandidateProfile,
  InterviewSession,
} from './types';
import { allCandidateProfiles } from './data/dataLoader';
import { Header } from './components/Header';
import { ShaderBackground } from './components/ShaderBackground';
import { DashboardView } from './components/DashboardView';
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

  // Candidates come from the local demo data in src/data/candidate.json.
  // The selected candidate's rawRecord is forwarded to the backend on interview start
  // via POST /api/interview so the AI can personalise its questions.
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

  const [sessions] = useState<InterviewSession[]>([]);

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

  const handleEndSessionEarly = () => {
    setRealFeedback(null);
    navigateTo('report');
  };

  const handleSelectSessionReport = (_session: InterviewSession) => {
    setRealFeedback(null);
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
        totalQuestions={0}
      />

      {/* View Switcher */}
      <div className="flex-1 flex flex-col relative z-10">
        {currentView === 'dashboard' && (
          <DashboardView
            candidate={candidate}
            allProfiles={allCandidateProfiles}
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

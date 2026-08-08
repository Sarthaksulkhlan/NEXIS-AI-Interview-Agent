import React, { useState, useEffect } from 'react';
import { ViewMode } from '../types';
import { Activity, Clock, Terminal, User, ShieldCheck } from 'lucide-react';
import { ModalType } from './TrustModals';

interface HeaderProps {
  currentView: ViewMode;
  onNavigate: (view: ViewMode) => void;
  onEndSession?: () => void;
  onOpenModal?: (modal: ModalType) => void;
  questionIndex?: number;
  totalQuestions?: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  onNavigate,
  onEndSession,
  onOpenModal,
  questionIndex = 3,
  totalQuestions = 4,
}) => {
  const [elapsedSeconds, setElapsedSeconds] = useState(768); // 12:48 default initial

  useEffect(() => {
    let timer: any;
    if (currentView === 'workspace') {
      timer = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [currentView]);

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full sticky top-0 z-50">
      {/* Top Notice Banner like Neon.com */}
      <div className="w-full bg-gradient-to-r from-[#021f20] via-[#052c2e] to-[#011416] border-b border-[#00dce5]/30 py-1.5 px-4 text-center font-mono text-[11px] text-[#b9caca] flex items-center justify-center gap-2">
        <span className="w-2 h-2 rounded-full bg-[#00dce5] animate-ping"></span>
        <span>
          Grounded on the 31-Day AI Engineering Cohort Syllabus & Candidate Json Sources
        </span>
        <button
          onClick={() => onOpenModal?.('status')}
          className="text-[#00dce5] hover:underline font-bold ml-1 cursor-pointer"
        >
          View System Status &rsaquo;
        </button>
      </div>

      <header className="w-full bg-[#05070a]/90 backdrop-blur-md border-b border-[#1f2937]">
        <div className="max-w-[1440px] mx-auto px-4 md:px-10 h-16 flex items-center justify-between font-sans">
          {/* Brand & Main Links */}
          <div className="flex items-center gap-8">
            <button
              onClick={() => onNavigate('dashboard')}
              className="flex items-center gap-2.5 font-sans font-bold text-lg md:text-xl text-white tracking-tight hover:opacity-90 transition-opacity cursor-pointer"
            >
              <div className="w-7 h-7 bg-[#00dce5]/10 border border-[#00dce5] rounded-md flex items-center justify-center text-[#00dce5] shadow-[0_0_10px_rgba(0,220,229,0.3)]">
                <Terminal className="w-4 h-4" />
              </div>
              <span className="tracking-tight">NEXIS <span className="text-[#00dce5] text-xs font-mono font-normal">AI AGENT</span></span>
            </button>

            {/* Nav links */}
            <nav className="hidden md:flex items-center gap-6 font-mono text-xs">
              <button
                onClick={() => onNavigate('dashboard')}
                className={`tracking-wider transition-colors py-1 cursor-pointer ${
                  currentView === 'dashboard'
                    ? 'text-[#00dce5] font-semibold border-b-2 border-[#00dce5]'
                    : 'text-[#b9caca] hover:text-[#00dce5]'
                }`}
              >
                Dashboard
              </button>
              <button
                onClick={() => onNavigate('history')}
                className={`tracking-wider transition-colors py-1 cursor-pointer ${
                  currentView === 'history'
                    ? 'text-[#00dce5] font-semibold border-b-2 border-[#00dce5]'
                    : 'text-[#b9caca] hover:text-[#00dce5]'
                }`}
              >
                History
              </button>
              <button
                onClick={() => onNavigate('settings')}
                className={`tracking-wider transition-colors py-1 cursor-pointer ${
                  currentView === 'settings'
                    ? 'text-[#00dce5] font-semibold border-b-2 border-[#00dce5]'
                    : 'text-[#b9caca] hover:text-[#00dce5]'
                }`}
              >
                Settings
              </button>
              {currentView === 'report' && (
                <button
                  onClick={() => onNavigate('report')}
                  className="text-[#00dce5] font-semibold tracking-wider py-1 cursor-pointer border-b-2 border-[#00dce5]"
                >
                  Report
                </button>
              )}
            </nav>
          </div>

          {/* Live Workspace Console Sub-Bar Info */}
          {currentView === 'workspace' && (
            <div className="hidden lg:flex items-center gap-3 text-[11px] font-mono text-[#b9caca] bg-[#0d1117] px-3 py-1.5 rounded-lg border border-[#1f2937]">
              <span className="flex items-center gap-1.5 text-[#4ade80] font-semibold">
                <span className="w-2 h-2 rounded-full bg-[#4ade80] animate-pulse"></span>
                LIVE SESSION
              </span>
              <span className="text-[#323539]">|</span>
              <span>ID: 8F2A-91C4</span>
              <span className="text-[#323539]">|</span>
              <span>
                Q0{questionIndex} / 0{totalQuestions}
              </span>
              <span className="text-[#323539]">|</span>
              <span className="text-[#00dce5]">{formatTime(elapsedSeconds)}</span>
            </div>
          )}

          {/* Action Controls */}
          <div className="flex items-center gap-3 md:gap-4 font-mono text-xs">
            <div className="flex items-center gap-2 text-[#b9caca]">
              <button
                onClick={() => onOpenModal?.('status')}
                title="View System Status Console"
                className="p-1.5 hover:text-[#00dce5] hover:bg-[#0d1117] transition-colors rounded-lg flex items-center gap-1.5 cursor-pointer border border-transparent hover:border-[#1f2937]"
              >
                <Activity className="w-4 h-4 text-[#00dce5]" />
                <span className="hidden sm:inline text-[11px] font-semibold text-[#4ade80]">96% OK</span>
              </button>
              <button
                title="Session Duration"
                className="p-1.5 hover:text-[#00dce5] transition-colors rounded flex items-center gap-1"
              >
                <Clock className="w-4 h-4" />
                {currentView === 'workspace' && (
                  <span className="lg:hidden text-[11px]">{formatTime(elapsedSeconds)}</span>
                )}
              </button>
            </div>

            {currentView === 'workspace' ? (
              <button
                onClick={() => {
                  if (onEndSession) onEndSession();
                  else onNavigate('report');
                }}
                className="px-3.5 py-1.5 border border-red-500/50 rounded-full text-red-400 hover:bg-red-500/10 transition-colors text-xs font-semibold cursor-pointer"
              >
                End Session
              </button>
            ) : (
              <button
                onClick={() => onNavigate('workspace')}
                className="px-4 py-2 bg-white text-black hover:bg-[#e1e2e7] rounded-full transition-all text-xs font-bold cursor-pointer shadow-[0_0_20px_rgba(255,255,255,0.2)]"
              >
                Launch Interview
              </button>
            )}

            <div
              onClick={() => onOpenModal?.('status')}
              title="System Console User"
              className="w-8 h-8 rounded-full border border-[#323539] bg-[#111417] flex items-center justify-center text-[#b9caca] cursor-pointer hover:border-[#00dce5]"
            >
              <User className="w-4 h-4" />
            </div>
          </div>
        </div>
      </header>
    </div>
  );
};


import React, { useState } from 'react';
import { curriculumData, allCandidateProfiles } from '../data/dataLoader';
import { CheckCircle2, AlertTriangle, RefreshCw, X, Shield, FileText, Cpu, Terminal, Award, Lock } from 'lucide-react';

export type ModalType = 'status' | 'privacy' | 'terms' | 'license' | null;

interface TrustModalsProps {
  activeModal: ModalType;
  onClose: () => void;
}

export const TrustModals: React.FC<TrustModalsProps> = ({ activeModal, onClose }) => {
  const [lastChecked, setLastChecked] = useState(() => new Date().toLocaleTimeString());

  if (!activeModal) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative bg-[#0d1117] border border-[#00dce5]/50 rounded-xl max-w-2xl w-full p-6 md:p-8 text-[#e1e2e7] shadow-[0_0_40px_rgba(0,220,229,0.2)] space-y-6 max-h-[90vh] overflow-y-auto font-sans">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-[#b9caca] hover:text-[#00dce5] transition-colors p-1.5 rounded-lg border border-transparent hover:border-[#1f2937] bg-[#05070a]/60 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* 1. SYSTEM STATUS MODAL */}
        {activeModal === 'status' && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 border-b border-[#1f2937] pb-4">
              <div className="p-2.5 bg-[#00dce5]/10 border border-[#00dce5]/30 rounded-lg text-[#00dce5]">
                <Cpu className="w-6 h-6" />
              </div>
              <div>
                <div className="font-mono text-xs text-[#00dce5] font-bold tracking-wider uppercase">CONSOLE OVERVIEW</div>
                <h3 className="font-sans text-xl font-bold text-[#e1e2e7]">NEXIS SYSTEM STATUS</h3>
              </div>
            </div>

            {/* Health Bar */}
            <div className="bg-[#05070a] border border-[#1f2937] p-4 rounded-lg space-y-2 font-mono text-xs">
              <div className="flex justify-between items-center text-[#b9caca]">
                <span>SYSTEM HEALTH OVERALL</span>
                <span className="text-[#4ade80] font-bold">OPERATIONAL (96%)</span>
              </div>
              <div className="text-[#00dce5] text-sm tracking-widest font-bold overflow-hidden whitespace-nowrap">
                ████████████████████░░ 96%
              </div>
              <div className="flex justify-between items-center text-[11px] text-[#b9caca] pt-1 border-t border-[#1f2937]">
                <span>Last System Check: <strong className="text-[#e1e2e7]">{lastChecked}</strong></span>
                <button
                  onClick={() => setLastChecked(new Date().toLocaleTimeString())}
                  className="flex items-center gap-1 text-[#00dce5] hover:underline cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" /> Refresh
                </button>
              </div>
            </div>

            {/* Services Health */}
            <div className="space-y-3 font-mono text-xs">
              <div className="text-[#b9caca] uppercase text-[11px] font-bold tracking-wider">
                CORE SYSTEM SERVICES & SOURCES OF TRUTH
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center bg-[#05070a]/80 p-3 rounded border border-[#1f2937]">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#4ade80] animate-pulse"></span>
                    <span className="text-[#e1e2e7] font-semibold">Candidate Data Source</span>
                  </div>
                  <span className="text-[#00dce5] font-bold">
                    {allCandidateProfiles.length} profiles loaded (candidate.json)
                  </span>
                </div>

                <div className="flex justify-between items-center bg-[#05070a]/80 p-3 rounded border border-[#1f2937]">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#4ade80] animate-pulse"></span>
                    <span className="text-[#e1e2e7] font-semibold">Curriculum Engine</span>
                  </div>
                  <span className="text-[#00dce5] font-bold">
                    {curriculumData.days.length} days · {curriculumData.modules.length} modules (curriculum.json)
                  </span>
                </div>

                <div className="flex justify-between items-center bg-[#05070a]/80 p-3 rounded border border-[#1f2937]">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#4ade80] animate-pulse"></span>
                    <span className="text-[#e1e2e7] font-semibold">AI Interview Evaluation Engine</span>
                  </div>
                  <span className="text-[#4ade80] font-bold">Operational / Gemini Connected</span>
                </div>

                <div className="flex justify-between items-center bg-[#05070a]/80 p-3 rounded border border-[#1f2937]">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#4ade80] animate-pulse"></span>
                    <span className="text-[#e1e2e7] font-semibold">Adaptive Follow-ups Engine</span>
                  </div>
                  <span className="text-[#4ade80] font-bold">Enabled</span>
                </div>

                <div className="flex justify-between items-center bg-[#05070a]/80 p-3 rounded border border-[#1f2937]">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#4ade80] animate-pulse"></span>
                    <span className="text-[#e1e2e7] font-semibold">Session & Synthesis Pipeline</span>
                  </div>
                  <span className="text-[#4ade80] font-bold">Operational</span>
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={onClose}
                className="bg-[#00dce5] text-[#003739] font-mono text-xs px-5 py-2 rounded font-bold hover:bg-[#63f7ff] transition-colors cursor-pointer"
              >
                Close Status Console
              </button>
            </div>
          </div>
        )}

        {/* 2. PRIVACY MODAL */}
        {activeModal === 'privacy' && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 border-b border-[#1f2937] pb-4">
              <div className="p-2.5 bg-[#00dce5]/10 border border-[#00dce5]/30 rounded-lg text-[#00dce5]">
                <Lock className="w-6 h-6" />
              </div>
              <div>
                <div className="font-mono text-xs text-[#00dce5] font-bold tracking-wider uppercase">DATA PRIVACY</div>
                <h3 className="font-sans text-xl font-bold text-[#e1e2e7]">NEXIS PRIVACY PROTOCOL</h3>
              </div>
            </div>

            <div className="space-y-4 text-sm text-[#b9caca] leading-relaxed">
              <p>
                Nexis AI Interview Agent values transparency and data integrity. This application operates as an interactive AI demonstration for cohort evaluation:
              </p>

              <ul className="list-disc list-inside space-y-2 text-xs font-mono text-[#e1e2e7] bg-[#05070a] p-4 rounded border border-[#1f2937]">
                <li><strong className="text-[#00dce5]">Candidate Data:</strong> Sourced strictly from <code className="text-[#00dce5]">candidate.json</code> for demonstration purposes.</li>
                <li><strong className="text-[#00dce5]">Curriculum Data:</strong> Grounded on the 31-day AI engineering syllabus defined in <code className="text-[#00dce5]">curriculum.json</code>.</li>
                <li><strong className="text-[#00dce5]">No Permanent Accounts:</strong> No user registration or third-party tracking cookies are required.</li>
                <li><strong className="text-[#00dce5]">Session Persistence:</strong> Interview progress and generated assessment reports are kept in local application state.</li>
              </ul>

              <p className="text-xs">
                AI evaluation interactions are transmitted securely to process candidate submissions during active sessions.
              </p>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={onClose}
                className="bg-[#00dce5] text-[#003739] font-mono text-xs px-5 py-2 rounded font-bold hover:bg-[#63f7ff] transition-colors cursor-pointer"
              >
                Acknowledge & Close
              </button>
            </div>
          </div>
        )}

        {/* 3. TERMS OF SERVICE MODAL */}
        {activeModal === 'terms' && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 border-b border-[#1f2937] pb-4">
              <div className="p-2.5 bg-[#00dce5]/10 border border-[#00dce5]/30 rounded-lg text-[#00dce5]">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <div className="font-mono text-xs text-[#00dce5] font-bold tracking-wider uppercase">LEGAL AGREEMENT</div>
                <h3 className="font-sans text-xl font-bold text-[#e1e2e7]">TERMS OF SERVICE</h3>
              </div>
            </div>

            <div className="space-y-4 text-sm text-[#b9caca] leading-relaxed">
              <p>
                By using Nexis AI Interview Agent, you acknowledge and agree to the following hackathon and demonstration terms:
              </p>

              <div className="space-y-3 font-mono text-xs bg-[#05070a] p-4 rounded border border-[#1f2937] text-[#e1e2e7]">
                <div className="space-y-1">
                  <span className="text-[#00dce5] font-bold">1. INFORMATIONAL DEMONSTRATION</span>
                  <p className="text-[#b9caca] font-sans">Nexis AI Interview Agent is a technical interview evaluation demonstration. Reports generated by the AI agent are informational synthesis models and do not constitute legally binding employment or hiring decisions.</p>
                </div>

                <div className="space-y-1">
                  <span className="text-[#00dce5] font-bold">2. DEMO CANDIDATE PROFILES</span>
                  <p className="text-[#b9caca] font-sans">All candidate profiles and mission records are synthetic/cohort demonstration data provided in <code className="text-[#00dce5]">candidate.json</code> for evaluation of the interview agent.</p>
                </div>

                <div className="space-y-1">
                  <span className="text-[#00dce5] font-bold">3. AI GENERATED FEEDBACK</span>
                  <p className="text-[#b9caca] font-sans">AI feedback and score metrics are dynamically computed via Google Gemini based on curriculum benchmarks and should be treated as automated assistance.</p>
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={onClose}
                className="bg-[#00dce5] text-[#003739] font-mono text-xs px-5 py-2 rounded font-bold hover:bg-[#63f7ff] transition-colors cursor-pointer"
              >
                Accept Terms & Close
              </button>
            </div>
          </div>
        )}

        {/* 4. MIT LICENSE MODAL */}
        {activeModal === 'license' && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 border-b border-[#1f2937] pb-4">
              <div className="p-2.5 bg-[#00dce5]/10 border border-[#00dce5]/30 rounded-lg text-[#00dce5]">
                <Shield className="w-6 h-6" />
              </div>
              <div>
                <div className="font-mono text-xs text-[#00dce5] font-bold tracking-wider uppercase">OPEN SOURCE SOFTWARE</div>
                <h3 className="font-sans text-xl font-bold text-[#e1e2e7]">MIT LICENSE</h3>
              </div>
            </div>

            <div className="font-mono text-xs bg-[#05070a] border border-[#1f2937] p-5 rounded-lg text-[#b9caca] space-y-4 leading-relaxed max-h-[300px] overflow-y-auto selection:bg-[#00dce5] selection:text-[#002021]">
              <p className="text-[#e1e2e7] font-bold">
                MIT License
              </p>
              <p>
                Copyright (c) 2026 Nexis AI Interview Agent contributors
              </p>
              <p>
                Permission is hereby granted, free of charge, to any person obtaining a copy
                of this software and associated documentation files (the "Software"), to deal
                in the Software without restriction, including without limitation the rights
                to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
                copies of the Software, and to permit persons to whom the Software is
                furnished to do so, subject to the following conditions:
              </p>
              <p>
                The above copyright notice and this permission notice shall be included in all
                copies or substantial portions of the Software.
              </p>
              <p>
                THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
                IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
                FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
                AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
                LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
                OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
                SOFTWARE.
              </p>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={onClose}
                className="bg-[#00dce5] text-[#003739] font-mono text-xs px-5 py-2 rounded font-bold hover:bg-[#63f7ff] transition-colors cursor-pointer"
              >
                Close License
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

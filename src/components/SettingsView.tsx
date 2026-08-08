import React, { useState } from 'react';
import { CandidateProfile } from '../types';
import { Settings, Save, Check, Cpu, ShieldCheck } from 'lucide-react';

interface SettingsViewProps {
  candidate: CandidateProfile;
  onSaveCandidate: (updated: CandidateProfile) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  candidate,
  onSaveCandidate,
}) => {
  const [name, setName] = useState(candidate.name);
  const [role, setRole] = useState(candidate.targetRole);
  const [missionsCount, setMissionsCount] = useState(candidate.dataMissionsCount);
  const [difficulty, setDifficulty] = useState(candidate.difficulty);
  const [savedMessage, setSavedMessage] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveCandidate({
      ...candidate,
      name,
      targetRole: role,
      dataMissionsCount: missionsCount,
      difficulty,
    });
    setSavedMessage(true);
    setTimeout(() => setSavedMessage(false), 2000);
  };

  return (
    <div className="w-full max-w-[1440px] mx-auto px-4 md:px-10 py-10 space-y-8 text-[#e1e2e7] font-sans">
      <div className="border-b border-[#323539] pb-6">
        <h1 className="font-sans font-extrabold text-2xl sm:text-3xl text-[#e1e2e7] flex items-center gap-3">
          <Settings className="w-7 h-7 text-[#00dce5]" />
          System Settings & Syllabus Configuration
        </h1>
        <p className="font-mono text-xs text-[#b9caca] mt-1">
          Customize your candidate profile, target interview difficulty, and AI evaluation parameters.
        </p>
      </div>

      <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7 bg-[#0c0e12] border border-[#1f2937] p-6 md:p-8 rounded-xl space-y-6">
          <h2 className="font-mono text-xs text-[#00dce5] uppercase tracking-wider font-semibold border-b border-[#323539] pb-3 flex items-center gap-2">
            <Cpu className="w-4 h-4" />
            Candidate & Target Role
          </h2>

          <div className="space-y-4 font-mono text-xs">
            <div>
              <label className="block text-[#b9caca] mb-1">Candidate Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-[#05070a] border border-[#1f2937] text-[#e1e2e7] font-mono text-sm px-4 py-2.5 rounded focus:border-[#00dce5] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[#b9caca] mb-1">Target Engineering Role</label>
              <input
                type="text"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full bg-[#05070a] border border-[#1f2937] text-[#e1e2e7] font-mono text-sm px-4 py-2.5 rounded focus:border-[#00dce5] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[#b9caca] mb-1">Completed Cohort Missions Count</label>
              <input
                type="number"
                value={missionsCount}
                onChange={(e) => setMissionsCount(Number(e.target.value))}
                className="w-full bg-[#05070a] border border-[#1f2937] text-[#e1e2e7] font-mono text-sm px-4 py-2.5 rounded focus:border-[#00dce5] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[#b9caca] mb-1">Target Assessment Level</label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as any)}
                className="w-full bg-[#05070a] border border-[#1f2937] text-[#e1e2e7] font-mono text-sm px-4 py-2.5 rounded focus:border-[#00dce5] focus:outline-none"
              >
                <option value="Mid-Level">Mid-Level AI Engineer</option>
                <option value="Senior">Senior AI Engineer / Architect</option>
                <option value="Staff / Principal">Staff / Principal AI Systems Engineer</option>
              </select>
            </div>
          </div>

          <div className="pt-4 flex items-center gap-4">
            <button
              type="submit"
              className="bg-[#0d1117] border border-[#00dce5] text-[#00dce5] hover:bg-[#00dce5]/10 font-mono text-xs font-semibold px-6 py-3 rounded transition-all flex items-center gap-2 cursor-pointer shadow-[0_0_15px_-3px_rgba(0,220,229,0.3)]"
            >
              <Save className="w-4 h-4" />
              <span>Save Configuration</span>
            </button>

            {savedMessage && (
              <span className="font-mono text-xs text-[#4ade80] flex items-center gap-1">
                <Check className="w-4 h-4" /> Saved successfully!
              </span>
            )}
          </div>
        </div>

        <div className="lg:col-span-5 bg-[#0c0e12] border border-[#1f2937] p-6 md:p-8 rounded-xl space-y-6">
          <h2 className="font-mono text-xs text-[#d0bcff] uppercase tracking-wider font-semibold border-b border-[#323539] pb-3 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4" />
            AI Assessor Engine
          </h2>

          <div className="space-y-4 text-xs font-mono text-[#b9caca]">
            <div className="p-3 bg-[#05070a] border border-[#1f2937] rounded">
              <span className="text-[#e1e2e7] font-bold block mb-1">Evaluator Model</span>
              <p>gemini-3.6-flash (Server-side Gemini API)</p>
            </div>

            <div className="p-3 bg-[#05070a] border border-[#1f2937] rounded">
              <span className="text-[#e1e2e7] font-bold block mb-1">Adaptive Signals Engine</span>
              <p>Active (Real-time Technical Depth, Communication & Reasoning Scoring)</p>
            </div>

            <div className="p-3 bg-[#05070a] border border-[#1f2937] rounded">
              <span className="text-[#e1e2e7] font-bold block mb-1">Report Synthesis</span>
              <p>Dynamic Radar Competency Mapping & Interactive Interview Timeline Review</p>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

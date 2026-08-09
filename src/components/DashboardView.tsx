import React, { useState, useEffect } from 'react';
import { CandidateProfile, CurriculumData, CandidateMission } from '../types';
import { curriculumData } from '../data/dataLoader';
import {
  ArrowRight,
  Cpu,
  Sparkles,
  Info,
  Play,
  UserCheck,
  Award,
  BookOpen,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ChevronDown,
  Layers,
  Search,
  Zap,
  Activity,
  GitBranch,
  Radio,
} from 'lucide-react';

interface DashboardViewProps {
  candidate: CandidateProfile;
  allProfiles: CandidateProfile[];
  onUpdateCandidateProfile: (selectedCandidate: CandidateProfile) => void;
  onStartInterview: () => void;
}

const HERO_PHRASES = [
  'YOUR COHORT BUILT THE SKILLS.',
  'NOW PROVE YOU UNDERSTAND THEM.',
  '31 DAYS OF AI ENGINEERING. ONE CONVERSATION TO PROVE IT.',
];

export const DashboardView: React.FC<DashboardViewProps> = ({
  candidate,
  allProfiles,
  onUpdateCandidateProfile,
  onStartInterview,
}) => {
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [selectedModule, setSelectedModule] = useState<number | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [candidateSearch, setCandidateSearch] = useState('');

  // Typewriter effect state
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [displayText, setDisplayText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) {
      setDisplayText('YOUR COHORT BUILT THE SKILLS. NOW PROVE YOU UNDERSTAND THEM.');
      return;
    }

    const currentPhrase = HERO_PHRASES[phraseIndex];
    let timer: any;

    if (!isDeleting) {
      if (displayText.length < currentPhrase.length) {
        timer = setTimeout(() => {
          setDisplayText(currentPhrase.slice(0, displayText.length + 1));
        }, 45);
      } else {
        timer = setTimeout(() => {
          setIsDeleting(true);
        }, 2800);
      }
    } else {
      if (displayText.length > 0) {
        timer = setTimeout(() => {
          setDisplayText(currentPhrase.slice(0, displayText.length - 1));
        }, 20);
      } else {
        setIsDeleting(false);
        setPhraseIndex((prev) => (prev + 1) % HERO_PHRASES.length);
      }
    }

    return () => clearTimeout(timer);
  }, [displayText, isDeleting, phraseIndex]);

  // Filter candidates by search term against the live profiles list
  const filteredCandidates = allProfiles.filter(
    (c) =>
      c.name.toLowerCase().includes(candidateSearch.toLowerCase()) ||
      c.targetRole.toLowerCase().includes(candidateSearch.toLowerCase())
  );

  // Map of selected candidate missions for fast lookup by day number
  const candidateMissionMap = new Map<number, CandidateMission>(
    candidate.missions.map((m) => [m.day, m])
  );

  // Filter curriculum days by module and search query
  const filteredDays = curriculumData.days.filter((day) => {
    const matchesSearch =
      day.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      day.tools.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase())) ||
      day.type.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (selectedModule === 'ALL') return true;

    const mod = curriculumData.modules.find((m) => m.n === selectedModule);
    if (!mod) return true;
    return day.day >= mod.days[0] && day.day <= mod.days[1];
  });

  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'SETUP':
        return 'bg-blue-900/30 text-blue-400 border-blue-800/50';
      case 'BUILD':
        return 'bg-cyan-900/30 text-[#00dce5] border-[#00dce5]/30';
      case 'AI_CORE':
      case 'LEARN':
        return 'bg-purple-900/30 text-[#d0bcff] border-[#d0bcff]/30';
      case 'SHIP_IT':
      case 'OPTIMIZE':
        return 'bg-emerald-900/30 text-emerald-400 border-emerald-800/50';
      case 'CAPSTONE':
        return 'bg-amber-900/30 text-amber-400 border-amber-800/50';
      default:
        return 'bg-[#1f2937] text-[#b9caca] border-[#323539]';
    }
  };

  const topicFlow = ['EMBEDDINGS', 'RETRIEVAL', 'RAG', 'AGENTS', 'MCP', 'PRODUCTION AI'];

  return (
    <div className="relative min-h-[calc(100vh-128px)] flex flex-col justify-between py-8 md:py-12">
      <div className="w-full max-w-[1440px] mx-auto px-4 md:px-10 z-10 space-y-12">
        
        {/* HERO HEADER SECTION - NEXIS AGENT STYLED */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center border-b border-[#1f2937] pb-12 pt-4">
          <div className="lg:col-span-7 flex flex-col space-y-6 bg-[#070b12]/85 backdrop-blur-xl border border-[#1f2937]/80 p-6 sm:p-8 rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.8)]">
            {/* Eyebrow badge */}
            <div className="flex items-center gap-2 text-xs font-mono text-[#b9caca] uppercase tracking-widest">
              <span className="w-2.5 h-2.5 bg-[#00dce5] rounded-sm rotate-45 inline-block shrink-0 shadow-[0_0_8px_#00dce5]"></span>
              <span>NEXIS AI INTERVIEW AGENT · 31-DAY AI COHORT PLATFORM</span>
            </div>

            {/* Main Hero Title & Character Typewriter */}
            <div className="space-y-3">
              <h1 className="font-sans text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-[1.15]">
                NEXIS <span className="text-[#00dce5]">AI INTERVIEW AGENT</span>
              </h1>
              
              {/* Dynamic Typewriter Reveal Headline */}
              <div className="min-h-[48px] flex items-center pt-1">
                <span className="font-mono text-sm sm:text-base md:text-lg text-[#00dce5] bg-[#00dce5]/10 px-3.5 py-1.5 rounded-xl border border-[#00dce5]/30 font-bold tracking-wide shadow-[0_0_15px_rgba(0,220,229,0.15)] flex items-center gap-2">
                  <span>&gt;</span>
                  <span>{displayText}</span>
                  <span className="inline-block w-2 h-4 bg-[#00dce5] ml-1 animate-pulse align-middle rounded-sm"></span>
                </span>
              </div>
            </div>

            <p className="font-sans text-base md:text-lg text-[#cbd5e1] max-w-2xl leading-relaxed font-medium">
              Curriculum-grounded, multi-turn technical evaluation analyzing engineering depth across retrieval, RAG, agents, MCP, and AI infrastructure.
            </p>

            {/* Neon-Style Action Pills */}
            <div className="flex flex-wrap items-center gap-4 pt-3">
              <button
                onClick={onStartInterview}
                className="bg-white text-black text-sm px-7 py-3.5 rounded-full font-bold hover:bg-[#e1e2e7] transition-all duration-200 flex items-center justify-center gap-2.5 cursor-pointer shadow-[0_0_25px_rgba(255,255,255,0.25)] group"
              >
                <Zap className="w-4 h-4 fill-black text-black group-hover:scale-110 transition-transform" />
                <span>Launch Interview: {candidate.name}</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>

              <button
                onClick={() => setShowHowItWorks(true)}
                className="border border-[#323539] bg-[#0d1117] text-white hover:border-[#00dce5] hover:text-[#00dce5] text-sm px-6 py-3.5 rounded-full font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Info className="w-4 h-4 text-[#00dce5]" />
                <span>How It Works</span>
              </button>
            </div>
          </div>

          {/* CANDIDATE SELECTOR CONTAINER - IMPOSSIBLE TO MISS */}
          <div className="lg:col-span-5 relative">
            <div className="relative p-[2px] rounded-2xl bg-gradient-to-r from-[#00dce5] via-blue-500 via-violet-500 to-fuchsia-500 shadow-[0_0_35px_rgba(0,220,229,0.3)]">
              <div className="bg-[#0d1117]/95 backdrop-blur-xl p-6 rounded-[14px] space-y-4">
                
                {/* Header Tag */}
                <div className="flex justify-between items-center pb-3 border-b border-[#1f2937]">
                  <div>
                    <div className="font-mono text-xs text-[#00dce5] font-bold tracking-widest uppercase flex items-center gap-2">
                      <span className="bg-[#00dce5]/20 text-[#00dce5] px-2 py-0.5 rounded border border-[#00dce5]/40 font-bold">
                        01 / CANDIDATE
                      </span>
                      <span>SELECT YOUR CANDIDATE</span>
                    </div>
                    <p className="font-sans text-xs text-[#b9caca] mt-1">
                      Choose a candidate profile to personalize the interview.
                    </p>
                  </div>
                  <span className="font-mono text-[10px] text-[#00dce5] bg-[#05070a] px-2 py-1 rounded border border-[#00dce5]/30 font-bold shrink-0">
                    {allProfiles.length} PROFILES
                  </span>
                </div>

                {/* Prominent Dropdown */}
                <div>
                  <label className="block font-mono text-xs text-[#e1e2e7] font-semibold mb-2">
                    Active Candidate Profile (candidate.json):
                  </label>
                  <div className="relative">
                    <select
                      value={candidate.id}
                      onChange={(e) => {
                        const found = allProfiles.find((c) => c.id === e.target.value);
                        if (found) onUpdateCandidateProfile(found);
                      }}
                      className="w-full bg-[#05070a] border-2 border-[#00dce5] text-[#e1e2e7] font-mono text-xs px-3.5 py-3 rounded-lg appearance-none focus:outline-none focus:border-[#63f7ff] cursor-pointer pr-10 shadow-[0_0_15px_rgba(0,220,229,0.2)] font-semibold"
                    >
                      {allProfiles.map((c) => (
                        <option key={c.id} value={c.id} className="bg-[#05070a] text-white">
                          {c.name} — {c.targetRole} ({c.signals.missionsCompleted} missions)
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-[#00dce5] absolute right-3.5 top-3.5 pointer-events-none" />
                  </div>
                </div>

                {/* Selected Profile Highlight Card */}
                <div className="bg-[#05070a] p-4 rounded-xl border border-[#1f2937] space-y-2.5 font-mono text-xs">
                  <div className="flex justify-between items-center border-b border-[#1f2937] pb-2">
                    <span className="text-[#00dce5] font-bold text-sm">{candidate.name}</span>
                    <span className="text-[#d0bcff] font-semibold">{candidate.targetRole}</span>
                  </div>
                  <div className="flex justify-between items-center text-[#b9caca]">
                    <span>Experience / Education:</span>
                    <span className="text-[#e1e2e7] font-medium">{candidate.yearsExperience} yrs · {candidate.education}</span>
                  </div>
                  <div className="flex justify-between items-center text-[#b9caca]">
                    <span>Cohort Commit / Missions:</span>
                    <span className="text-[#00dce5] font-bold">
                      {candidate.signals.commitDays} Days | {candidate.signals.missionsCompleted}/31 Missions
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[#b9caca]">
                    <span>First-Try Pass Rate:</span>
                    <span className="text-[#4ade80] font-bold">
                      {candidate.signals.missionsFirstTry} / {candidate.signals.missionsCompleted} ({Math.round((candidate.signals.missionsFirstTry / Math.max(1, candidate.signals.missionsCompleted)) * 100)}%)
                    </span>
                  </div>
                </div>

                {/* Topic Signals */}
                <div>
                  <span className="block font-mono text-[11px] text-[#b9caca] mb-1.5 font-semibold">
                    Derived Candidate Skill Signals:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {candidate.topicSignals.map((sig) => (
                      <span
                        key={sig}
                        className="font-mono text-[10px] px-2 py-0.5 bg-[#05070a] border border-[#3a494a] text-[#d0bcff] rounded uppercase font-semibold"
                      >
                        {sig}
                      </span>
                    ))}
                  </div>
                </div>

              </div>
            </div>
          </div>
        </section>

        {/* LIVE AI ENGINE SYSTEM ARCHITECTURE VISUAL */}
        <section className="bg-[#0d1117]/90 border border-[#1f2937] p-6 md:p-8 rounded-2xl space-y-6 shadow-xl relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1f2937] pb-4">
            <div>
              <div className="font-mono text-xs text-[#00dce5] font-bold tracking-wider uppercase flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#00dce5]" />
                <span>LIVE SYSTEM ARCHITECTURE</span>
              </div>
              <h2 className="font-sans text-xl font-bold text-[#e1e2e7] mt-1">
                Curriculum-Grounded Adaptive Interview Engine
              </h2>
            </div>
            <div className="flex items-center gap-2 font-mono text-xs text-[#4ade80] bg-[#05070a] px-3 py-1.5 rounded-lg border border-[#1f2937]">
              <span className="w-2 h-2 rounded-full bg-[#4ade80] animate-ping"></span>
              <span>STATE: OPERATIONAL</span>
            </div>
          </div>

          {/* Flow Nodes Diagram */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {[
              { step: '01', title: 'CANDIDATE', desc: candidate.name, detail: candidate.targetRole },
              { step: '02', title: 'CURRICULUM CONTEXT', desc: '31 Days · 8 Modules', detail: 'curriculum.json' },
              { step: '03', title: 'ADAPTIVE REASONING', desc: 'Intersection Mapping', detail: 'Gemini 2.5 Flash' },
              { step: '04', title: 'LIVE INTERVIEW', desc: 'Multi-Turn Session', detail: 'Adaptive Follow-ups' },
              { step: '05', title: 'SYNTHESIS REPORT', desc: 'Competency Analysis', detail: 'Automated Evaluation' },
            ].map((node, i) => (
              <div
                key={node.step}
                className="bg-[#05070a] border border-[#1f2937] hover:border-[#00dce5]/60 p-4 rounded-xl font-mono space-y-2 transition-all relative group"
              >
                <div className="flex justify-between items-center text-[10px] text-[#b9caca]">
                  <span className="text-[#00dce5] font-bold">STEP {node.step}</span>
                  <span className="text-[#d0bcff]">{node.detail}</span>
                </div>
                <div className="font-bold text-xs text-[#e1e2e7] group-hover:text-[#00dce5] transition-colors">
                  {node.title}
                </div>
                <div className="text-[11px] text-[#b9caca]">{node.desc}</div>
              </div>
            ))}
          </div>

          {/* Topic Progression Stream */}
          <div className="pt-2 border-t border-[#1f2937] space-y-2">
            <span className="font-mono text-[11px] text-[#b9caca] block font-semibold uppercase tracking-wider">
              DYNAMIC CURRICULUM TOPIC PROGRESSION STREAM:
            </span>
            <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
              {topicFlow.map((topic, i) => (
                <React.Fragment key={topic}>
                  <span className="px-3 py-1 bg-[#05070a] border border-[#00dce5]/30 text-[#00dce5] rounded-lg font-bold shadow-[0_0_10px_rgba(0,220,229,0.15)] hover:border-[#00dce5] transition-all cursor-default">
                    {topic}
                  </span>
                  {i < topicFlow.length - 1 && (
                    <span className="text-[#d0bcff] font-bold">→</span>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        </section>

        {/* CANDIDATE MISSION JOURNEY VIEW */}
        <section className="bg-[#0d1117]/80 border border-[#1f2937] p-6 rounded-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-[#1f2937]">
            <div>
              <h2 className="font-mono text-sm text-[#00dce5] font-bold flex items-center gap-2 uppercase tracking-wider">
                <Award className="w-4 h-4" />
                <span>{candidate.name}'s Cohort Mission Journey</span>
              </h2>
              <p className="font-sans text-xs text-[#b9caca] mt-1">
                Candidate's actual recorded mission outcomes across the 31-day curriculum from candidate.json
              </p>
            </div>
            <div className="flex items-center gap-3 font-mono text-[11px]">
              <span className="flex items-center gap-1 text-[#4ade80]">
                <CheckCircle2 className="w-3.5 h-3.5" /> Passed
              </span>
              <span className="flex items-center gap-1 text-amber-400">
                <HelpCircle className="w-3.5 h-3.5" /> Skipped
              </span>
              <span className="flex items-center gap-1 text-red-400">
                <XCircle className="w-3.5 h-3.5" /> Failed
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 pt-2">
            {candidate.missions.map((m) => (
              <div
                key={m.day}
                className={`p-3 rounded-lg border font-mono text-xs flex flex-col justify-between space-y-2 transition-all ${
                  m.passed
                    ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-200 hover:border-emerald-500'
                    : m.skipped
                    ? 'bg-amber-950/20 border-amber-800/40 text-amber-200 hover:border-amber-500'
                    : 'bg-red-950/20 border-red-800/40 text-red-200 hover:border-red-500'
                }`}
              >
                <div className="flex justify-between items-start">
                  <span className="font-bold text-[10px] opacity-75">DAY {m.day < 10 ? '0' + m.day : m.day}</span>
                  {m.passed ? (
                    <span className="text-[10px] bg-emerald-900/50 px-1.5 py-0.5 rounded text-emerald-300 font-bold">
                      {m.attempts} attempt{m.attempts && m.attempts > 1 ? 's' : ''}
                    </span>
                  ) : m.skipped ? (
                    <span className="text-[10px] bg-amber-900/50 px-1.5 py-0.5 rounded text-amber-300 font-bold">
                      SKIPPED
                    </span>
                  ) : (
                    <span className="text-[10px] bg-red-900/50 px-1.5 py-0.5 rounded text-red-300 font-bold">
                      FAILED
                    </span>
                  )}
                </div>
                <div className="font-sans font-medium text-xs leading-snug line-clamp-2">
                  {m.title}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* INTERACTIVE 31-DAY CURRICULUM EXPLORER */}
        <section className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#1f2937] pb-4">
            <div>
              <div className="font-mono text-xs text-[#d0bcff] font-semibold flex items-center gap-2 mb-1">
                <BookOpen className="w-4 h-4 text-[#00dce5]" />
                <span>AUTHORITATIVE CURRICULUM (curriculum.json)</span>
              </div>
              <h2 className="font-sans text-xl font-bold text-[#e1e2e7]">
                31-Day AI Engineering Cohort Map & Modules
              </h2>
            </div>

            {/* Filter Search */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative min-w-[220px]">
                <input
                  type="text"
                  placeholder="Search days or tools..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#05070a] border border-[#1f2937] text-[#e1e2e7] font-mono text-xs px-3 py-2 pl-8 rounded focus:border-[#00dce5] focus:outline-none"
                />
                <Search className="w-3.5 h-3.5 text-[#b9caca] absolute left-2.5 top-2.5 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Module Selector Tabs */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedModule('ALL')}
              className={`font-mono text-xs px-3.5 py-1.5 rounded transition-colors cursor-pointer border ${
                selectedModule === 'ALL'
                  ? 'bg-[#00dce5] text-[#003739] font-bold border-[#00dce5]'
                  : 'bg-[#0d1117] text-[#b9caca] border-[#1f2937] hover:border-[#00dce5]/50'
              }`}
            >
              All Modules (31 Days)
            </button>
            {curriculumData.modules.map((mod) => (
              <button
                key={mod.n}
                onClick={() => setSelectedModule(mod.n)}
                className={`font-mono text-xs px-3.5 py-1.5 rounded transition-colors cursor-pointer border ${
                  selectedModule === mod.n
                    ? 'bg-[#00dce5] text-[#003739] font-bold border-[#00dce5]'
                    : 'bg-[#0d1117] text-[#b9caca] border-[#1f2937] hover:border-[#00dce5]/50'
                }`}
              >
                Mod {mod.n}: {mod.title}
              </button>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDays.map((day) => {
              const mission = candidateMissionMap.get(day.day);

              return (
                <div
                  key={day.day}
                  className="bg-[#0d1117] border border-[#1f2937] hover:border-[#00dce5]/60 p-5 rounded-xl transition-all shadow-lg flex flex-col justify-between space-y-4 group"
                >
                  <div>
                    {/* Card Header */}
                    <div className="flex justify-between items-start gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-[#00dce5] bg-[#00dce5]/10 px-2 py-0.5 rounded border border-[#00dce5]/30">
                          DAY {day.day < 10 ? '0' + day.day : day.day}
                        </span>
                        <span className={`font-mono text-[10px] px-2 py-0.5 rounded border ${getTypeBadgeColor(day.type)}`}>
                          {day.type}
                        </span>
                      </div>

                      {/* Candidate Status Indicator for this day */}
                      {mission ? (
                        mission.passed ? (
                          <span className="font-mono text-[10px] bg-emerald-950/80 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded font-bold flex items-center gap-1 shrink-0">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            Passed ({mission.attempts}x)
                          </span>
                        ) : mission.skipped ? (
                          <span className="font-mono text-[10px] bg-amber-950/80 text-amber-300 border border-amber-800 px-2 py-0.5 rounded font-bold flex items-center gap-1 shrink-0">
                            <HelpCircle className="w-3 h-3 text-amber-400" />
                            Skipped
                          </span>
                        ) : (
                          <span className="font-mono text-[10px] bg-red-950/80 text-red-300 border border-red-800 px-2 py-0.5 rounded font-bold flex items-center gap-1 shrink-0">
                            <XCircle className="w-3 h-3 text-red-400" />
                            Failed
                          </span>
                        )
                      ) : (
                        <span className="font-mono text-[10px] bg-[#05070a] text-[#b9caca]/60 border border-[#1f2937] px-2 py-0.5 rounded">
                          In Cohort
                        </span>
                      )}
                    </div>

                    {/* Day Title */}
                    <h3 className="font-sans font-bold text-base text-[#e1e2e7] group-hover:text-[#00dce5] transition-colors leading-snug">
                      {day.title}
                    </h3>

                    {/* Objectives */}
                    <div className="mt-3 space-y-1">
                      <span className="font-mono text-[10px] text-[#b9caca] block uppercase tracking-wider font-semibold">
                        Learning Objectives:
                      </span>
                      <ul className="list-disc list-inside space-y-1 text-xs text-[#b9caca] pl-1 font-sans">
                        {day.objectives.slice(0, 3).map((obj, i) => (
                          <li key={i} className="line-clamp-1">{obj}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Tools Badges */}
                  <div className="pt-2 border-t border-[#1f2937]/80">
                    <span className="font-mono text-[10px] text-[#b9caca] block mb-1.5 font-semibold">
                      STACK & TOOLS:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {day.tools.map((tool) => (
                        <span
                          key={tool}
                          className="font-mono text-[10px] px-2 py-0.5 bg-[#05070a] border border-[#1f2937] text-[#e1e2e7] rounded"
                        >
                          {tool}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* HOW IT WORKS MODAL */}
      {showHowItWorks && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-[#0d1117] border border-[#00dce5] p-6 md:p-8 rounded-xl max-w-2xl w-full text-[#e1e2e7] space-y-6 shadow-[0_0_40px_rgba(0,220,229,0.2)]">
            <div className="flex justify-between items-center border-b border-[#1f2937] pb-4">
              <h3 className="font-sans font-bold text-xl text-[#00dce5] flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                How Nexis AI Interview Agent Works
              </h3>
              <button
                onClick={() => setShowHowItWorks(false)}
                className="text-[#b9caca] hover:text-white font-mono text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 font-sans text-sm text-[#b9caca]">
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-[#00dce5]/10 text-[#00dce5] flex items-center justify-center font-mono font-bold shrink-0">
                  1
                </div>
                <div>
                  <h4 className="font-semibold text-[#e1e2e7]">Authoritative Data Sources</h4>
                  <p>All candidates and cohort curriculum topics are parsed directly from <code className="text-[#00dce5]">candidate.json</code> and <code className="text-[#00dce5]">curriculum.json</code>.</p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-[#00dce5]/10 text-[#00dce5] flex items-center justify-center font-mono font-bold shrink-0">
                  2
                </div>
                <div>
                  <h4 className="font-semibold text-[#e1e2e7]">Intersection Question Generation</h4>
                  <p>Interview questions are generated at the exact intersection of the selected candidate's completed missions and the 31-day curriculum milestones.</p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-[#00dce5]/10 text-[#00dce5] flex items-center justify-center font-mono font-bold shrink-0">
                  3
                </div>
                <div>
                  <h4 className="font-semibold text-[#e1e2e7]">Adaptive Evaluation & Assessment Report</h4>
                  <p>Answers are analyzed live via Gemini for technical depth, trade-offs, and communication skills, yielding an automated assessment report.</p>
                </div>
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <button
                onClick={() => {
                  setShowHowItWorks(false);
                  onStartInterview();
                }}
                className="bg-[#00dce5] text-[#003739] font-mono text-xs px-6 py-2.5 rounded font-bold hover:bg-[#63f7ff] transition-colors flex items-center gap-2 cursor-pointer"
              >
                <Play className="w-4 h-4" />
                Start Interview Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


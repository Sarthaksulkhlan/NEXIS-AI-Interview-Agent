import curriculumRaw from './curriculum.json';
import candidateRaw from './candidate.json';
import {
  CandidateProfile,
  CandidateRecord,
  CurriculumData,
} from '../types';

export const curriculumData = curriculumRaw as CurriculumData;

export const rawCandidateList = candidateRaw.candidates as CandidateRecord[];

export function mapRawCandidateToProfile(rec: CandidateRecord): CandidateProfile {
  const m = rec.member;
  
  // Extract topic signals from candidate's missions
  const topicSignalsSet = new Set<string>();
  rec.missions.forEach((mission) => {
    const dayObj = curriculumData.days.find((d) => d.day === mission.day);
    if (dayObj) {
      dayObj.tools.slice(0, 2).forEach((tool) => topicSignalsSet.add(tool.toUpperCase()));
    }
  });

  const topicSignals = Array.from(topicSignalsSet).slice(0, 5);
  if (topicSignals.length === 0) {
    topicSignals.push('RAG', 'PYTHON', 'AI CORE');
  }

  let difficulty: 'Mid-Level' | 'Senior' | 'Staff / Principal' = 'Mid-Level';
  if (m.yearsExperience >= 10) {
    difficulty = 'Staff / Principal';
  } else if (m.yearsExperience >= 4) {
    difficulty = 'Senior';
  }

  return {
    id: m.id,
    name: m.name,
    targetRole: m.jobRole,
    yearsExperience: m.yearsExperience,
    education: m.education,
    status: m.status,
    dataMissionsCount: rec.signals.missionsCompleted,
    difficulty,
    topicSignals,
    signals: rec.signals,
    missions: rec.missions,
    rawRecord: rec,
  };
}

export const allCandidateProfiles: CandidateProfile[] = rawCandidateList.map(mapRawCandidateToProfile);

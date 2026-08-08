export type ViewMode = 'dashboard' | 'workspace' | 'report' | 'history' | 'settings';

export interface CandidateMember {
  id: string;
  name: string;
  jobRole: string;
  yearsExperience: number;
  education: string;
  status: string;
}

export interface CandidateMission {
  day: number;
  title: string;
  passed?: boolean;
  skipped?: boolean;
  attempts?: number;
}

export interface CandidateSignals {
  commitDays: number;
  missionsCompleted: number;
  missionsFirstTry: number;
}

export interface CandidateRecord {
  member: CandidateMember;
  missions: CandidateMission[];
  signals: CandidateSignals;
}

export interface CurriculumModule {
  n: number;
  title: string;
  days: [number, number];
}

export interface CurriculumDay {
  day: number;
  title: string;
  type: string;
  tools: string[];
  objectives: string[];
}

export interface CurriculumData {
  cohort: string;
  modules: CurriculumModule[];
  days: CurriculumDay[];
}

export interface CandidateProfile {
  id: string;
  name: string;
  targetRole: string;
  yearsExperience: number;
  education: string;
  status: string;
  dataMissionsCount: number;
  difficulty: 'Mid-Level' | 'Senior' | 'Staff / Principal';
  topicSignals: string[];
  signals: CandidateSignals;
  missions: CandidateMission[];
  rawRecord: CandidateRecord;
}

export interface InterviewSession {
  id: string;
  date: string;
  candidateName: string;
  targetRole: string;
  overallScore: number;
  status: 'Completed' | 'In Progress';
  questionsAnswered: number;
  totalQuestions: number;
}

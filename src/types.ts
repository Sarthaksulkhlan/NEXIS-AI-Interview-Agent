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

export interface QuestionTopic {
  id: string;
  dayLabel: string;
  title: string;
  status: 'completed' | 'in_progress' | 'upcoming';
}

export interface QuestionItem {
  id: string;
  topicId: string;
  versionLabel: string; // e.g. "AI INTERVIEWER - V-04"
  dayLabel: string; // e.g. "DAY 10 | RETRIEVAL & MATCHING ENGINE"
  questionText: string;
  followUpText?: string;
  defaultPromptHint?: string;
}

export interface AnswerSubmission {
  questionId: string;
  questionText: string;
  userAnswer: string;
  timestamp: string;
  aiFeedback?: string;
  score?: number;
  depthScore?: number;
  commScore?: number;
  reasoningScore?: number;
}

export interface LiveSignalMetrics {
  technicalDepth: 'LOW' | 'MEDIUM' | 'SOLID' | 'HIGH';
  communication: 'BASIC' | 'SOLID' | 'EXCELLENT';
  reasoning: 'ANALYZING' | 'STRUCTURED' | 'DEEP';
  depthValue: number; // 0 - 100
  commValue: number; // 0 - 100
  reasoningValue: number; // 0 - 100
}

export interface CompetencyData {
  technicalDepth: number;
  architecture: number;
  problemSolving: number;
  communication: number;
  bestPractices: number;
}

export interface TopicProficiency {
  topic: string;
  percentage: number;
  colorClass?: string;
}

export interface InsightItem {
  id: string;
  title: string;
  scoreLabel: string;
  description: string;
  type: 'strength' | 'growth';
}

export interface LearningStep {
  stepNumber: string;
  icon: string;
  title: string;
  subtitle: string;
}

export interface AssessmentReport {
  sessionId: string;
  candidateName: string;
  targetRole: string;
  timestamp: string;
  overallScore: number;
  scoreBadge: string;
  aiSynthesis: string;
  competency: CompetencyData;
  proficiencies: TopicProficiency[];
  strengths: InsightItem[];
  growthAreas: InsightItem[];
  roadmap: LearningStep[];
  timeline: {
    time: string;
    question: string;
    userAnswer: string;
    feedback: string;
    score: number;
    badgeType: 'primary' | 'secondary' | 'error';
  }[];
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
  report?: AssessmentReport;
}

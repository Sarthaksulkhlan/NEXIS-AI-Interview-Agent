import curriculumRaw from './curriculum.json';
import candidateRaw from './candidate.json';
import {
  CandidateProfile,
  CandidateRecord,
  CurriculumData,
  QuestionItem,
  QuestionTopic,
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

// Generate questions dynamic to the candidate's mission history & curriculum
export function generateQuestionsForCandidate(candidate: CandidateProfile): {
  topics: QuestionTopic[];
  questions: QuestionItem[];
} {
  // Select 8 key days from the curriculum
  // Prefer days where the candidate has mission history, or key technical milestones
  const candidateMissionDaysMap = new Map(
    candidate.missions.map((m) => [m.day, m])
  );

  // Key milestone day choices covering the 8 curriculum modules
  const candidateDaysList = candidate.missions.map((m) => m.day);
  
  // Choose up to 8 representative days
  const keyDaysToCover = [1, 4, 7, 10, 12, 16, 22, 23, 28, 31];
  
  // Merge candidates actual mission days first, then fallback
  const chosenDaysSet = new Set<number>();
  candidateDaysList.forEach((d) => chosenDaysSet.add(d));
  keyDaysToCover.forEach((d) => chosenDaysSet.add(d));

  // Take 8-10 distinct days sorted ascending
  const selectedDays = Array.from(chosenDaysSet)
    .sort((a, b) => a - b)
    .slice(0, 9);

  const topics: QuestionTopic[] = [];
  const questions: QuestionItem[] = [];

  selectedDays.forEach((dayNum, idx) => {
    const dayObj = curriculumData.days.find((d) => d.day === dayNum) || {
      day: dayNum,
      title: `Day ${dayNum} Learning Objective`,
      type: 'BUILD',
      tools: ['Python', 'AI'],
      objectives: ['Master day learning objectives'],
    };

    const mission = candidateMissionDaysMap.get(dayNum);
    const missionStatusStr = mission
      ? mission.passed
        ? `Passed in ${mission.attempts || 1} attempt(s)`
        : mission.skipped
        ? 'Skipped during cohort'
        : 'Attempted / Failed'
      : 'Curriculum Milestone';

    const topicId = `topic-day-${dayNum}`;
    topics.push({
      id: topicId,
      dayLabel: `DAY ${dayNum < 10 ? '0' + dayNum : dayNum} | ${dayObj.title.toUpperCase()}`,
      title: dayObj.title,
      status: idx === 0 ? 'completed' : idx === 1 ? 'in_progress' : 'upcoming',
    });

    // Custom tailored question text based on tools and objectives
    const primaryTool = dayObj.tools[0] || 'AI Frameworks';
    const primaryObjective = dayObj.objectives[0] || 'implement core features';
    const secondaryObjective = dayObj.objectives[1] || 'manage error conditions and trade-offs';

    let questionText = '';
    let followUpText = '';
    let promptHint = '';

    if (dayNum <= 3) {
      questionText = `Regarding Day ${dayNum} (${dayObj.title}): How did you structure your ${primaryTool} environment to handle production dependencies and clean API separation for your ${candidate.targetRole} workload?`;
      followUpText = `Specifically address how you connected frontend endpoints to backend services while handling error boundaries. (${missionStatusStr})`;
      promptHint = `In my Day ${dayNum} setup, I used virtual environments and scaffolded clean API routes with FastAPI. We enforced strict typing with Pylance and ensured async request handling across clients.`;
    } else if (dayNum <= 6) {
      questionText = `For Day ${dayNum} (${dayObj.title}): Walk us through your strategy for processing both structured and unstructured healthcare/enterprise data using ${dayObj.tools.join(', ')}.`;
      followUpText = `Explain how you chunk documents, attach source metadata, and ensure text normalization before vector storage. (${missionStatusStr})`;
      promptHint = `I normalized unstructured PDF/Word inputs using pdfplumber/BeautifulSoup, attached rich source metadata tags, and used recursive character text splitters to produce 512-token chunks with 10% overlap.`;
    } else if (dayNum <= 10) {
      questionText = `In Day ${dayNum} (${dayObj.title}): You worked with ${dayObj.tools.join(' & ')}. How do you design a high-throughput retrieval & matching engine that balances vector similarity search with structured SQL filtering?`;
      followUpText = `Detail index build trade-offs (e.g. HNSW graph build vs flat search) and how you avoid query latency spikes during background index updates. (${missionStatusStr})`;
      promptHint = `I built a hybrid query router that executes pre-filtering via SQL for structured metadata, followed by ANN vector retrieval in ChromaDB. For high-throughput writes, I buffer delta vectors in memory before asynchronous HNSW index swaps.`;
    } else if (dayNum <= 15) {
      questionText = `Addressing Day ${dayNum} (${dayObj.title}): How do you implement robust prompt engineering, schema-validated function calling with Pydantic, and evaluate fine-tuning vs RAG for ${candidate.targetRole} applications?`;
      followUpText = `Cover zero-shot vs few-shot prompting, function call schema enforcement, and LoRA/QLoRA parameter efficiency. (${missionStatusStr})`;
      promptHint = `I defined strict Pydantic schemas for LLM tool selection and enforced JSON mode. For domain alignment, I compared RAG context injection against LoRA parameter-efficient fine-tuning on domain-specific QA pairs.`;
    } else if (dayNum <= 20) {
      questionText = `For Day ${dayNum} (${dayObj.title}): How do you build an end-to-end full-stack AI service using ${dayObj.tools.join(', ')} featuring real-time streaming responses and conversation memory management?`;
      followUpText = `Discuss Server-Sent Events / StreamingResponse, token window trimming, and session persistence. (${missionStatusStr})`;
      promptHint = `I implemented Server-Sent Events in FastAPI using StreamingResponse. Conversation history is persisted in SQLite, with an sliding token window summarizer to keep prompts within LLM token limits without dropping context.`;
    } else if (dayNum <= 24) {
      questionText = `On Day ${dayNum} (${dayObj.title}): Explain your design for agentic reasoning and Model Context Protocol (MCP) integrations using ${dayObj.tools.join(', ')}.`;
      followUpText = `How do you prevent infinite loop recursions, handle tool call failures gracefully, and maintain state isolation between multi-agent routines? (${missionStatusStr})`;
      promptHint = `I implemented a LangChain/ReAct agent backed by an MCP tool server. To prevent agent loops, I enforce hard step budgets (max 10 steps), state action hashing for cycle detection, and fallback escalation handlers.`;
    } else if (dayNum <= 28) {
      questionText = `Regarding Day ${dayNum} (${dayObj.title}): What is your end-to-end architecture for securing, containerizing, and deploying AI agent workloads with ${dayObj.tools.join(', ')}?`;
      followUpText = `Address prompt injection defense, input sanitization, Docker container security, and Kubernetes pod scaling. (${missionStatusStr})`;
      promptHint = `I containerized the FastAPI backend and React frontend with multi-stage Docker builds. Security controls include input sanitization, OAuth scope boundaries on MCP tools, and rate-limiting ingress in Kubernetes.`;
    } else {
      questionText = `For Day ${dayNum} (${dayObj.title}): Describe your capstone architecture combining retrieval, agentic tool invocation, MCP protocols, and production monitoring.`;
      followUpText = `How do you evaluate candidate output quality, measure latency metrics with Prometheus/Grafana, and handle live failure modes? (${missionStatusStr})`;
      promptHint = `My capstone unifies ChromaDB hybrid retrieval with a multi-agent router exposing MCP tools. Observability is provided via Prometheus metrics tracking P99 token latency, tool execution success, and cost telemetry.`;
    }

    questions.push({
      id: `q-day-${dayNum}`,
      topicId,
      versionLabel: `NEXIS AI AGENT - V-04`,
      dayLabel: `DAY ${dayNum < 10 ? '0' + dayNum : dayNum} | ${dayObj.title.toUpperCase()}`,
      questionText,
      followUpText,
      defaultPromptHint: promptHint,
    });
  });

  return { topics, questions };
}

import {
  CandidateProfile,
  QuestionTopic,
  QuestionItem,
  AssessmentReport,
  InterviewSession,
} from '../types';

export const initialCandidate: CandidateProfile = {
  id: 'CAND-003',
  name: 'Emily Chen',
  targetRole: 'AI Engineer',
  yearsExperience: 6,
  education: 'MS Artificial Intelligence',
  status: 'COMPLETED',
  dataMissionsCount: 31,
  difficulty: 'Senior',
  topicSignals: ['RAG', 'AGENTS', 'MCP', 'PRODUCTION AI'],
  signals: { commitDays: 31, missionsCompleted: 31, missionsFirstTry: 30 },
  missions: [],
  rawRecord: {
    member: {
      id: 'CAND-003',
      name: 'Emily Chen',
      jobRole: 'AI Engineer',
      yearsExperience: 6,
      education: 'MS Artificial Intelligence',
      status: 'COMPLETED',
    },
    missions: [],
    signals: { commitDays: 31, missionsCompleted: 31, missionsFirstTry: 30 },
  },
};

export const defaultTopics: QuestionTopic[] = [
  {
    id: 'topic-1',
    dayLabel: 'DAY 04 | EMBEDDINGS & VECTOR SPACES',
    title: 'Embeddings Strategy',
    status: 'completed',
  },
  {
    id: 'topic-2',
    dayLabel: 'DAY 10 | RETRIEVAL & MATCHING ENGINE',
    title: 'Vector Retrieval Ops',
    status: 'in_progress',
  },
  {
    id: 'topic-3',
    dayLabel: 'DAY 18 | AGENTIC ORCHESTRATION',
    title: 'Generation & Context',
    status: 'upcoming',
  },
  {
    id: 'topic-4',
    dayLabel: 'DAY 28 | PRODUCTION SECURITY & MCP',
    title: 'MCP Integration & Security',
    status: 'upcoming',
  },
];

export const defaultQuestions: QuestionItem[] = [
  {
    id: 'q1',
    topicId: 'topic-1',
    versionLabel: 'AI INTERVIEWER - V-04',
    dayLabel: 'DAY 04 | EMBEDDINGS & VECTOR SPACES',
    questionText:
      'How do you design a high-throughput RAG ingestion pipeline handling multi-modal documents without bottlenecking embedding generation?',
    followUpText:
      'Specifically, address chunking strategy, queueing mechanisms, and batching limits.',
    defaultPromptHint:
      'I recommend using an event-driven queueing system (e.g. SQS or Kafka) with sliding-window chunking (10% overlap). Workers process documents asynchronously, batching texts to the Gemini embedding API before bulk-upserting into HNSW indexes.',
  },
  {
    id: 'q2',
    topicId: 'topic-2',
    versionLabel: 'AI INTERVIEWER - V-04',
    dayLabel: 'DAY 10 | RETRIEVAL & MATCHING ENGINE',
    questionText:
      "You mentioned using an HNSW index for vector similarity search. In a production scenario where your document corpus is growing rapidly (e.g., thousands of new chunks per minute) and you need near real-time retrieval updates, how would you handle the trade-offs of HNSW's build time?",
    followUpText:
      'Specifically, address how you might manage the indexing process without degrading read latency for concurrent search queries.',
    defaultPromptHint:
      'To manage HNSW build overhead in high-ingestion workloads, I employ a two-tier architecture: a fast inverted/flat index (or memory buffer) for live delta writes and background HNSW graph construction with shadow index swapping to preserve p99 read latency.',
  },
  {
    id: 'q3',
    topicId: 'topic-3',
    versionLabel: 'AI INTERVIEWER - V-04',
    dayLabel: 'DAY 18 | AGENTIC ORCHESTRATION',
    questionText:
      'How do you prevent agentic loops and state explosion when managing multi-tool setups with autonomous LLM workers?',
    followUpText:
      'Address hard step limits, semantic state diversity checks, and circuit-breaker patterns.',
    defaultPromptHint:
      'I enforce a finite state machine wrapper with strict max-step budgets, semantic action hashing to detect identical repeated steps, and automatic fallback escalation handlers.',
  },
  {
    id: 'q4',
    topicId: 'topic-4',
    versionLabel: 'AI INTERVIEWER - V-04',
    dayLabel: 'DAY 28 | PRODUCTION SECURITY & MCP',
    questionText:
      'Describe your comprehensive approach to securing an LLM endpoint and Model Context Protocol (MCP) tool integrations against indirect prompt injection and unauthorized execution.',
    followUpText:
      'Detail input sanitization, tool authorization boundaries, and sandboxed tool execution.',
    defaultPromptHint:
      'I implement multi-layered defenses: structured schemas with strict validation, prompt guardrail classifiers, OAuth scope-restricted tool definitions, and isolated WASM/Docker sandboxes for executing untrusted tool code.',
  },
];

export const sampleReport: AssessmentReport = {
  sessionId: 'REQ-7734-X',
  candidateName: 'Emily Chen',
  targetRole: 'AI Engineer',
  timestamp: '2024-10-27T14:32:00Z',
  overallScore: 82,
  scoreBadge: 'STRONG TECHNICAL PERFORMANCE',
  aiSynthesis:
    'The candidate demonstrated a highly capable understanding of modern AI infrastructure, specifically excelling in Retrieval-Augmented Generation (RAG) architectures and Agentic workflows. System design approaches were pragmatic and scalable. While core ML concepts like embeddings were solid, there are minor areas for improvement regarding edge-case security considerations in multi-tenant MCP deployments. Overall, the candidate exhibits senior-level architectural intuition.',
  competency: {
    technicalDepth: 85,
    architecture: 90,
    problemSolving: 75,
    communication: 88,
    bestPractices: 70,
  },
  proficiencies: [
    { topic: 'RAG Architecture', percentage: 95, colorClass: 'bg-primary-fixed-dim' },
    { topic: 'Agents & Tooling', percentage: 90, colorClass: 'bg-primary-fixed-dim' },
    { topic: 'Embeddings', percentage: 80, colorClass: 'bg-secondary-fixed-dim' },
    { topic: 'MCP Integration', percentage: 70, colorClass: 'bg-outline' },
    { topic: 'System Security', percentage: 40, colorClass: 'bg-error' },
  ],
  strengths: [
    {
      id: 's1',
      title: '✓ STRONG RAG FUNDAMENTALS',
      scoreLabel: '95/100',
      description:
        'Articulated a clear strategy for hierarchical HNSW indexing and metadata filtering before semantic search, significantly reducing latency.',
      type: 'strength',
    },
    {
      id: 's2',
      title: '✓ AGENT ARCHITECTURE',
      scoreLabel: '90/100',
      description:
        'Proposed an elegant state-machine approach for multi-agent handoffs, preventing infinite loops during complex task resolution.',
      type: 'strength',
    },
  ],
  growthAreas: [
    {
      id: 'g1',
      title: '⚠ PROMPT INJECTION DEFENSES',
      scoreLabel: '40/100',
      description:
        'Missed critical considerations for parameterized execution when dealing with untrusted user inputs in downstream RAG pipelines.',
      type: 'growth',
    },
    {
      id: 'g2',
      title: '⚠ TOKEN ECONOMICS',
      scoreLabel: '65/100',
      description:
        'Context window management strategy relied too heavily on blind truncation rather than semantic summarization or recursive retrieval.',
      type: 'growth',
    },
  ],
  roadmap: [
    {
      stepNumber: '01',
      icon: 'menu_book',
      title: 'Study AI Security',
      subtitle: 'Review OWASP LLM Top 10',
    },
    {
      stepNumber: '02',
      icon: 'model_training',
      title: 'Context Management',
      subtitle: 'Context-Aware Summarization',
    },
    {
      stepNumber: '03',
      icon: 'code_blocks',
      title: 'Practical Lab',
      subtitle: 'Implement Semantic Chunking',
    },
  ],
  timeline: [
    {
      time: '14:02:15',
      question: 'Design a high-throughput RAG ingestion pipeline.',
      userAnswer:
        "I'd use an event-driven architecture. Raw documents hit an S3 bucket, triggering an SQS queue. A fleet of worker nodes pulls from the queue, performs OCR if necessary, chunks the text using a sliding window approach with 10% overlap, and then batches them for embedding generation via an API. Finally, they're bulk-upserted into a Pinecone index, with metadata stored in Postgres for pre-filtering.",
      feedback:
        'Excellent structural design. The candidate correctly identified the need for decoupling ingestion from processing using message queues. The mention of sliding window chunking with overlap shows practical implementation knowledge.',
      score: 9,
      badgeType: 'primary',
    },
    {
      time: '14:15:30',
      question: 'How do you prevent agentic loops in multi-tool setups?',
      userAnswer:
        "I implement a strict state machine with a max-steps counter. Every tool invocation increments the counter. If it hits the threshold, the agent is forced to return an 'escalate to human' response. Additionally, I enforce semantic diversity checks—if the agent's internal thought process is semantically identical to its previous three steps, it triggers a circuit breaker.",
      feedback:
        'Very sophisticated answer. The combination of hard limits (max-steps) and soft/heuristic limits (semantic diversity checks) demonstrates deep experience with autonomous agents in production.',
      score: 10,
      badgeType: 'secondary',
    },
    {
      time: '14:28:10',
      question:
        'Describe your approach to securing an LLM endpoint against injection.',
      userAnswer:
        "I usually put a system prompt at the top saying 'You are a helpful assistant. Do not ignore these instructions.' and then append the user query at the bottom.",
      feedback:
        'Insufficient response. Relying solely on instructional constraints in the system prompt is naive and easily bypassed by modern injection techniques. Missing concepts: Guardrails, input sanitization, secondary evaluation models, and strict parsing.',
      score: 3,
      badgeType: 'error',
    },
  ],
};

export const initialSessions: InterviewSession[] = [
  {
    id: 'session-1',
    date: '2024-10-27',
    candidateName: 'Emily Chen',
    targetRole: 'AI Engineer',
    overallScore: 82,
    status: 'Completed',
    questionsAnswered: 4,
    totalQuestions: 4,
    report: sampleReport,
  },
  {
    id: 'session-2',
    date: '2024-10-20',
    candidateName: 'Emily Chen',
    targetRole: 'Senior RAG Architect',
    overallScore: 91,
    status: 'Completed',
    questionsAnswered: 4,
    totalQuestions: 4,
  },
  {
    id: 'session-3',
    date: '2024-10-12',
    candidateName: 'Emily Chen',
    targetRole: 'LLM Systems Engineer',
    overallScore: 74,
    status: 'Completed',
    questionsAnswered: 4,
    totalQuestions: 4,
  },
];

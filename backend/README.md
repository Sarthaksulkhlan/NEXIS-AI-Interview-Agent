# AI Interview Agent — Deterministic Controller MVP

A production-quality, deterministic AI Interview Agent built with FastAPI and Python. The agent conducts personalized, multi-turn technical interviews grounded strictly in a 31-day curriculum, evaluates candidate answers across key dimensions, adapts difficulty dynamically, guarantees minimum coverage requirements, and compiles evidence-based feedback reports.

---

## 1. Core Architecture Philosophy

> **"The controller decides. The LLM speaks."**

In this architecture, the deterministic controller manages all state transitions, topic selection, difficulty adjustments, follow-up decisions, and completion gating. The LLM is restricted to three narrow, non-authoritative roles:
1. **Question Generator** — Generates conversational question text for a specific topic, action, and difficulty.
2. **Answer Evaluator** — Grades candidate answers against ground-truth curriculum objectives returning strict JSON.
3. **Feedback Generator** — Compiles structured assessment reports based on observed transcript evaluations.

```
CLIENT (Web UI / Test Harness)
  │
  │ POST /api/interview  { sessionId, candidate } | { sessionId, message }
  ▼
FastAPI Layer (app/main.py -> app/api/interview.py)
  │
  ▼
Interview Controller (app/controller/interview_controller.py)
  ├── Candidate Model (app/services/candidate_service.py)
  │   ├── strong_days (passed with <= 2 attempts)
  │   ├── uncertain_days (passed with >= 3 attempts)
  │   ├── weak_days (passed == False, prioritized)
  │   └── skipped_days (skipped == True, HARD-EXCLUDED)
  │
  ├── Curriculum Index (app/services/curriculum_service.py)
  │   └── Direct dict lookup by day number: curriculum_by_day[day]
  │
  ├── Coverage Tracker (app/services/coverage_tracker.py)
  │   └── Flat per-day objective checklist from curriculum.json
  │
  ├── Minimum Requirements Guarantee (Hard Code Check)
  │   └── questions_asked >= 8 AND unique_curriculum_days >= 4
  │
  └── LLM Service Layer (app/llm/)
      ├── Question Generator (app/llm/question_generator.py)
      ├── Answer Evaluator (app/llm/answer_evaluator.py)
      └── Feedback Generator (app/llm/feedback_generator.py)
```

---

## 2. Key Engineering Decisions

### 1. Zero Unnecessary RAG / No Vector or Graph Databases
- The curriculum is static, structured, and compact (17.8 KB, 31 days with integer keys).
- Stored directly in memory as `dict[int, CurriculumDay]`.
- Direct $O(1)$ dictionary lookup by day number is 100% exact, deterministic, instantaneous, and immune to embedding drift or vector hallucination.

### 2. Skipped vs. Failed Days Policy
- **Skipped Days (`skipped: true`)**: Hard-excluded from eligible days. The candidate never studied these days, so asking about them adds zero diagnostic value.
- **Failed Days (`passed: false`)**: Prioritized as primary probe targets to test if the candidate has closed their understanding gaps.

### 3. Hard Minimum Requirements Guarantee
The interview cannot terminate until both conditions are met in deterministic code:
```python
def minimum_requirements_met(session: InterviewSession) -> bool:
    return (
        session.questions_asked >= 8
        and len(set(session.days_asked)) >= 4
    )
```

### 4. Injection-Resistant Evaluator
Candidate answers are explicitly tagged as untrusted data. The evaluator prompt and fallback parsing ignore any embedded system prompt overrides or jailbreak attempts.

---

## 3. Project Structure

```
interview-agent/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                     # FastAPI application & lifespan
│   │   ├── config.py                   # Pydantic BaseSettings configuration
│   │   ├── api/
│   │   │   ├── __init__.py
│   │   │   └── interview.py            # POST /api/interview endpoint
│   │   ├── controller/
│   │   │   ├── __init__.py
│   │   │   └── interview_controller.py # Core deterministic state machine
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   ├── curriculum.py           # Curriculum Pydantic schemas
│   │   │   ├── candidate.py            # Candidate profile & model schemas
│   │   │   ├── evaluation.py           # Evaluation scores & patterns
│   │   │   └── interview.py            # Session state & API request/response
│   │   ├── services/
│   │   │   ├── __init__.py
│   │   │   ├── curriculum_service.py   # In-memory curriculum loader
│   │   │   ├── candidate_service.py    # Deterministic candidate classification
│   │   │   ├── coverage_tracker.py     # Flat per-day objective checklist
│   │   │   └── session_manager.py      # In-memory thread-safe session store
│   │   ├── llm/
│   │   │   ├── __init__.py
│   │   │   ├── client.py               # HTTP client (OpenAI & Anthropic)
│   │   │   ├── question_generator.py   # Grounded single-question generator
│   │   │   ├── answer_evaluator.py     # Schema-validated answer grader
│   │   │   └── feedback_generator.py   # 4-field feedback report compiler
│   │   ├── prompts/
│   │   │   ├── question_generator.txt
│   │   │   ├── evaluator.txt
│   │   │   ├── feedback.txt
│   │   │   └── interviewer.txt
│   │   └── data/
│   │       ├── curriculum.json
│   │       └── candidates.json
│   ├── tests/
│   │   ├── test_candidate_model.py     # Candidate classification tests
│   │   ├── test_coverage.py            # Objective checklist & follow-up caps
│   │   ├── test_controller.py          # State machine transitions & difficulty
│   │   ├── test_requirements.py        # Verification of >=8 Qs and >=4 days
│   │   ├── test_api.py                 # FastAPI route contract tests
│   │   └── test_e2e_interview.py       # Full E2E candidate simulations
│   ├── requirements.txt
│   ├── .env.example
│   └── README.md
└── frontend/
    └── index.html                      # Live interactive chat demo UI
```

---

## 4. Setup and Installation

### Prerequisites
- Python 3.10+ (tested on Python 3.11, 3.12, 3.13)
- pip and virtualenv

### 1. Clone & Navigate
```bash
git clone <repo-url>
cd interview-agent/backend
```

### 2. Create Virtual Environment

#### On Linux / macOS:
```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

#### On Windows (PowerShell):
```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

#### On Windows (Command Prompt):
```cmd
python -m venv venv
.\venv\Scripts\activate.bat
pip install -r requirements.txt
```

---

## 5. Configuration & Environment Variables

Copy the example environment file:
```bash
cp .env.example .env
```

### Key Environment Variables

| Variable | Default | Description |
|---|---|---|
| `MOCK_LLM` | `true` | When `true`, uses deterministic, zero-cost question bank & evaluator |
| `LLM_PROVIDER` | `openai` | `openai`, `anthropic`, `groq`, `ollama`, or `custom` |
| `LLM_API_KEY` | `None` | API key for the chosen LLM provider |
| `LLM_MODEL` | `gpt-4o-mini` | Model identifier |
| `ANTHROPIC_API_KEY`| `None` | Anthropic Claude API key |
| `ANTHROPIC_MODEL` | `claude-3-5-sonnet-20241022` | Claude model identifier |
| `MIN_QUESTIONS_REQUIRED` | `8` | Non-negotiable question floor |
| `MIN_UNIQUE_DAYS_REQUIRED` | `4` | Non-negotiable unique days floor |
| `MAX_FOLLOWUPS_PER_DAY` | `2` | Max follow-up depth before switching topic |

---

## 6. Running the Application

### Start Backend API Server
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at:
- **API Endpoint:** `POST http://localhost:8000/api/interview`
- **Health Check:** `GET http://localhost:8000/health`
- **Swagger Docs:** `http://localhost:8000/docs`

---

## 7. Running the Automated Tests

Run the full automated test suite (22 unit, controller, API, requirement guarantee, and E2E tests):
```bash
pytest -v
```

All tests run cleanly in < 1 second using the deterministic engine.

---

## 8. API Specification & Request Examples

The application exposes the single mandatory endpoint:

```
POST /api/interview
```

### 1. Start Interview Request
Initializes the session with candidate data:
```json
POST /api/interview
Content-Type: application/json

{
  "sessionId": "demo-001",
  "candidate": {
    "member": {
      "id": "CAND-018",
      "name": "Diane Foster",
      "jobRole": "AI Engineer",
      "yearsExperience": 4,
      "education": "MS Computer Science",
      "status": "COMPLETED"
    },
    "missions": [
      { "day": 7, "title": "Embeddings Explained", "passed": true, "attempts": 1 },
      { "day": 8, "title": "Vector Databases Overview", "passed": true, "attempts": 1 },
      { "day": 10, "title": "Retrieval & Matching Engine", "passed": true, "attempts": 1 },
      { "day": 12, "title": "Prompt Engineering Fundamentals", "passed": true, "attempts": 1 },
      { "day": 22, "title": "Multi-Agent Orchestration", "passed": true, "attempts": 1 },
      { "day": 23, "title": "Model Context Protocol (MCP)", "passed": true, "attempts": 1 }
    ],
    "signals": { "commitDays": 31, "missionsCompleted": 31, "missionsFirstTry": 31 }
  }
}
```

#### Response:
```json
{
  "reply": "Welcome Diane Foster. Let's begin the interview. How did you connect your retrieval engine to an LLM to build an end-to-end RAG pipeline?",
  "done": false
}
```

---

### 2. Conversational Turn Request
Subsequent candidate turns pass the session ID and message:
```json
POST /api/interview
Content-Type: application/json

{
  "sessionId": "demo-001",
  "message": "We built our retrieval pipeline using ChromaDB with HNSW vector indexing and cosine similarity. We added metadata pre-filtering on healthcare policy tiers to narrow the search space before running similarity checks, keeping query latency under 15ms."
}
```

#### Response:
```json
{
  "reply": "In a high-throughput production setting, what trade-offs emerge between index build time and query latency in Chroma vs. Pinecone?",
  "done": false
}
```

---

### 3. End of Interview Response (Final Turn)
When at least 8 questions across at least 4 unique curriculum days have been completed:
```json
{
  "reply": "Thank you for completing the technical interview. Your assessment and feedback report have been compiled.",
  "done": true,
  "feedback": {
    "summary": "Diane Foster completed a comprehensive 8-question interview covering 4 curriculum days (Day 7, Day 8, Day 10, Day 12). Overall performance averaged 8.8/10 on technical correctness with clear distinction between high-confidence modules and areas requiring deeper practical implementation.",
    "strengths": [
      "Demonstrated solid architectural depth and practical trade-off awareness on Day 8 (Vector Databases Overview).",
      "Demonstrated solid architectural depth and practical trade-off awareness on Day 10 (The Retrieval & Matching Engine)."
    ],
    "gaps": [
      "Could push deeper into production-grade edge cases, distributed concurrency, and automated guardrail verification."
    ],
    "next": [
      "Build end-to-end integration tests that benchmark latency, cost, and guardrail precision under simulated adversarial inputs.",
      "Prepare multi-agent production failure recovery playbooks for complex tool orchestration pipelines."
    ]
  }
}
```

---

## 9. Testing Different Candidate Profiles

The MVP includes built-in profiles demonstrating adaptive personalization:

1. **Diane Foster (`CAND-018`) — Strong Candidate:**
   - All missions passed on 1st attempt.
   - Starting difficulty: `advanced`.
   - Questions escalate to trade-offs, concurrency, latency, and failure modes.

2. **Gerald Combs (`CAND-010`) — Weak Topics:**
   - Day 8 (Vector DBs), Day 10 (Retrieval), and Day 22 (Multi-Agent) failed (`passed: false`).
   - Day 27 and Day 28 skipped.
   - Controller prioritizes probing Day 8 and Day 10 first.
   - Day 27 and 28 are never asked.

3. **Mia Alvarez (`CAND-011`) — Skipped Topics:**
   - Explicitly skipped Days 7, 8, 12, 16, 22.
   - Controller hard-excludes these days.
   - Interview selects only eligible days (Days 1, 2, 3, 4, 31).

---

## 10. Frontend Interactive Demo

Open `frontend/index.html` in any modern web browser or serve it with Python:
```bash
cd frontend
python3 -m http.server 3000
```
Visit `http://localhost:3000` to interact with the full live UI.

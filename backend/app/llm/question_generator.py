"""
Question Generator service: generates targeted, single-question interview prompts.
Grounds questions strictly in curriculum objectives, question types, and state machine action.
"""

import logging
from typing import List, Optional
from ..config import PROMPTS_DIR, settings
from ..models.curriculum import CurriculumDay
from ..models.interview import ActionType, DifficultyLevel, QuestionLogItem, QuestionType
from .client import llm_client

logger = logging.getLogger(__name__)


# Deterministic question bank indexed by curriculum day, difficulty, and question type.
# Ensures rich variation across all 31 curriculum days without repetition.
MOCK_QUESTION_BANK = {
    1: {
        "beginner": "How do you configure a Python virtual environment in VS Code, and what is the role of Pylance during development?",
        "intermediate": "When debugging an asynchronous Python script inside VS Code, how do you manage breakpoint exceptions and environment variable isolation?",
        "advanced": "How would you structure a multi-environment VS Code workspace config to prevent package version conflicts across team containers?",
        "follow_up": "Can you explain what specifically happens under the hood when a virtual environment's site-packages path overrides the system interpreter?",
        "tradeoff": "What are the trade-offs between managing virtual environments with standard venv versus poetry or conda for containerized deployments?",
    },
    2: {
        "beginner": "How did you set up Ollama to run local coding models, and how do you verify offline inference?",
        "intermediate": "What are the latency and memory trade-offs when quantizing local coding models like Qwen2.5-Coder for local IDE integration?",
        "advanced": "How do you handle context window truncation and GPU VRAM offloading when running local LLM assistants alongside heavy IDE tooling?",
        "follow_up": "What failure modes have you observed when local models generate code without structured schema constraints?",
        "tradeoff": "How does 4-bit AWQ quantization compare to 8-bit GGUF in terms of inference throughput and code reasoning quality?",
    },
    3: {
        "beginner": "How did you connect your React frontend to the FastAPI backend, and what health check patterns did you implement?",
        "intermediate": "How do you handle state synchronization and CORS configuration when streaming responses from FastAPI to a React client?",
        "advanced": "What architectural patterns do you employ in FastAPI to manage connection pooling and long-lived client connections under load?",
        "follow_up": "How do you prevent duplicate message rendering when network reconnects occur in the chat UI?",
        "tradeoff": "Why choose Server-Sent Events over WebSockets for one-directional LLM token streaming in FastAPI?",
    },
    4: {
        "beginner": "How do you load, clean, and validate structured healthcare CSV datasets using Pandas before writing them to SQLite?",
        "intermediate": "When querying complex claims data in SQLite with SQLAlchemy, how do you optimize index usage to keep retrieval latency low?",
        "advanced": "How do you design database schema migrations and concurrency controls when multiple worker processes insert processed claims data simultaneously?",
        "follow_up": "What specific SQL join strategies or indexing choices did you implement to optimize claims aggregation queries?",
        "tradeoff": "What are the write-throughput trade-offs of SQLite WAL mode versus PostgreSQL for real-time claims ingestion?",
    },
    5: {
        "beginner": "What libraries did you use to extract text from PDFs and scanned healthcare forms, and how did you handle OCR errors?",
        "intermediate": "How do you clean and normalize noisy OCR output from scanned documents before sending text chunks into a knowledge base?",
        "advanced": "What strategies do you use to parse tabular healthcare data across multi-page PDF documents without losing structural relationships?",
        "follow_up": "How do you detect and filter out extraction artifacts like headers, footers, and watermarks during document preprocessing?",
        "tradeoff": "When should an ingestion pipeline fall back to Tesseract OCR rather than direct PDF text extraction with PyPDF?",
    },
    6: {
        "beginner": "How did you determine the chunk size and overlap for healthcare documents when creating your knowledge_base.jsonl file?",
        "intermediate": "What metadata attributes did you attach to each text chunk, and how does metadata filtering improve downstream retrieval accuracy?",
        "advanced": "How do you prevent semantic fragmentation when splitting complex medical coverage rules across chunk boundaries?",
        "follow_up": "Why is document-level metadata crucial when retrieving clauses with conflicting policy effective dates?",
        "tradeoff": "What are the retrieval accuracy and token cost trade-offs of 256-token vs 1024-token chunk sizes for healthcare RAG?",
    },
    7: {
        "beginner": "How do vector embeddings represent semantic meaning, and how did you generate embeddings for your knowledge base chunks?",
        "intermediate": "What dimensionality and distance metrics (cosine similarity vs. dot product) did you select for your embedding model, and why?",
        "advanced": "How do you evaluate embedding drift or semantic collapse when clustering high-dimensional healthcare domain vectors?",
        "follow_up": "Can you explain how PCA dimensionality reduction helps diagnose whether similar medical policies cluster together in vector space?",
        "tradeoff": "What are the latency and storage implications of dense 1536-dimensional embeddings compared to 384-dimensional mini-models?",
    },
    8: {
        "beginner": "What role does a vector database play in RAG systems, and how does ChromaDB differ from a managed solution like Pinecone?",
        "intermediate": "How do vector databases use HNSW indexing to balance recall accuracy against query search latency?",
        "advanced": "What memory, sharding, and persistence considerations dictate whether to deploy an embedded vector store versus a distributed cluster?",
        "follow_up": "In a high-throughput production setting, what trade-offs emerge between index build time and query latency in Chroma vs. Pinecone?",
        "tradeoff": "How does HNSW graph efSearch parameter tuning affect query p99 latency versus recall precision?",
    },
    9: {
        "beginner": "How did you index your knowledge base chunks into ChromaDB along with their associated metadata filters?",
        "intermediate": "How do you construct and test metadata filter expressions in Chroma to restrict semantic queries to specific healthcare plans?",
        "advanced": "How do you handle atomic upserts and metadata schema evolution in a live vector database without index downtime?",
        "follow_up": "What happens to semantic search recall when metadata filtering is applied before vs. after vector similarity ranking?",
        "tradeoff": "What are the performance implications of pre-filtering vs post-filtering on high-cardinality metadata in vector indices?",
    },
    10: {
        "beginner": "How does your query router decide whether a healthcare query should hit SQL, the vector database, or both?",
        "intermediate": "How do you merge, deduplicate, and re-rank results when performing hybrid retrieval across structured claims and unstructured policy docs?",
        "advanced": "What mathematical or heuristic fusion techniques (like Reciprocal Rank Fusion) did you implement to balance sparse and dense search scores?",
        "follow_up": "When SQL returns an exact match and vector search returns high-similarity background context, how does your system resolve conflicting data?",
        "tradeoff": "What is the computational latency cost of cross-encoder re-ranking compared to simple reciprocal rank fusion in hybrid search?",
    },
    11: {
        "beginner": "How did you connect your retrieval engine to an LLM to build an end-to-end RAG pipeline?",
        "intermediate": "How do you construct grounded system prompts that enforce strict adherence to retrieved context and prevent hallucinations?",
        "advanced": "How do you handle context window budget allocation when retrieved documents exceed the model's prompt token limit?",
        "follow_up": "What specific instructions or guardrails did you put in the prompt to force the LLM to admit when the retrieved context lacks the answer?",
        "tradeoff": "How do you balance prompt token cost and LLM reasoning latency against chunk retrieval count in production RAG?",
    },
    12: {
        "beginner": "What are the core differences between zero-shot, few-shot, and chain-of-thought prompting in LLM applications?",
        "intermediate": "How do you systematically evaluate prompt variations for compliance, tone, and accuracy against a fixed test set?",
        "advanced": "How do you prevent few-shot exemplars from introducing unwanted bias or format rigidity into model outputs?",
        "follow_up": "Can you share a specific prompt failure case you encountered in healthcare policy queries and how you refactored the prompt to fix it?",
        "tradeoff": "What are the latency and cost trade-offs of few-shot prompt exemplars versus fine-tuning for strict JSON output compliance?",
    },
    13: {
        "beginner": "How do you define tool schemas for OpenAI function calling, and how does Pydantic validate the model's arguments?",
        "intermediate": "How does your application handle malformed tool arguments or invalid schema responses generated by the LLM?",
        "advanced": "What architecture do you use to support parallel function execution and audit logging without blocking the main event loop?",
        "follow_up": "If the model hallucinated an argument not defined in your Pydantic schema, what fallback or validation pipeline triggered?",
        "tradeoff": "What are the failure recovery trade-offs of single-turn tool calling versus multi-turn ReAct loops for database mutations?",
    },
    14: {
        "beginner": "When is fine-tuning a model more appropriate than relying solely on prompt engineering or RAG?",
        "intermediate": "How do you construct, clean, and format a high-quality JSONL training and validation dataset for fine-tuning?",
        "advanced": "What are the risks of catastrophic forgetting and loss of general reasoning capabilities when fine-tuning a model on domain-specific data?",
        "follow_up": "What quantitative metrics do you look at on the validation set to decide whether fine-tuning produced meaningful gains over few-shot prompting?",
        "tradeoff": "What is the total cost of ownership (TCO) comparison between running fine-tuned small models vs prompting frontier LLMs?",
    },
    15: {
        "beginner": "What are the key differences between full parameter fine-tuning, LoRA, and QLoRA in terms of hardware requirements?",
        "intermediate": "How do LoRA rank (r) and alpha hyperparameters affect adapter convergence and memory consumption during training?",
        "advanced": "How do you evaluate and benchmark a fine-tuned adapter against the base model to verify tone and domain accuracy without regressions?",
        "follow_up": "How did you quantify the improvement in response consistency after applying LoRA adapters to your chatbot model?",
        "tradeoff": "How does LoRA adapter rank r=8 compare to r=64 in terms of trainable parameter overhead and loss convergence on domain datasets?",
    },
    16: {
        "beginner": "How did you structure the /chat API endpoint in FastAPI to combine retrieval, function calling, and response generation?",
        "intermediate": "How do you manage conversation session state and history persistence in FastAPI without introducing race conditions?",
        "advanced": "How do you design async task pipelines and middleware in FastAPI to maintain sub-second response times during multi-step tool calls?",
        "follow_up": "How does your chat endpoint handle database timeouts when querying conversation history during a user request?",
        "tradeoff": "What are the concurrency trade-offs of in-memory session dictionaries vs distributed Redis cache in clustered FastAPI pods?",
    },
    17: {
        "beginner": "How did you build the interactive chat UI in Streamlit and connect it to your FastAPI backend?",
        "intermediate": "How do you manage session state in Streamlit across user reruns while preserving multi-turn conversation history?",
        "advanced": "What mechanisms did you use to prevent duplicate API dispatches when users rapidly send multiple queries in Streamlit?",
        "follow_up": "How do you handle backend connection errors or 500 responses gracefully inside the Streamlit user interface?",
        "tradeoff": "What are the architectural trade-offs of building chat frontends in Streamlit versus React/Next.js for production scale?",
    },
    18: {
        "beginner": "How did you implement streaming responses from FastAPI to Streamlit using Server-Sent Events (SSE) or StreamingResponse?",
        "intermediate": "How do you stream LLM tokens in real time while still parsing and executing tool calls on the backend?",
        "advanced": "How do you handle client disconnects during an active token stream to prevent orphaned LLM generation costs?",
        "follow_up": "What buffer or chunking strategy did you implement to prevent UI jitter while streaming markdown tokens?",
        "tradeoff": "What are the resource consumption differences between HTTP StreamingResponse generators and WebSocket connections?",
    },
    19: {
        "beginner": "How do you format chatbot responses with source citations, markdown tables, and structured claims cards?",
        "intermediate": "How do you validate structured markdown outputs with Pydantic before rendering them to the user?",
        "advanced": "How do you ensure citation trustworthiness and prevent hallucinated reference links in generated summaries?",
        "follow_up": "How does your rendering pipeline handle partially formed markdown tables during live streaming?",
        "tradeoff": "How do you trade off token generation overhead when forcing the model to generate citation indices inline?",
    },
    20: {
        "beginner": "How did you persist conversation history across user sessions in SQLite?",
        "intermediate": "What strategy do you use for conversation summarization and sliding window context management when token limits approach?",
        "advanced": "How do you retain critical entity state (like user policy ID) across a 50-turn conversation while aggressively trimming past messages?",
        "follow_up": "What algorithm decides which historical messages are summarized versus kept verbatim in the active prompt context?",
        "tradeoff": "What are the latency and hallucination risks of recursive conversation summarization compared to strict token sliding windows?",
    },
    21: {
        "beginner": "What are the components of a ReAct agent, and how does it use reasoning traces to choose tools in LangChain?",
        "intermediate": "How do you wrap custom healthcare APIs as LangChain tools with strict input schemas and error handling?",
        "advanced": "How do you prevent infinite execution loops and agent thrashing when a tool returns ambiguous or empty results?",
        "follow_up": "Can you walk through a concrete reasoning trace where your agent decided to call an insurance lookup tool rather than answering directly?",
        "tradeoff": "What is the token cost and execution latency penalty of multi-step ReAct thought-action loops compared to single-step function calling?",
    },
    22: {
        "beginner": "How do specialized multi-agent architectures differ from a single agent with multiple tools?",
        "intermediate": "How does a router or supervisor agent in LangGraph or CrewAI delegate tasks and synthesize sub-agent outputs?",
        "advanced": "How do you handle state synchronization, deadlock prevention, and cascading failures in a multi-agent workflow?",
        "follow_up": "In what specific healthcare query scenario did your multi-agent system outperform a single ReAct agent?",
        "tradeoff": "What are the latency trade-offs between hierarchical multi-agent architectures and flat peer-to-peer agent networks?",
    },
    23: {
        "beginner": "What is the Model Context Protocol (MCP), and why is it useful for standardizing tool integrations?",
        "intermediate": "How did you build an MCP server exposing your healthcare tools, and how do MCP clients discover tool capabilities?",
        "advanced": "What security boundaries and permission models do you establish when exposing database tools over MCP to external clients?",
        "follow_up": "How does the MCP JSON-RPC protocol negotiate capabilities and handle tool execution errors during a session?",
        "tradeoff": "What are the security trade-offs of exposing tools over local stdio vs remote SSE transport in Model Context Protocol?",
    },
    24: {
        "beginner": "How did you integrate agents, MCP tools, retrieval, and conversation memory into a unified pipeline?",
        "intermediate": "What retry, timeout, and circuit-breaker patterns did you implement to handle external tool failures in your agent pipeline?",
        "advanced": "How do you perform chaos and failure injection testing to ensure your agent degrades gracefully when MCP servers go offline?",
        "follow_up": "When an MCP tool call times out, what fallback strategy does your agent use to keep the conversation going?",
        "tradeoff": "What are the trade-offs of implementing circuit breakers at the client level versus at the MCP tool gateway level?",
    },
    25: {
        "beginner": "How did you create a benchmark evaluation dataset to test your healthcare chatbot for accuracy and grounding?",
        "intermediate": "What metrics (such as faithfulness, answer relevance, and context recall) did you measure in your automated test suite?",
        "advanced": "How do you establish statistical baselines and CI/CD quality gates to prevent regression in LLM responses before deployment?",
        "follow_up": "What was the most significant failure mode uncovered by your benchmark dataset, and how did you resolve it?",
        "tradeoff": "What are the cost and reliability differences between LLM-as-a-judge evaluation and rule-based deterministic scoring metrics?",
    },
    26: {
        "beginner": "How did you measure token usage and latency across your retrieval and LLM generation pipeline?",
        "intermediate": "What caching strategies (such as semantic prompt caching or exact-match caching) did you implement to reduce cost?",
        "advanced": "How do you optimize embedding batch size and prompt compression algorithms to minimize p99 latency under concurrent load?",
        "follow_up": "What measurable percentage reduction in token costs or latency did you achieve after implementing prompt optimization?",
        "tradeoff": "What are the precision and freshness trade-offs of semantic prompt caching in dynamic healthcare policy domains?",
    },
    27: {
        "beginner": "What methods did you use to secure your FastAPI chatbot endpoints and validate incoming user input?",
        "intermediate": "How do you defend against prompt injection, jailbreaking, and sensitive data leakage (PII/PHI) in a healthcare AI system?",
        "advanced": "How do you design a layered guardrails architecture that inspects both incoming prompts and outgoing LLM responses with minimal latency overhead?",
        "follow_up": "If a user attempts an indirect prompt injection via an uploaded PDF, how does your ingestion pipeline sanitize the content?",
        "tradeoff": "What are the latency overhead and false-positive refusal trade-offs of secondary guardrail models like Llama Guard?",
    },
    28: {
        "beginner": "How did you containerize your FastAPI backend and frontend using Docker, and what multi-stage build practices did you use?",
        "intermediate": "How do you configure Kubernetes Deployments, Services, and liveness/readiness health probes for the chatbot backend?",
        "advanced": "How do you manage GPU resource limits, autoscaling (HPA), and secrets management for LLM API keys in Kubernetes?",
        "follow_up": "Why are separate liveness and readiness probes critical for an LLM service that may experience model warm-up latency?",
        "tradeoff": "What are the cold-start and memory overhead trade-offs between containerized vLLM pods and serverless API inference?",
    },
    29: {
        "beginner": "How did you set up structured logging in Python to track API requests and model calls?",
        "intermediate": "How do you export Prometheus metrics and visualize chatbot latency, token throughput, and error rates in Grafana?",
        "advanced": "How do you trace distributed spans across retrieval, tool calling, and LLM generation using OpenTelemetry?",
        "follow_up": "What specific metric alert would immediately alert you to an outage in your vector database or LLM provider?",
        "tradeoff": "What are the storage and ingestion cost trade-offs of sampling 100% of LLM trace logs versus head-based 10% sampling?",
    },
    30: {
        "beginner": "What end-to-end testing procedures did you execute before declaring the chatbot production-ready?",
        "intermediate": "How did you validate edge cases across retrieval, agent tool execution, and frontend streaming during final staging tests?",
        "advanced": "What disaster recovery, rollback, and data integrity verification protocols did you document for production readiness?",
        "follow_up": "What critical bug or performance bottleneck did you catch and resolve during your final staging tests?",
        "tradeoff": "What are the risk and complexity trade-offs of canary deployments versus blue-green deployments for AI microservices?",
    },
    31: {
        "beginner": "Can you give an overview of your final enterprise healthcare chatbot architecture and its core capabilities?",
        "intermediate": "How do the retrieval engine, agentic workflows, MCP tools, and conversation memory work together in your capstone demo?",
        "advanced": "If you had to scale this architecture to 100,000 concurrent healthcare users, what architectural bottlenecks would you address first?",
        "follow_up": "Looking back across the entire build, what was the most difficult architectural trade-off you had to make?",
        "tradeoff": "What are the maintainability and operational trade-offs of monolithic agent backends versus modular microservice orchestrations?",
    },
}


class QuestionGenerator:
    """Generates grounded single interview questions via LLM or deterministic fallback."""

    def __init__(self):
        self.system_prompt_template = self._load_prompt_template()

    def _load_prompt_template(self) -> str:
        prompt_file = PROMPTS_DIR / "question_generator.txt"
        if prompt_file.exists():
            return prompt_file.read_text(encoding="utf-8")
        return (
            "You are a technical interviewer. Ask exactly ONE grounded technical question. "
            "Never answer. Keep it 1-3 sentences."
        )

    async def generate_question(
        self,
        curriculum_day: CurriculumDay,
        topic: str,
        objectives: List[str],
        action: ActionType,
        difficulty: DifficultyLevel,
        question_type: Optional[QuestionType] = None,
        previous_question: Optional[str] = None,
        previous_answer: Optional[str] = None,
        follow_up_reason: Optional[str] = None,
        question_history: Optional[List[QuestionLogItem]] = None,
        candidate_name: Optional[str] = None,
        is_first_question: bool = False,
    ) -> str:
        """
        Generates one interview question.
        Returns clean question text.
        """
        if settings.MOCK_LLM:
            return self._generate_mock_question(
                curriculum_day=curriculum_day,
                action=action,
                difficulty=difficulty,
                question_type=question_type,
                follow_up_reason=follow_up_reason,
                candidate_name=candidate_name,
                is_first_question=is_first_question,
            )

        user_prompt = self._build_user_prompt(
                curriculum_day=curriculum_day,
                topic=topic,
                objectives=objectives,
                action=action,
                difficulty=difficulty,
                question_type=question_type,
                previous_question=previous_question,
                previous_answer=previous_answer,
                follow_up_reason=follow_up_reason,
                question_history=question_history,
                candidate_name=candidate_name,
                is_first_question=is_first_question,
            )

        raw_question = await llm_client.generate_text(
                system_prompt=self.system_prompt_template,
                user_prompt=user_prompt,
                temperature=settings.LLM_TEMPERATURE,
                max_tokens=250,
            )

        cleaned = self._clean_question_text(raw_question)
        if not cleaned:
            raise RuntimeError("The configured LLM returned an empty interview question.")
        return cleaned

    def _generate_mock_question(
        self,
        curriculum_day: CurriculumDay,
        action: ActionType,
        difficulty: DifficultyLevel,
        question_type: Optional[QuestionType] = None,
        follow_up_reason: Optional[str] = None,
        candidate_name: Optional[str] = None,
        is_first_question: bool = False,
    ) -> str:
        """Produces deterministic, high-quality question from question bank."""
        day_num = curriculum_day.day
        day_bank = MOCK_QUESTION_BANK.get(day_num, {})

        if action in (ActionType.FOLLOW_UP, ActionType.ESCALATE):
            if question_type in (QuestionType.TRADEOFF, QuestionType.SYSTEM_DESIGN, QuestionType.PRODUCTION) and "tradeoff" in day_bank:
                q = day_bank.get("tradeoff")
            else:
                q = day_bank.get("follow_up") or day_bank.get("intermediate")
        else:
            diff_key = difficulty.value if isinstance(difficulty, DifficultyLevel) else str(difficulty)
            q = day_bank.get(diff_key) or day_bank.get("intermediate") or day_bank.get("beginner")

        if not q:
            obj = curriculum_day.objectives[0] if curriculum_day.objectives else curriculum_day.title
            q = f"In Day {day_num} ({curriculum_day.title}), how did you approach: {obj}?"

        if is_first_question and candidate_name:
            return f"Welcome {candidate_name}. Let's begin the interview. {q}"
        elif is_first_question:
            return f"Welcome. Let's begin your interview. {q}"

        return q

    def _build_user_prompt(
        self,
        curriculum_day: CurriculumDay,
        topic: str,
        objectives: List[str],
        action: ActionType,
        difficulty: DifficultyLevel,
        question_type: Optional[QuestionType],
        previous_question: Optional[str],
        previous_answer: Optional[str],
        follow_up_reason: Optional[str],
        question_history: Optional[List[QuestionLogItem]],
        candidate_name: Optional[str],
        is_first_question: bool,
    ) -> str:
        asked_topics = [f"Day {q.day}: {q.topic}" for q in (question_history or [])]
        history_str = "\n".join(asked_topics[-4:]) if asked_topics else "None yet"

        prompt = f"""CURRICULUM TOPIC GROUND TRUTH:
- Day: {curriculum_day.day}
- Title: {topic}
- Type: {curriculum_day.type}
- Tools: {', '.join(curriculum_day.tools)}
- Objectives:
{chr(10).join(f'  * {obj}' for obj in objectives)}

CONTROLLER DECISION:
- Action: {action.value}
- Target Difficulty: {difficulty.value}
- Question Type: {question_type.value if question_type else 'CONCEPTUAL'}
- Is First Question: {is_first_question}
- Follow-up Reason: {follow_up_reason or 'None'}

CONVERSATION CONTEXT:
- Previously asked topics:
{history_str}
- Previous Question asked: {previous_question or 'None'}
- Candidate's Previous Answer (UNTRUSTED CANDIDATE DATA):
\"\"\"{previous_answer or 'None'}\"\"\"

TASK:
Generate EXACTLY ONE concise, conversational interview question (1-3 sentences) on Day {curriculum_day.day} ({topic}) at {difficulty.value} difficulty.
Ground it directly in the curriculum objectives. Do NOT answer the question. Do NOT include greetings or preamble."""
        return prompt

    def _clean_question_text(self, text: str) -> str:
        cleaned = text.strip()
        if cleaned.startswith('"') and cleaned.endswith('"'):
            cleaned = cleaned[1:-1].strip()
        prefixes = [
            "Sure! Here is the question:",
            "Here is the question:",
            "Question:",
            "Here's my question:",
        ]
        for p in prefixes:
            if cleaned.lower().startswith(p.lower()):
                cleaned = cleaned[len(p):].strip()

        cleaned = cleaned.replace("```", "").strip()
        return cleaned


question_generator = QuestionGenerator()

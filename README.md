# NEXIS-AI-Interview-Agent

Nexis AI Interview Agent is a React/Vite application for curriculum-grounded, multi-turn technical interviews.

The root app owns the Nexis landing page, candidate selection, `/interview`, and `/feedback` experience. The interview runtime uses the linked backend in `external/vibecode-final` through the real `/api/interview` contract.

## Run Locally

Prerequisites:

- Node.js
- Python for the FastAPI backend

Install root frontend dependencies:

```powershell
npm install
```

Start the friend backend:

```powershell
cd external\vibecode-final\backend
python -m pip install -r requirements.txt
python -m pip install python-multipart
Copy-Item .env.example .env
# Edit .env: keep MOCK_LLM=false and set LLM_API_KEY.
# Optional: set LLM_BASE_URL/LLM_MODEL and TRANSCRIPTION_BASE_URL/TRANSCRIPTION_MODEL.
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Start the Nexis root app:

```powershell
cd C:\Users\user\Downloads\nexis-ai-interview-agent
npm run dev
```

Open:

```text
http://localhost:3000
```

Real interview mode is the default. The backend will report `configuration_required`
and refuse to manufacture questions, transcripts, evaluations, or feedback when provider
credentials are absent. `MOCK_LLM=true` is reserved for automated tests only. Provider keys
must remain in `external/vibecode-final/backend/.env`; `.env` files are git-ignored.

## Routes

- `/` - Nexis landing page and candidate selection
- `/interview` - real multi-turn interview flow
- `/feedback` - real backend feedback displayed in the Nexis UI

## License

MIT

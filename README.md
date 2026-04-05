# ApplyAI — Agentic Job Application Platform

An AI-powered job application assistant that uses **Claude Opus 4.6** to analyze job postings, score your fit, write personalized cover letters, and track all your applications in one place.

## Features

- **5-step onboarding** — questionnaire covering preferences, skills, salary, availability
- **Resume parsing** — upload PDF, DOCX, or TXT; AI extracts structured data automatically
- **Job search** — search via JSearch API or add jobs manually
- **AI Agent (Claude Opus 4.6)** — per-job match scoring (0–100), tailored cover letters, pre-filled application answers
- **Application dashboard** — track status from pending → interviewing → offer
- **Streaming agent** — real-time SSE stream shows agent thinking as it works

## Tech Stack

| Layer | Technology |
|-------|-----------|
| AI Agent | Claude Opus 4.6 (adaptive thinking + tool use) |
| Backend | FastAPI + SQLAlchemy + SQLite |
| Frontend | React 18 + Vite + Tailwind CSS |
| Resume Parsing | pdfplumber + python-docx |
| Job Search | JSearch API (RapidAPI) |

## Quick Start

### 1. Clone & configure

```bash
git clone https://github.com/your-username/job-applicant.git
cd job-applicant
cp .env.example .env
# Edit .env — add your ANTHROPIC_API_KEY
```

### 2. Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

API runs at http://localhost:8000 · Swagger docs at http://localhost:8000/docs

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

App runs at http://localhost:5173

## How It Works

### The Agent

The core of ApplyAI is `backend/app/agents/job_application_agent.py`. It uses Claude Opus 4.6 with:

- **Adaptive thinking** — Claude decides how much reasoning each job needs
- **Tool use** — structured tools enforce output schemas for match analysis, cover letters, and Q&A
- **Streaming** — SSE endpoint streams agent events to the frontend in real-time

The agent runs 4 tools per application:

1. `analyze_job_match` — scores fit 0–100, lists matching/missing skills
2. `generate_cover_letter` — writes a 3-4 paragraph tailored cover letter
3. `answer_application_questions` — pre-fills common questions (tell me about yourself, etc.)
4. `complete_application` — finalizes with next steps

### Project Structure

```
job-applicant/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI entry point
│   │   ├── models.py            # SQLAlchemy models
│   │   ├── schemas.py           # Pydantic schemas
│   │   ├── config.py            # Settings
│   │   ├── database.py          # DB setup
│   │   ├── routers/             # API routes
│   │   │   ├── users.py
│   │   │   ├── resume.py
│   │   │   ├── jobs.py
│   │   │   └── applications.py
│   │   ├── services/
│   │   │   ├── resume_parser.py # PDF/DOCX parsing
│   │   │   └── job_scraper.py   # External job search
│   │   └── agents/
│   │       └── job_application_agent.py  # Claude agent
│   └── requirements.txt
├── frontend/
│   └── src/
│       ├── pages/               # Route-level pages
│       └── components/          # Reusable UI
├── .env.example
└── README.md
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | ✅ | Claude API key — get at console.anthropic.com |
| `JSEARCH_API_KEY` | Optional | Real job search via RapidAPI JSearch |
| `DEBUG` | Optional | Enable FastAPI debug mode |
| `FRONTEND_URL` | Optional | CORS origin (default: http://localhost:5173) |

## Adding Real Job Search

Without `JSEARCH_API_KEY`, the app shows demo job listings. To enable real search:

1. Sign up at [RapidAPI JSearch](https://rapidapi.com/letscrape-6bRBa3QguO5/api/JSearch)
2. Copy your API key into `.env` as `JSEARCH_API_KEY`

## Extending the Agent

To add form submission automation via Playwright:

```bash
npm install @playwright/mcp@latest   # MCP server
pip install playwright && playwright install chromium
```

Then update the agent to include the Playwright MCP server for filling out application forms automatically.

## License

MIT

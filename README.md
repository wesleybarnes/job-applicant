# Envia — AI-Powered Job Application Platform

Envia uses **Claude Opus 4.6** to search for jobs, score your fit, write personalized cover letters, and apply directly in the browser — while you watch.

Live at **[tryenvia.com](https://tryenvia.com)**

## Features

- **5-step onboarding** — preferences, skills, salary range, resume upload, custom Q&A answers
- **Resume parsing** — upload PDF, DOCX, or TXT; AI extracts structured data automatically
- **Job search** — search via JSearch API or add jobs manually
- **AI Agent (Claude Opus 4.6)** — match scoring (0–100), tailored cover letters, pre-filled answers
- **Live browser automation** — watch Envia fill out and submit applications in real-time
- **Confirmation prompt** — you approve every submit, or enable auto-apply to skip it
- **Credits system** — 5 free on signup; 1 credit for AI cover letter, 3 for browser apply
- **Admin bypass** — unlimited credits for the admin account
- **Stripe payments** — buy credit packs (Starter, Standard, Power)
- **Clerk auth** — sign up / sign in with email or social providers

## Tech Stack

| Layer | Technology |
|-------|-----------|
| AI Agent | Claude Opus 4.6 (adaptive thinking + tool use) |
| Browser Automation | Playwright (headless Chromium, live screenshot stream) |
| Backend | FastAPI + SQLAlchemy + PostgreSQL |
| Auth | Clerk (JWT verification) |
| Payments | Stripe Checkout |
| Frontend | React 18 + Vite + Tailwind CSS |
| Deployment | Railway (backend) + Vercel (frontend) |
| Resume Parsing | pdfplumber + python-docx |
| Job Search | JSearch API (RapidAPI) |

## Local Development

### 1. Clone & configure

```bash
git clone https://github.com/wesleybarnes/job-applicant.git
cd job-applicant
cp .env.example .env
# Edit .env with your API keys
```

### 2. Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
playwright install chromium
uvicorn app.main:app --reload
```

API: http://localhost:8000 · Docs: http://localhost:8000/docs

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

App: http://localhost:5173

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | ✅ | Claude API key — [console.anthropic.com](https://console.anthropic.com) |
| `CLERK_SECRET_KEY` | ✅ | Clerk backend secret key |
| `CLERK_PUBLISHABLE_KEY` | ✅ | Clerk publishable key |
| `ADMIN_EMAIL` | ✅ | Email that gets unlimited credits |
| `SECRET_KEY` | ✅ | Random string for session signing |
| `DATABASE_URL` | Production | PostgreSQL URL (auto-set by Railway) |
| `STRIPE_SECRET_KEY` | Optional | Enable credit purchases |
| `STRIPE_WEBHOOK_SECRET` | Optional | Verify Stripe webhook events |
| `JSEARCH_API_KEY` | Optional | Real job search via RapidAPI |
| `FRONTEND_URL` | Optional | CORS origin (default: http://localhost:5173) |

## How It Works

### AI Agent (`backend/app/agents/job_application_agent.py`)

Uses Claude Opus 4.6 with adaptive thinking and 4 tools per application:

1. `analyze_job_match` — scores fit 0–100, lists matching/missing skills
2. `generate_cover_letter` — writes a tailored 3-4 paragraph cover letter
3. `answer_application_questions` — pre-fills common questions
4. `complete_application` — finalizes with next steps

### Browser Automation (`backend/app/services/browser_agent.py`)

Uses Playwright + Claude to fill out application forms:
- Streams live base64 PNG screenshots via SSE
- Pauses at form submission and waits for user confirmation
- Auto-apply toggle skips the confirmation step

## Deployment

- **Backend**: Railway — root directory set to `backend/`, PostgreSQL plugin auto-injects `DATABASE_URL`
- **Frontend**: Vercel — root directory set to `frontend/`, env vars `VITE_CLERK_PUBLISHABLE_KEY` and `VITE_API_URL`
- **DNS**: tryenvia.com A record → Vercel

## License

MIT

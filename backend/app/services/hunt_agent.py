"""
Autonomous job hunt agent — Playwright + Claude browse job boards and apply.

Flow:
  1. Claude searches LinkedIn Jobs, Indeed, Google Jobs using user's target roles/locations
  2. Claude reads listings, decides which jobs to apply to
  3. For each application, fills the form using user profile
  4. Pauses at every submit for user confirmation (or stop/skip)
  5. User can interrupt at any time via the Stop button
"""
import asyncio
import base64
import json
from typing import Optional
import anthropic
from app.config import settings

# ─── In-memory session ──────────────────────────────────────────────────────

class HuntSession:
    def __init__(self, hunt_id: int, user_id: int):
        self.hunt_id = hunt_id
        self.user_id = user_id
        self.events: asyncio.Queue = asyncio.Queue()
        self._confirm_event: asyncio.Event = asyncio.Event()
        self._confirm_decision: Optional[str] = None  # 'confirm' | 'skip' | 'stop'
        self._stopped = False
        self.jobs_found = 0
        self.jobs_applied = 0

    def emit(self, event: dict):
        self.events.put_nowait(event)

    async def wait_for_confirmation(self) -> str:
        """Block until user confirms, skips, or stops. Returns 'confirm'|'skip'|'stop'."""
        self._confirm_event.clear()
        self._confirm_decision = None
        await self._confirm_event.wait()
        return self._confirm_decision or 'skip'

    def resolve_confirmation(self, decision: str):
        self._confirm_decision = decision
        self._confirm_event.set()

    def stop(self):
        self._stopped = True
        self.resolve_confirmation('stop')


_hunt_sessions: dict[int, HuntSession] = {}


def get_hunt_session(hunt_id: int) -> Optional[HuntSession]:
    return _hunt_sessions.get(hunt_id)


def create_hunt_session(hunt_id: int, user_id: int) -> HuntSession:
    session = HuntSession(hunt_id, user_id)
    _hunt_sessions[hunt_id] = session
    return session


def remove_hunt_session(hunt_id: int):
    _hunt_sessions.pop(hunt_id, None)


# ─── Agent ──────────────────────────────────────────────────────────────────

HUNT_SYSTEM_PROMPT = """You are an autonomous job hunting agent controlling a real web browser.
Your mission: find relevant jobs for the candidate and apply to them one by one.

## Your Job Boards (visit in order)
1. LinkedIn Jobs: https://www.linkedin.com/jobs/search/?keywords={ROLES}&location={LOCATION}
2. Indeed: https://www.indeed.com/jobs?q={ROLES}&l={LOCATION}
3. Google Jobs: search Google for "{ROLE} jobs {LOCATION} site:careers"

## Decision Process for Each Job
- Read the title, company, location, and description
- Score the match against the candidate's skills and target roles
- Call `decide_on_job` to record your decision with a reason
- Only apply to jobs that are a strong match (score 70+/100)
- Skip if: already applied, wrong location, requires skills candidate doesn't have, salary far below range

## Application Process
For each job you decide to apply to:
1. Navigate to the application URL
2. Call `get_page_text` to understand the form
3. Take a screenshot
4. Fill every field using the candidate's information — never fabricate data
5. Upload resume when asked
6. Use the cover letter when asked for a personal statement
7. Call `request_confirmation` before ANY submit button — ALWAYS, no exceptions
8. Wait for user decision (confirm / skip / stop)
9. If confirmed: call `submit_application`
10. If skipped: move to next job
11. If stopped: call `finish_hunt` immediately

## Rules
- Call `emit_thinking` to narrate your reasoning so the user can follow along
- Take screenshots frequently so the user can watch the progress
- Never fabricate information — if a field can't be filled, note it in concerns
- If a page requires login (LinkedIn, Greenhouse, etc.), attempt to proceed; if blocked, skip that job
- Be persistent but smart — if a form is too complex or broken, skip and move on
- After visiting 2-3 boards and applying to a reasonable number of jobs, call `finish_hunt`
"""


class AutonomousHuntAgent:
    def __init__(self):
        self.client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)

    def _build_tools(self) -> list:
        return [
            {
                "name": "navigate",
                "description": "Navigate the browser to a URL.",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "url": {"type": "string"},
                        "reason": {"type": "string"},
                    },
                    "required": ["url"],
                },
            },
            {
                "name": "screenshot",
                "description": "Take a screenshot and stream it to the user.",
                "input_schema": {
                    "type": "object",
                    "properties": {"label": {"type": "string"}},
                    "required": ["label"],
                },
            },
            {
                "name": "get_page_text",
                "description": "Get all visible text from the current page.",
                "input_schema": {"type": "object", "properties": {}},
            },
            {
                "name": "fill_field",
                "description": "Fill a form input field.",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "selector_hint": {"type": "string"},
                        "value": {"type": "string"},
                        "field_description": {"type": "string"},
                    },
                    "required": ["selector_hint", "value"],
                },
            },
            {
                "name": "click",
                "description": "Click a button or link.",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "selector_hint": {"type": "string"},
                        "reason": {"type": "string"},
                    },
                    "required": ["selector_hint"],
                },
            },
            {
                "name": "select_option",
                "description": "Select from a dropdown.",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "selector_hint": {"type": "string"},
                        "option_value": {"type": "string"},
                    },
                    "required": ["selector_hint", "option_value"],
                },
            },
            {
                "name": "upload_file",
                "description": "Upload resume to a file input.",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "selector_hint": {"type": "string"},
                        "file_path": {"type": "string"},
                    },
                    "required": ["selector_hint", "file_path"],
                },
            },
            {
                "name": "search_job_board",
                "description": "Navigate to a job board search with the right query URL.",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "board": {"type": "string", "enum": ["linkedin", "indeed", "google"]},
                        "query": {"type": "string", "description": "Job title / keywords"},
                        "location": {"type": "string", "description": "City or remote"},
                    },
                    "required": ["board", "query", "location"],
                },
            },
            {
                "name": "extract_job_listings",
                "description": "Read the current page and extract a list of job listings.",
                "input_schema": {"type": "object", "properties": {}},
            },
            {
                "name": "decide_on_job",
                "description": "Record your decision to apply to or skip a job. Emits a live decision card to the user.",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "title": {"type": "string"},
                        "company": {"type": "string"},
                        "location": {"type": "string"},
                        "url": {"type": "string"},
                        "match_score": {"type": "number", "description": "0-100"},
                        "decision": {"type": "string", "enum": ["apply", "skip"]},
                        "reason": {"type": "string"},
                    },
                    "required": ["title", "company", "decision", "reason"],
                },
            },
            {
                "name": "request_confirmation",
                "description": "Pause and ask the user to review before submitting. ALWAYS call before submit_application.",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "job_title": {"type": "string"},
                        "company": {"type": "string"},
                        "summary": {"type": "string"},
                        "fields_filled": {"type": "array", "items": {"type": "string"}},
                        "concerns": {"type": "array", "items": {"type": "string"}},
                    },
                    "required": ["job_title", "company", "summary", "fields_filled"],
                },
            },
            {
                "name": "submit_application",
                "description": "Click the final submit button. Only after request_confirmation was approved.",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "submit_button_hint": {"type": "string"},
                        "job_title": {"type": "string"},
                        "company": {"type": "string"},
                    },
                    "required": ["submit_button_hint"],
                },
            },
            {
                "name": "emit_thinking",
                "description": "Narrate your current reasoning so the user can follow along.",
                "input_schema": {
                    "type": "object",
                    "properties": {"thought": {"type": "string"}},
                    "required": ["thought"],
                },
            },
            {
                "name": "finish_hunt",
                "description": "End the hunt session gracefully with a summary.",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "summary": {"type": "string"},
                        "jobs_found": {"type": "integer"},
                        "jobs_applied": {"type": "integer"},
                    },
                    "required": ["summary"],
                },
            },
        ]

    def _build_prompt(self, user: dict, resume: dict) -> str:
        roles = ', '.join(user.get('target_roles') or []) or 'relevant roles'
        locations = ', '.join(user.get('target_locations') or []) or user.get('location') or 'Remote'
        skills = ', '.join(user.get('skills') or []) or 'not specified'
        resume_path = resume.get('file_path', '') if resume else ''
        salary_min = user.get('salary_min')
        salary_max = user.get('salary_max')
        salary = f"${salary_min or 0:,} – ${salary_max or 0:,}" if (salary_min or salary_max) else 'Flexible'

        return f"""Hunt for jobs and apply on behalf of this candidate.

## Candidate Profile
Name: {user.get('full_name', '')}
Email: {user.get('email', '')}
Phone: {user.get('phone') or 'Not provided'}
Location: {user.get('location') or 'Not provided'}
LinkedIn: {user.get('linkedin_url') or ''}
GitHub: {user.get('github_url') or ''}
Years of experience: {user.get('years_experience') or 'Not specified'}
Education: {user.get('education_level') or 'Not specified'}
Work authorization: {user.get('work_authorization') or 'Not specified'}
Willing to relocate: {'Yes' if user.get('willing_to_relocate') else 'No'}
Salary expectation: {salary}
Resume file path: {resume_path}

## Job Targets
Target roles: {roles}
Target locations: {locations}
Remote preference: {user.get('remote_preference') or 'any'}
Target industries: {', '.join(user.get('target_industries') or []) or 'any'}

## Skills
{skills}

## Professional Summary
{user.get('summary') or 'Not provided'}

## Pre-written Application Answers (use these verbatim)
{json.dumps(user.get('custom_answers') or {}, indent=2)}

## Instructions
1. Call `emit_thinking` to explain your plan
2. Call `search_job_board` for each board (LinkedIn, Indeed)
3. Read listings, call `decide_on_job` for each job you evaluate
4. For jobs you decide to apply: navigate to URL, fill the form, call `request_confirmation`, wait
5. Continue until you've found and evaluated at least 10 jobs or visited all boards
6. Call `finish_hunt` when done

Start now — search for "{roles}" in "{locations}".
"""

    async def run(self, user, resume, session: HuntSession, db_session_factory):
        try:
            from playwright.async_api import async_playwright
        except ImportError:
            session.emit({"type": "error", "message": "Playwright not installed."})
            return

        session.emit({"type": "status", "message": "Starting autonomous job hunt..."})

        async with async_playwright() as pw:
            browser = await pw.chromium.launch(headless=True, slow_mo=200)
            context = await browser.new_context(
                viewport={"width": 1280, "height": 900},
                user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            )
            page = await context.new_page()

            async def take_screenshot(label: str = "") -> str:
                try:
                    png = await page.screenshot(full_page=False)
                    b64 = base64.b64encode(png).decode()
                    session.emit({"type": "screenshot", "data": b64, "label": label})
                    return b64
                except Exception:
                    return ""

            async def execute_tool(name: str, inp: dict) -> str:
                if session._stopped:
                    return "Hunt stopped by user."

                if name == "navigate":
                    url = inp["url"]
                    session.emit({"type": "action", "message": f"→ {url[:80]}"})
                    try:
                        await page.goto(url, wait_until="domcontentloaded", timeout=25000)
                        await asyncio.sleep(2)
                        await take_screenshot(inp.get("reason", "Navigated"))
                        return f"Navigated to {url}"
                    except Exception as e:
                        return f"Navigation failed: {e}"

                elif name == "screenshot":
                    label = inp.get("label", "")
                    await take_screenshot(label)
                    return f"Screenshot: {label}"

                elif name == "get_page_text":
                    try:
                        text = await page.inner_text("body")
                        return text[:5000]
                    except Exception as e:
                        return f"Could not read page: {e}"

                elif name == "fill_field":
                    hint = inp["selector_hint"]
                    value = inp["value"]
                    desc = inp.get("field_description", hint)
                    session.emit({"type": "action", "message": f"Filling: {desc}"})
                    try:
                        filled = False
                        for strategy in [
                            f'[placeholder*="{hint}" i]',
                            f'[aria-label*="{hint}" i]',
                            f'[name*="{hint}" i]',
                            f'[id*="{hint}" i]',
                            f'label:has-text("{hint}") + input',
                            f'label:has-text("{hint}") ~ input',
                            f'label:has-text("{hint}") input',
                        ]:
                            try:
                                el = page.locator(strategy).first
                                if await el.count() > 0:
                                    await el.click()
                                    await el.fill(value)
                                    filled = True
                                    break
                            except Exception:
                                continue
                        if not filled:
                            try:
                                el = page.locator(f'textarea[aria-label*="{hint}" i], textarea[placeholder*="{hint}" i]').first
                                if await el.count() > 0:
                                    await el.fill(value)
                                    filled = True
                            except Exception:
                                pass
                        await asyncio.sleep(0.3)
                        return f"{'Filled' if filled else 'Could not find'}: {desc}"
                    except Exception as e:
                        return f"Fill error: {e}"

                elif name == "click":
                    hint = inp["selector_hint"]
                    reason = inp.get("reason", hint)
                    session.emit({"type": "action", "message": f"Clicking: {reason}"})
                    try:
                        for strategy in [
                            f'button:has-text("{hint}")',
                            f'[aria-label*="{hint}" i]',
                            f'a:has-text("{hint}")',
                            f'[role="button"]:has-text("{hint}")',
                        ]:
                            try:
                                el = page.locator(strategy).first
                                if await el.count() > 0:
                                    await el.click()
                                    await asyncio.sleep(1.5)
                                    break
                            except Exception:
                                continue
                        await take_screenshot(f"After click: {hint}")
                        return f"Clicked: {hint}"
                    except Exception as e:
                        return f"Click failed: {e}"

                elif name == "select_option":
                    hint = inp["selector_hint"]
                    val = inp["option_value"]
                    session.emit({"type": "action", "message": f"Selecting '{val}'"})
                    try:
                        for strategy in [
                            f'select[aria-label*="{hint}" i]',
                            f'select[name*="{hint}" i]',
                            f'label:has-text("{hint}") + select',
                            f'label:has-text("{hint}") ~ select',
                        ]:
                            try:
                                el = page.locator(strategy).first
                                if await el.count() > 0:
                                    await el.select_option(label=val)
                                    return f"Selected '{val}'"
                            except Exception:
                                continue
                        return f"Could not find dropdown: {hint}"
                    except Exception as e:
                        return f"Select error: {e}"

                elif name == "upload_file":
                    hint = inp["selector_hint"]
                    path = inp.get("file_path", "")
                    session.emit({"type": "action", "message": "Uploading resume..."})
                    if not path:
                        return "No resume file path"
                    try:
                        import os
                        if not os.path.exists(path):
                            return f"File not found: {path}"
                        for strategy in [
                            f'input[type="file"][aria-label*="{hint}" i]',
                            'input[type="file"][name*="resume" i]',
                            'input[type="file"]',
                        ]:
                            try:
                                el = page.locator(strategy).first
                                if await el.count() > 0:
                                    await el.set_input_files(path)
                                    await asyncio.sleep(1.5)
                                    await take_screenshot("Resume uploaded")
                                    return "Resume uploaded"
                            except Exception:
                                continue
                        return "Could not find file input"
                    except Exception as e:
                        return f"Upload error: {e}"

                elif name == "search_job_board":
                    board = inp["board"]
                    query = inp["query"]
                    location = inp["location"]
                    import urllib.parse
                    q = urllib.parse.quote_plus(query)
                    loc = urllib.parse.quote_plus(location)
                    if board == "linkedin":
                        url = f"https://www.linkedin.com/jobs/search/?keywords={q}&location={loc}&f_TPR=r86400"
                    elif board == "indeed":
                        url = f"https://www.indeed.com/jobs?q={q}&l={loc}&sort=date"
                    else:
                        url = f"https://www.google.com/search?q={q}+jobs+{loc}"
                    session.emit({"type": "action", "message": f"Searching {board.title()} for '{query}' in '{location}'"})
                    try:
                        await page.goto(url, wait_until="domcontentloaded", timeout=20000)
                        await asyncio.sleep(2.5)
                        await take_screenshot(f"{board.title()} search results")
                        return f"Searching {board} for '{query}' in '{location}'"
                    except Exception as e:
                        return f"Search failed: {e}"

                elif name == "extract_job_listings":
                    try:
                        text = await page.inner_text("body")
                        session.emit({"type": "action", "message": "Reading job listings..."})
                        return text[:6000]
                    except Exception as e:
                        return f"Could not extract listings: {e}"

                elif name == "decide_on_job":
                    decision = inp["decision"]
                    title = inp["title"]
                    company = inp["company"]
                    reason = inp["reason"]
                    score = inp.get("match_score", 0)
                    if decision == "apply":
                        session.jobs_found += 1
                    session.emit({
                        "type": "job_decision",
                        "decision": decision,
                        "title": title,
                        "company": company,
                        "location": inp.get("location", ""),
                        "url": inp.get("url", ""),
                        "match_score": score,
                        "reason": reason,
                    })
                    return f"Decision: {decision} — {title} at {company} ({reason})"

                elif name == "request_confirmation":
                    await take_screenshot("Ready to submit — awaiting confirmation")
                    session.emit({
                        "type": "confirm_required",
                        "job_title": inp.get("job_title", ""),
                        "company": inp.get("company", ""),
                        "summary": inp.get("summary", ""),
                        "fields_filled": inp.get("fields_filled", []),
                        "concerns": inp.get("concerns", []),
                    })
                    decision = await session.wait_for_confirmation()
                    if decision == "confirm":
                        session.emit({"type": "action", "message": "✓ Confirmed — submitting..."})
                        return "User confirmed. Proceed with submission."
                    elif decision == "skip":
                        session.emit({"type": "action", "message": "Skipped — moving to next job..."})
                        return "User skipped this job. Do NOT submit. Move to the next job."
                    else:  # stop
                        session.emit({"type": "action", "message": "Hunt stopped by user."})
                        return "User stopped the hunt. Call finish_hunt immediately."

                elif name == "submit_application":
                    if session._stopped:
                        return "Hunt stopped."
                    hint = inp.get("submit_button_hint", "Submit")
                    job_title = inp.get("job_title", "")
                    company = inp.get("company", "")
                    session.emit({"type": "action", "message": f"Submitting application to {company}..."})
                    try:
                        for strategy in [
                            f'button:has-text("{hint}")',
                            'button[type="submit"]',
                            'input[type="submit"]',
                            'button:has-text("Submit")',
                            'button:has-text("Apply")',
                            'button:has-text("Send Application")',
                        ]:
                            try:
                                el = page.locator(strategy).first
                                if await el.count() > 0:
                                    await el.click()
                                    await asyncio.sleep(2.5)
                                    await take_screenshot("Application submitted!")
                                    session.jobs_applied += 1
                                    session.emit({
                                        "type": "submitted",
                                        "message": f"Applied to {job_title} at {company}!",
                                        "jobs_applied": session.jobs_applied,
                                    })
                                    # Persist to DB
                                    try:
                                        db = db_session_factory()
                                        from app import models as m
                                        from sqlalchemy.orm import Session
                                        # Update hunt session stats
                                        hs = db.query(m.HuntSession).filter(m.HuntSession.id == session.hunt_id).first()
                                        if hs:
                                            hs.jobs_found = session.jobs_found
                                            hs.jobs_applied = session.jobs_applied
                                            db.commit()
                                        db.close()
                                    except Exception:
                                        pass
                                    return f"Submitted application to {company}."
                            except Exception:
                                continue
                        return "Could not find submit button — skipping."
                    except Exception as e:
                        return f"Submit error: {e}"

                elif name == "emit_thinking":
                    thought = inp.get("thought", "")
                    session.emit({"type": "thinking", "message": thought})
                    return "ok"

                elif name == "finish_hunt":
                    summary = inp.get("summary", "Hunt complete.")
                    session.emit({
                        "type": "complete",
                        "message": summary,
                        "jobs_found": session.jobs_found,
                        "jobs_applied": session.jobs_applied,
                    })
                    # Final DB update
                    try:
                        db = db_session_factory()
                        from app import models as m
                        hs = db.query(m.HuntSession).filter(m.HuntSession.id == session.hunt_id).first()
                        if hs:
                            hs.status = "complete"
                            hs.jobs_found = session.jobs_found
                            hs.jobs_applied = session.jobs_applied
                            from sqlalchemy.sql import func
                            hs.stopped_at = func.now()
                            db.commit()
                        db.close()
                    except Exception:
                        pass
                    return "Hunt finished."

                return f"Unknown tool: {name}"

            # ── Main agent loop ─────────────────────────────────────────────
            messages = [{"role": "user", "content": self._build_prompt(user, resume or {})}]
            tools = self._build_tools()

            while not session._stopped:
                response = await self.client.messages.create(
                    model="claude-opus-4-6",
                    max_tokens=8192,
                    system=HUNT_SYSTEM_PROMPT,
                    tools=tools,
                    messages=messages,
                )

                tool_results = []
                finished = False
                for block in response.content:
                    if hasattr(block, "type") and block.type == "tool_use":
                        result = await execute_tool(block.name, block.input)
                        tool_results.append({
                            "type": "tool_result",
                            "tool_use_id": block.id,
                            "content": result,
                        })
                        if block.name == "finish_hunt":
                            finished = True
                            break

                if response.stop_reason == "end_turn" or not tool_results or finished:
                    if not finished:
                        session.emit({"type": "complete", "message": "Hunt complete.", "jobs_found": session.jobs_found, "jobs_applied": session.jobs_applied})
                    break

                messages.append({"role": "assistant", "content": response.content})
                messages.append({"role": "user", "content": tool_results})

            await browser.close()

        # Clean up DB on stop
        if session._stopped:
            try:
                db = db_session_factory()
                from app import models as m
                from sqlalchemy.sql import func
                hs = db.query(m.HuntSession).filter(m.HuntSession.id == session.hunt_id).first()
                if hs:
                    hs.status = "stopped"
                    hs.jobs_found = session.jobs_found
                    hs.jobs_applied = session.jobs_applied
                    hs.stopped_at = func.now()
                    db.commit()
                db.close()
            except Exception:
                pass

        remove_hunt_session(session.hunt_id)

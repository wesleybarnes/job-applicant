"""
Autonomous job hunt agent — Playwright + Claude browse job boards and apply.
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
        self._confirm_decision: Optional[str] = None
        self._stopped = False
        self._paused = False
        self._resume_event: asyncio.Event = asyncio.Event()
        self._resume_event.set()  # not paused by default
        self._user_instruction: Optional[str] = None
        self.jobs_found = 0
        self.jobs_applied = 0
        # Last known cursor position for frontend overlay
        self.cursor_x: Optional[int] = None
        self.cursor_y: Optional[int] = None

    def emit(self, event: dict):
        self.events.put_nowait(event)

    async def wait_for_confirmation(self) -> str:
        self._confirm_event.clear()
        self._confirm_decision = None
        await self._confirm_event.wait()
        return self._confirm_decision or 'skip'

    def resolve_confirmation(self, decision: str):
        self._confirm_decision = decision
        self._confirm_event.set()

    def pause(self):
        self._paused = True
        self._resume_event.clear()
        self.emit({"type": "status", "message": "⏸ Agent paused — you have control"})

    def resume(self, instruction: Optional[str] = None):
        self._paused = False
        self._user_instruction = instruction
        self._resume_event.set()
        if instruction:
            self.emit({"type": "status", "message": f"▶ Resumed with instruction: {instruction}"})
        else:
            self.emit({"type": "status", "message": "▶ Agent resumed"})

    async def check_paused(self):
        """Call this in the agent loop — blocks while paused."""
        if self._paused:
            await self._resume_event.wait()

    def pop_instruction(self) -> Optional[str]:
        inst = self._user_instruction
        self._user_instruction = None
        return inst

    def stop(self):
        self._stopped = True
        self._paused = False
        self._resume_event.set()
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

HUNT_SYSTEM_PROMPT = """You are an elite autonomous job hunting agent. You control a real browser.
Be FAST and DECISIVE. Every second counts — the user is watching live.

## STEP 1: LinkedIn Login (ALWAYS do this first if credentials are provided)
If linkedin_email and linkedin_password are in the candidate profile:
1. navigate to https://www.linkedin.com/login
2. fill_field "email" with the email
3. fill_field "password" with the password
4. click "Sign in"
5. Wait for redirect, take screenshot
If no credentials: skip login, go straight to job search.

## STEP 2: Search for Jobs
Search LinkedIn Jobs FIRST (best for international roles):
- URL: https://www.linkedin.com/jobs/search/?keywords=ROLE&location=LOCATION&f_TPR=r604800&sortBy=DD
Use the exact target roles and locations from the candidate profile.
Also try Google Jobs: https://www.google.com/search?q=ROLE+jobs+LOCATION&ibp=htl;jobs

## STEP 3: Evaluate Each Listing FAST
For each job visible on screen:
- Read title, company, location
- Score 0-100 against candidate skills/roles
- Call decide_on_job immediately — DO NOT spend more than 10 seconds per job
- Move on. Speed > thoroughness at this stage.
Score 70+ = apply. Score <70 = skip with one-line reason.

## STEP 4: Apply (Easy Apply preferred)
For jobs you decided to apply:
1. Click the job listing
2. Look for "Easy Apply" button (LinkedIn) — use it if available
3. get_page_text to read the form
4. Fill every visible field using candidate data — never fabricate
5. For LinkedIn Easy Apply: fill each step, click Next, repeat
6. Call request_confirmation when you reach the final submit screen
7. Wait for user: confirm=submit, skip=abandon this job, stop=finish_hunt

## STEP 5: Company Career Pages (if Easy Apply not available)
Navigate directly to company's careers page and find the role.
Apply using the ATS form (Greenhouse, Lever, Workday, etc.)

## CRITICAL RULES
- NEVER spend more than 2 minutes on a single job
- NEVER fabricate information — if you don't have data for a field, leave it blank or note it in concerns
- ALWAYS call request_confirmation before ANY submit button
- If a page requires login you don't have, call decide_on_job with skip and move on
- call emit_thinking ONLY for major decisions, not every action
- After evaluating 15+ jobs or completing 3+ applications, call finish_hunt
- Indeed is usually blocked by Cloudflare — skip it entirely
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
                "description": "Take a screenshot.",
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
                "description": "Click a button or link by text/label.",
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
                "description": "Navigate to a job board with search query.",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "board": {"type": "string", "enum": ["linkedin", "indeed", "google"]},
                        "query": {"type": "string"},
                        "location": {"type": "string"},
                    },
                    "required": ["board", "query", "location"],
                },
            },
            {
                "name": "extract_job_listings",
                "description": "Read the current page and extract job listings.",
                "input_schema": {"type": "object", "properties": {}},
            },
            {
                "name": "decide_on_job",
                "description": "Record decision to apply or skip a job.",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "title": {"type": "string"},
                        "company": {"type": "string"},
                        "location": {"type": "string"},
                        "url": {"type": "string"},
                        "match_score": {"type": "number"},
                        "decision": {"type": "string", "enum": ["apply", "skip"]},
                        "reason": {"type": "string"},
                    },
                    "required": ["title", "company", "decision", "reason"],
                },
            },
            {
                "name": "request_confirmation",
                "description": "Pause and ask user to review before submitting.",
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
                "description": "Click the final submit button after confirmation.",
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
                "description": "Narrate your reasoning to the user.",
                "input_schema": {
                    "type": "object",
                    "properties": {"thought": {"type": "string"}},
                    "required": ["thought"],
                },
            },
            {
                "name": "finish_hunt",
                "description": "End the hunt with a summary.",
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

        linkedin_creds = ""
        if user.get('linkedin_email') and user.get('linkedin_password'):
            linkedin_creds = f"""
## LinkedIn Credentials (use ONLY for login on linkedin.com — do not share)
linkedin_email: {user.get('linkedin_email')}
linkedin_password: {user.get('linkedin_password')}
ACTION REQUIRED: Log in to LinkedIn FIRST before searching for jobs.
"""
        else:
            linkedin_creds = "\n## LinkedIn: No credentials provided. Search as guest (limited apply capability).\n"

        return f"""Hunt for jobs and apply on behalf of this candidate. BE FAST.
{linkedin_creds}
## Candidate Profile
Name: {user.get('full_name', '')}
Email: {user.get('email', '')}
Phone: {user.get('phone') or 'Not provided'}
Location: {user.get('location') or 'Not provided'}
LinkedIn profile: {user.get('linkedin_url') or ''}
Years of experience: {user.get('years_experience') or 'Not specified'}
Education: {user.get('education_level') or 'Not specified'}
Work authorization: {user.get('work_authorization') or 'Not specified'}
Willing to relocate: {'Yes' if user.get('willing_to_relocate') else 'No'}
Salary expectation: {salary}
Resume file: {resume_path}

## Search Targets
Roles: {roles}
Locations: {locations}
Remote preference: {user.get('remote_preference') or 'any'}

## Skills
{skills}

## Summary
{user.get('summary') or 'Not provided'}

## Application Answers (use verbatim)
{json.dumps(user.get('custom_answers') or {}, indent=2)}

START NOW. {"Login to LinkedIn first, then search." if user.get('linkedin_email') else "Search LinkedIn as guest, use Easy Apply where possible."}
"""

    async def run(self, user: dict, resume: dict, session: HuntSession, db_session_factory):
        try:
            from playwright.async_api import async_playwright
        except ImportError:
            session.emit({"type": "error", "message": "Playwright not installed."})
            return

        session.emit({"type": "status", "message": "Starting autonomous job hunt..."})

        async with async_playwright() as pw:
            browser = await pw.chromium.launch(
                headless=True,
                args=[
                    '--no-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-blink-features=AutomationControlled',
                ]
            )
            context = await browser.new_context(
                viewport={"width": 1280, "height": 900},
                user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            )
            page = await context.new_page()

            # ── Continuous screenshot stream (3fps independent of agent) ──────
            async def screenshot_loop():
                while not session._stopped:
                    try:
                        png = await page.screenshot(full_page=False)
                        b64 = base64.b64encode(png).decode()
                        meta = {}
                        if session.cursor_x is not None:
                            meta = {"cx": session.cursor_x, "cy": session.cursor_y}
                        session.emit({"type": "screenshot", "data": b64, **meta})
                    except Exception:
                        pass
                    await asyncio.sleep(0.35)  # ~3fps

            screenshot_task = asyncio.create_task(screenshot_loop())

            async def do_click_at(el, reason=""):
                """Click element and record cursor position."""
                try:
                    box = await el.bounding_box()
                    if box:
                        cx = int(box['x'] + box['width'] / 2)
                        cy = int(box['y'] + box['height'] / 2)
                        session.cursor_x = cx
                        session.cursor_y = cy
                        await page.mouse.move(cx, cy)
                except Exception:
                    pass
                await el.click()

            async def execute_tool(name: str, inp: dict) -> str:
                if session._stopped:
                    return "Hunt stopped."

                # Check if paused — block until resumed
                await session.check_paused()
                instruction = session.pop_instruction()
                if instruction:
                    return f"User instruction received: {instruction}. Please follow this guidance."

                if name == "navigate":
                    url = inp["url"]
                    session.emit({"type": "action", "message": f"→ {url[:80]}"})
                    try:
                        await page.goto(url, wait_until="domcontentloaded", timeout=20000)
                        await asyncio.sleep(1)
                        return f"Navigated to {url}"
                    except Exception as e:
                        return f"Navigation failed: {e}"

                elif name == "screenshot":
                    return f"Screenshot: {inp.get('label', '')}"

                elif name == "get_page_text":
                    try:
                        text = await page.inner_text("body")
                        return text[:6000]
                    except Exception as e:
                        return f"Could not read page: {e}"

                elif name == "fill_field":
                    hint = inp["selector_hint"]
                    value = inp["value"]
                    desc = inp.get("field_description", hint)
                    session.emit({"type": "action", "message": f"Filling: {desc}"})
                    try:
                        filled = False
                        strategies = [
                            f'[placeholder*="{hint}" i]',
                            f'[aria-label*="{hint}" i]',
                            f'[name*="{hint}" i]',
                            f'[id*="{hint}" i]',
                            f'label:has-text("{hint}") input',
                            f'label:has-text("{hint}") textarea',
                        ]
                        for strategy in strategies:
                            try:
                                el = page.locator(strategy).first
                                if await el.count() > 0:
                                    await el.click()
                                    await el.fill(value)
                                    filled = True
                                    break
                            except Exception:
                                continue
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
                            f'text="{hint}"',
                        ]:
                            try:
                                el = page.locator(strategy).first
                                if await el.count() > 0:
                                    await do_click_at(el, reason)
                                    await asyncio.sleep(0.8)
                                    return f"Clicked: {hint}"
                            except Exception:
                                continue
                        return f"Could not find: {hint}"
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
                            f'label:has-text("{hint}") select',
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
                    file_path = inp.get("file_path", resume.get("file_path", ""))
                    session.emit({"type": "action", "message": "Uploading resume..."})
                    if not file_path:
                        return "No resume file path"
                    try:
                        import os
                        if not os.path.exists(file_path):
                            return f"File not found: {file_path}"
                        for strategy in [
                            'input[type="file"][name*="resume" i]',
                            'input[type="file"][aria-label*="resume" i]',
                            'input[type="file"]',
                        ]:
                            try:
                                el = page.locator(strategy).first
                                if await el.count() > 0:
                                    await el.set_input_files(file_path)
                                    await asyncio.sleep(1)
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
                        url = f"https://www.linkedin.com/jobs/search/?keywords={q}&location={loc}&f_TPR=r86400&sortBy=DD"
                    elif board == "indeed":
                        url = f"https://www.indeed.com/jobs?q={q}&l={loc}&sort=date"
                    else:
                        url = f"https://www.google.com/search?q={q}+jobs+{loc}"
                    session.emit({"type": "action", "message": f"Searching {board.title()} for '{query}' in '{location}'"})
                    try:
                        await page.goto(url, wait_until="domcontentloaded", timeout=20000)
                        await asyncio.sleep(1.5)
                        return f"On {board} search for '{query}' in '{location}'"
                    except Exception as e:
                        return f"Search failed: {e}"

                elif name == "extract_job_listings":
                    try:
                        text = await page.inner_text("body")
                        session.emit({"type": "action", "message": "Reading job listings..."})
                        return text[:7000]
                    except Exception as e:
                        return f"Could not extract: {e}"

                elif name == "decide_on_job":
                    decision = inp["decision"]
                    title = inp["title"]
                    company = inp["company"]
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
                        "reason": inp["reason"],
                    })
                    return f"{decision}: {title} at {company}"

                elif name == "request_confirmation":
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
                        return "Confirmed. Proceed with submit_application."
                    elif decision == "skip":
                        session.emit({"type": "action", "message": "Skipped — moving on..."})
                        return "Skipped. Move to next job."
                    else:
                        session.emit({"type": "action", "message": "Hunt stopped by user."})
                        return "Stopped. Call finish_hunt."

                elif name == "submit_application":
                    if session._stopped:
                        return "Hunt stopped."
                    hint = inp.get("submit_button_hint", "Submit")
                    job_title = inp.get("job_title", "")
                    company = inp.get("company", "")
                    session.emit({"type": "action", "message": f"Submitting to {company}..."})
                    try:
                        for strategy in [
                            f'button:has-text("{hint}")',
                            'button[type="submit"]',
                            'button:has-text("Submit")',
                            'button:has-text("Apply")',
                            'button:has-text("Send Application")',
                        ]:
                            try:
                                el = page.locator(strategy).first
                                if await el.count() > 0:
                                    await do_click_at(el, "submit")
                                    await asyncio.sleep(2)
                                    session.jobs_applied += 1
                                    session.emit({
                                        "type": "submitted",
                                        "message": f"Applied to {job_title} at {company}!",
                                        "jobs_applied": session.jobs_applied,
                                    })
                                    _persist_stats(session, db_session_factory)
                                    return f"Submitted to {company}."
                            except Exception:
                                continue
                        return "Could not find submit button."
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
                    _finalize_db(session, db_session_factory, "complete")
                    return "Hunt finished."

                return f"Unknown tool: {name}"

            # ── Main agent loop ──────────────────────────────────────────────
            messages = [{"role": "user", "content": self._build_prompt(user, resume or {})}]
            tools = self._build_tools()

            try:
                while not session._stopped:
                    await session.check_paused()
                    if session._stopped:
                        break

                    response = await self.client.messages.create(
                        model="claude-opus-4-6",
                        max_tokens=4096,
                        system=HUNT_SYSTEM_PROMPT,
                        tools=tools,
                        messages=messages,
                    )

                    tool_results = []
                    finished = False

                    for block in response.content:
                        if session._stopped:
                            break
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
                            session.emit({
                                "type": "complete",
                                "message": "Hunt complete.",
                                "jobs_found": session.jobs_found,
                                "jobs_applied": session.jobs_applied,
                            })
                            _finalize_db(session, db_session_factory, "complete")
                        break

                    messages.append({"role": "assistant", "content": response.content})
                    messages.append({"role": "user", "content": tool_results})

            finally:
                screenshot_task.cancel()
                try:
                    await screenshot_task
                except asyncio.CancelledError:
                    pass
                await browser.close()

        if session._stopped:
            _finalize_db(session, db_session_factory, "stopped")

        remove_hunt_session(session.hunt_id)


def _persist_stats(session: HuntSession, factory):
    try:
        db = factory()
        from app import models as m
        hs = db.query(m.HuntSession).filter(m.HuntSession.id == session.hunt_id).first()
        if hs:
            hs.jobs_found = session.jobs_found
            hs.jobs_applied = session.jobs_applied
            db.commit()
        db.close()
    except Exception:
        pass


def _finalize_db(session: HuntSession, factory, status: str):
    try:
        db = factory()
        from app import models as m
        from sqlalchemy.sql import func
        hs = db.query(m.HuntSession).filter(m.HuntSession.id == session.hunt_id).first()
        if hs:
            hs.status = status
            hs.jobs_found = session.jobs_found
            hs.jobs_applied = session.jobs_applied
            hs.stopped_at = func.now()
            db.commit()
        db.close()
    except Exception:
        pass

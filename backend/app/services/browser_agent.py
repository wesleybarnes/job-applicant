"""
Browser automation service — Playwright + Claude control a real browser.

Flow:
  1. Agent navigates to the job application URL
  2. Claude analyzes the page, fills fields using user profile + resume
  3. Before final submit, emits a `confirm_required` event and pauses
  4. If auto_apply=True, skips confirmation and submits automatically
  5. Screenshots stream continuously so the user can watch live
"""
import asyncio
import base64
import json
import time
from typing import AsyncIterator, Optional
import anthropic
from app.config import settings

# ─── Session manager ────────────────────────────────────────────────────────

class BrowserSession:
    """Holds a live Playwright session for one application run."""

    def __init__(self, application_id: int, auto_apply: bool = False):
        self.application_id = application_id
        self.auto_apply = auto_apply
        self.events: asyncio.Queue = asyncio.Queue()
        self._confirm_event: asyncio.Event = asyncio.Event()
        self._confirm_decision: Optional[bool] = None  # True=confirm, False=cancel
        self._cancelled = False

    def emit(self, event: dict):
        self.events.put_nowait(event)

    async def wait_for_confirmation(self) -> bool:
        """Block until the user confirms or cancels. Returns True = proceed."""
        if self.auto_apply:
            return True
        self._confirm_event.clear()
        await self._confirm_event.wait()
        return self._confirm_decision is True

    def resolve_confirmation(self, confirmed: bool):
        self._confirm_decision = confirmed
        self._confirm_event.set()

    def cancel(self):
        self._cancelled = True
        self.resolve_confirmation(False)


_sessions: dict[int, BrowserSession] = {}


def get_session(application_id: int) -> Optional[BrowserSession]:
    return _sessions.get(application_id)


def create_session(application_id: int, auto_apply: bool) -> BrowserSession:
    session = BrowserSession(application_id, auto_apply)
    _sessions[application_id] = session
    return session


def remove_session(application_id: int):
    _sessions.pop(application_id, None)


# ─── Browser agent ──────────────────────────────────────────────────────────

BROWSER_SYSTEM_PROMPT = """You are an expert job application assistant controlling a real web browser.
Your job is to navigate to job application pages and fill them out accurately using the candidate's information.

Rules:
- Only fill fields with information provided in the candidate profile — never fabricate
- If a required field has no matching data, leave it blank and note it
- Use the candidate's cover letter when asked for a cover letter / personal statement
- For salary fields, use the midpoint of their range unless instructed otherwise
- Always take a screenshot after filling each section so the user can review
- Before calling submit_application, ALWAYS call request_confirmation first
- If the page asks for something unexpected, emit a note and ask via request_confirmation
"""


class BrowserAutomationAgent:
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
                        "reason": {"type": "string", "description": "Why navigating here"},
                    },
                    "required": ["url"],
                },
            },
            {
                "name": "screenshot",
                "description": "Take a screenshot and stream it to the user. Always call this after filling a section.",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "label": {"type": "string", "description": "What the screenshot shows"},
                    },
                    "required": ["label"],
                },
            },
            {
                "name": "get_page_text",
                "description": "Get all visible text from the current page so you can understand the form fields.",
                "input_schema": {"type": "object", "properties": {}},
            },
            {
                "name": "fill_field",
                "description": "Fill a form input field.",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "selector_hint": {
                            "type": "string",
                            "description": "Label text, placeholder, or aria-label to identify the field",
                        },
                        "value": {"type": "string", "description": "Value to type"},
                        "field_description": {"type": "string", "description": "Human-readable field name"},
                    },
                    "required": ["selector_hint", "value"],
                },
            },
            {
                "name": "click",
                "description": "Click a button or element.",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "selector_hint": {"type": "string", "description": "Button text, aria-label, or element description"},
                        "reason": {"type": "string"},
                    },
                    "required": ["selector_hint"],
                },
            },
            {
                "name": "select_option",
                "description": "Select an option from a dropdown.",
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
                "description": "Upload the resume file to a file input.",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "selector_hint": {"type": "string", "description": "File input label or aria-label"},
                        "file_path": {"type": "string", "description": "Path to the resume file"},
                    },
                    "required": ["selector_hint", "file_path"],
                },
            },
            {
                "name": "request_confirmation",
                "description": (
                    "Pause and ask the user to review before submitting. "
                    "ALWAYS call this before submit_application. "
                    "Show a summary of what will be submitted."
                ),
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "summary": {
                            "type": "string",
                            "description": "Summary of what has been filled out",
                        },
                        "fields_filled": {
                            "type": "array",
                            "items": {"type": "string"},
                            "description": "List of fields that were filled",
                        },
                        "concerns": {
                            "type": "array",
                            "items": {"type": "string"},
                            "description": "Any issues or missing fields",
                        },
                    },
                    "required": ["summary", "fields_filled"],
                },
            },
            {
                "name": "submit_application",
                "description": "Click the final submit button. Only call AFTER request_confirmation was approved.",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "submit_button_hint": {"type": "string", "description": "Text on the submit button"},
                    },
                    "required": ["submit_button_hint"],
                },
            },
        ]

    def _build_prompt(self, user, job, resume, cover_letter: str) -> str:
        resume_path = resume.file_path if resume else ""
        return f"""Please fill out and submit this job application for the candidate.

## Job Application URL
{job.url or 'No URL provided — cannot automate'}

## Candidate Information
Name: {user.full_name}
Email: {user.email}
Phone: {user.phone or 'Not provided'}
Location: {user.location or 'Not provided'}
LinkedIn: {user.linkedin_url or ''}
GitHub: {user.github_url or ''}
Years of experience: {user.years_experience or 'Not specified'}
Education: {user.education_level or 'Not specified'}
Work authorization: {user.work_authorization or 'Not specified'}
Salary expectation: ${user.salary_min or 0:,} – ${user.salary_max or 0:,}
Skills: {', '.join(user.skills or [])}
Resume file path: {resume_path}

## Cover Letter (use this when asked)
{cover_letter or 'No cover letter generated yet.'}

## Professional Summary
{user.summary or 'Not provided'}

## Pre-written Application Answers
{json.dumps(user.custom_answers or {}, indent=2)}

## Instructions
1. Call `navigate` to go to the job URL
2. Call `get_page_text` to understand the page and form fields
3. Call `screenshot` to see the current state
4. Fill each field using `fill_field`, `select_option`, or `upload_file`
5. Take screenshots between sections
6. Call `request_confirmation` with a full summary of what you filled
7. Wait — the user will confirm or cancel
8. If confirmed, call `submit_application`

If the URL has no application form (e.g. it redirects to LinkedIn Easy Apply, Greenhouse, Lever, Workday, etc.), navigate there and fill it out.
"""

    async def run(
        self,
        user,
        job,
        resume,
        cover_letter: str,
        session: BrowserSession,
    ):
        """Run the browser automation agent with a live Playwright browser."""
        try:
            from playwright.async_api import async_playwright
        except ImportError:
            session.emit({"type": "error", "message": "Playwright not installed. Run: pip install playwright && playwright install chromium"})
            return

        if not job.url:
            session.emit({"type": "error", "message": "This job has no URL — cannot automate."})
            return

        session.emit({"type": "status", "message": f"Opening browser for {job.company}..."})

        async with async_playwright() as pw:
            browser = await pw.chromium.launch(headless=False, slow_mo=300)
            context = await browser.new_context(viewport={"width": 1280, "height": 900})
            page = await context.new_page()

            async def take_screenshot(label: str = "") -> str:
                png = await page.screenshot(full_page=False)
                b64 = base64.b64encode(png).decode()
                session.emit({"type": "screenshot", "data": b64, "label": label})
                return b64

            async def execute_tool(name: str, inp: dict) -> str:
                if session._cancelled:
                    return "Session cancelled by user."

                if name == "navigate":
                    url = inp["url"]
                    session.emit({"type": "action", "message": f"Navigating to {url}"})
                    try:
                        await page.goto(url, wait_until="domcontentloaded", timeout=20000)
                        await asyncio.sleep(1.5)
                        await take_screenshot(f"Navigated to {inp.get('reason', url)}")
                        return f"Navigated to {url}"
                    except Exception as e:
                        return f"Navigation failed: {e}"

                elif name == "screenshot":
                    label = inp.get("label", "")
                    session.emit({"type": "action", "message": f"Screenshot: {label}"})
                    await take_screenshot(label)
                    return f"Screenshot taken: {label}"

                elif name == "get_page_text":
                    session.emit({"type": "action", "message": "Reading page content..."})
                    try:
                        text = await page.inner_text("body")
                        return text[:4000]
                    except Exception as e:
                        return f"Could not read page: {e}"

                elif name == "fill_field":
                    hint = inp["selector_hint"]
                    value = inp["value"]
                    desc = inp.get("field_description", hint)
                    session.emit({"type": "action", "message": f"Filling: {desc}"})
                    try:
                        # Try multiple strategies to find the field
                        filled = False
                        for strategy in [
                            f'[placeholder*="{hint}" i]',
                            f'[aria-label*="{hint}" i]',
                            f'[name*="{hint}" i]',
                            f'[id*="{hint}" i]',
                            f'label:has-text("{hint}") + input',
                            f'label:has-text("{hint}") ~ input',
                            f'label:has-text("{hint}") input',
                            f'input[type="text"] >> nth=0',  # fallback
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

                        # Also try textarea
                        if not filled:
                            try:
                                el = page.locator(f'textarea[aria-label*="{hint}" i], textarea[placeholder*="{hint}" i]').first
                                if await el.count() > 0:
                                    await el.fill(value)
                                    filled = True
                            except Exception:
                                pass

                        await asyncio.sleep(0.3)
                        return f"{'Filled' if filled else 'Could not find field for'}: {desc}"
                    except Exception as e:
                        return f"Error filling {desc}: {e}"

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
                                    await asyncio.sleep(1)
                                    break
                            except Exception:
                                continue
                        await take_screenshot(f"After clicking {hint}")
                        return f"Clicked: {hint}"
                    except Exception as e:
                        return f"Click failed: {e}"

                elif name == "select_option":
                    hint = inp["selector_hint"]
                    val = inp["option_value"]
                    session.emit({"type": "action", "message": f"Selecting '{val}' in {hint}"})
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
                                    return f"Selected '{val}' in {hint}"
                            except Exception:
                                continue
                        return f"Could not find dropdown: {hint}"
                    except Exception as e:
                        return f"Select error: {e}"

                elif name == "upload_file":
                    hint = inp["selector_hint"]
                    path = inp.get("file_path", "")
                    session.emit({"type": "action", "message": f"Uploading resume to {hint}"})
                    if not path:
                        return "No resume file path available"
                    try:
                        import os
                        if not os.path.exists(path):
                            return f"File not found: {path}"
                        for strategy in [
                            f'input[type="file"][aria-label*="{hint}" i]',
                            f'input[type="file"][name*="resume" i]',
                            'input[type="file"]',
                        ]:
                            try:
                                el = page.locator(strategy).first
                                if await el.count() > 0:
                                    await el.set_input_files(path)
                                    await asyncio.sleep(1)
                                    await take_screenshot("Resume uploaded")
                                    return f"Uploaded resume: {os.path.basename(path)}"
                            except Exception:
                                continue
                        return "Could not find file upload input"
                    except Exception as e:
                        return f"Upload error: {e}"

                elif name == "request_confirmation":
                    await take_screenshot("Ready to submit — awaiting your confirmation")
                    session.emit({
                        "type": "confirm_required",
                        "summary": inp.get("summary", ""),
                        "fields_filled": inp.get("fields_filled", []),
                        "concerns": inp.get("concerns", []),
                        "message": "Review the application above. Confirm to submit.",
                    })
                    confirmed = await session.wait_for_confirmation()
                    if confirmed:
                        session.emit({"type": "action", "message": "Confirmed — submitting application..."})
                        return "User confirmed. Proceed with submission."
                    else:
                        session.emit({"type": "cancelled", "message": "Submission cancelled by user."})
                        return "User cancelled. Do not submit."

                elif name == "submit_application":
                    if session._cancelled:
                        return "Cancelled — not submitting."
                    hint = inp.get("submit_button_hint", "Submit")
                    session.emit({"type": "action", "message": f"Submitting application..."})
                    try:
                        for strategy in [
                            f'button:has-text("{hint}")',
                            'button[type="submit"]',
                            'input[type="submit"]',
                            'button:has-text("Submit")',
                            'button:has-text("Apply")',
                            'button:has-text("Send")',
                        ]:
                            try:
                                el = page.locator(strategy).first
                                if await el.count() > 0:
                                    await el.click()
                                    await asyncio.sleep(2)
                                    await take_screenshot("After submission")
                                    session.emit({
                                        "type": "submitted",
                                        "message": f"Application submitted to {job.company}!",
                                    })
                                    return "Application submitted successfully."
                            except Exception:
                                continue
                        return "Could not find submit button"
                    except Exception as e:
                        return f"Submit error: {e}"

                return f"Unknown tool: {name}"

            # ── Agent loop ──────────────────────────────────────────────────
            messages = [{"role": "user", "content": self._build_prompt(user, job, resume, cover_letter)}]
            tools = self._build_tools()

            while not session._cancelled:
                response = await self.client.messages.create(
                    model="claude-opus-4-6",
                    max_tokens=4096,
                    thinking={"type": "adaptive"},
                    system=BROWSER_SYSTEM_PROMPT,
                    tools=tools,
                    messages=messages,
                )

                tool_results = []
                for block in response.content:
                    if hasattr(block, "type") and block.type == "tool_use":
                        result = await execute_tool(block.name, block.input)
                        tool_results.append({
                            "type": "tool_result",
                            "tool_use_id": block.id,
                            "content": result,
                        })

                if response.stop_reason == "end_turn" or not tool_results:
                    break

                messages.append({"role": "assistant", "content": response.content})
                messages.append({"role": "user", "content": tool_results})

            await browser.close()
            if not session._cancelled:
                session.emit({"type": "complete", "message": "Browser session complete."})

        remove_session(session.application_id)

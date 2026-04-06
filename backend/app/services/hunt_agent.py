"""
Visual Hunt Agent — Smooth, human-like browsing with AI-powered form filling.

Architecture:
  - Playwright with slow_mo for visible, human-like browser interaction
  - 5fps screenshot streaming for smooth real-time viewing
  - Claude Haiku 4.5 for batch job scoring (cost-effective)
  - Claude Opus 4.6 with tools for intelligent form filling (reliable)
  - Human-like typing, cursor movement, and scrolling
  - Target: 5+ applications in 5 minutes

Cost per hunt session: ~$0.50-1.50 (Haiku scoring + Opus form fill)
"""
import asyncio
import base64
import json
import os
import re
from typing import Optional
import anthropic
from app.config import settings

# ─── In-memory session ──────────────────────────────────────────────────────

class HuntSession:
    def __init__(self, hunt_id: int, user_id: int, seen_urls: set = None, auto_apply: bool = False):
        self.hunt_id   = hunt_id
        self.user_id   = user_id
        self.events: asyncio.Queue = asyncio.Queue()
        self._confirm_event:   asyncio.Event  = asyncio.Event()
        self._confirm_decision: Optional[str] = None
        self._stopped  = False
        self._paused   = False
        self._resume_event: asyncio.Event = asyncio.Event()
        self._resume_event.set()
        self._user_instruction: Optional[str] = None
        self._question_event:  asyncio.Event  = asyncio.Event()
        self._question_answer: Optional[str]  = None
        self.jobs_found  = 0
        self.jobs_applied = 0
        self.cursor_x: Optional[int] = None
        self.cursor_y: Optional[int] = None
        self.seen_urls: set   = seen_urls or set()
        self.auto_apply: bool = auto_apply
        self.page             = None   # set once Playwright page is created

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
        self.emit({"type": "status", "message": "⏸ Paused — you have control"})

    def resume(self, instruction: Optional[str] = None):
        self._paused = False
        self._user_instruction = instruction
        self._resume_event.set()
        if instruction:
            self.emit({"type": "status", "message": f"▶ Resumed: {instruction}"})
        else:
            self.emit({"type": "status", "message": "▶ Resumed"})

    async def check_paused(self):
        if self._paused:
            await self._resume_event.wait()

    def pop_instruction(self) -> Optional[str]:
        inst = self._user_instruction
        self._user_instruction = None
        return inst

    def answer_question(self, answer: str):
        self._question_answer = answer
        self._question_event.set()

    def stop(self):
        self._stopped = True
        self._paused  = False
        self._resume_event.set()
        self.resolve_confirmation('stop')


_hunt_sessions: dict[int, HuntSession] = {}

def get_hunt_session(hunt_id: int) -> Optional[HuntSession]:
    return _hunt_sessions.get(hunt_id)

def create_hunt_session(hunt_id: int, user_id: int, seen_urls: set = None, auto_apply: bool = False) -> HuntSession:
    s = HuntSession(hunt_id, user_id, seen_urls=seen_urls, auto_apply=auto_apply)
    _hunt_sessions[hunt_id] = s
    return s

def remove_hunt_session(hunt_id: int):
    _hunt_sessions.pop(hunt_id, None)


# ─── Visual Hunt Agent ─────────────────────────────────────────────────────

FORM_FILL_TOOLS = [
    {
        "name": "fill_field",
        "description": "Fill a form input or textarea with a value. Use the label text or placeholder to identify the field.",
        "input_schema": {
            "type": "object",
            "properties": {
                "selector_hint": {"type": "string", "description": "The label text, placeholder, or aria-label of the field"},
                "value": {"type": "string", "description": "The value to type into the field"},
                "field_name": {"type": "string", "description": "Human-readable name like 'Email' or 'Years of experience'"},
            },
            "required": ["selector_hint", "value", "field_name"],
        },
    },
    {
        "name": "select_option",
        "description": "Select an option from a dropdown/select element.",
        "input_schema": {
            "type": "object",
            "properties": {
                "selector_hint": {"type": "string", "description": "Label or aria-label of the dropdown"},
                "option_text": {"type": "string", "description": "The visible text of the option to select"},
            },
            "required": ["selector_hint", "option_text"],
        },
    },
    {
        "name": "click_button",
        "description": "Click a button on the page. Use for Next, Submit, radio buttons, checkboxes, etc.",
        "input_schema": {
            "type": "object",
            "properties": {
                "button_text": {"type": "string", "description": "The text or aria-label of the button"},
                "reason": {"type": "string", "description": "Why clicking this button"},
            },
            "required": ["button_text"],
        },
    },
    {
        "name": "upload_resume",
        "description": "Upload the candidate's resume file to a file input on the page.",
        "input_schema": {
            "type": "object",
            "properties": {},
        },
    },
    {
        "name": "form_complete",
        "description": "Call this when all visible fields on the current form page are filled and you're ready to proceed. Include a summary of what was filled.",
        "input_schema": {
            "type": "object",
            "properties": {
                "fields_filled": {"type": "array", "items": {"type": "string"}, "description": "List of field names that were filled"},
                "next_action": {"type": "string", "enum": ["click_next", "click_submit", "done"], "description": "What to do next"},
                "concerns": {"type": "array", "items": {"type": "string"}, "description": "Any issues or fields that couldn't be filled"},
            },
            "required": ["fields_filled", "next_action"],
        },
    },
]

FORM_FILL_SYSTEM = """You are filling out a job application form. You have the candidate's complete profile.
Look at the form fields on the current page and fill each one using the candidate's data.

Rules:
- Fill EVERY visible empty field that you have data for
- Use fill_field for text inputs and textareas
- Use select_option for dropdowns
- Use click_button for radio buttons, checkboxes, or navigation buttons
- Use upload_resume if there's a file upload for resume/CV
- NEVER fabricate information — only use what's in the candidate profile
- When done with all fields on this page, call form_complete
- For "years of experience" type fields, use the number from the profile
- For salary fields, use the midpoint of the range
- For "Why do you want this job?" use the candidate's custom answer or summary
- Be efficient — fill all fields then call form_complete"""


class HybridHuntAgent:
    """Visual hunt agent: Haiku for scoring, Opus for form filling."""

    def __init__(self):
        self.client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)

    # ── User profile text (cached across Haiku calls) ────────────────────
    def _profile_text(self, user: dict) -> str:
        roles     = ', '.join(user.get('target_roles') or []) or 'relevant tech roles'
        locations = ', '.join(user.get('target_locations') or []) or user.get('location') or 'Remote'
        skills    = ', '.join(user.get('skills') or []) or 'not specified'
        salary    = ''
        if user.get('salary_min') or user.get('salary_max'):
            salary = f"${user.get('salary_min',0):,} – ${user.get('salary_max',0):,}"
        custom = json.dumps(user.get('custom_answers') or {}, indent=2)
        return f"""Name: {user.get('full_name','')}
Email: {user.get('email','')}
Phone: {user.get('phone') or 'N/A'}
Location: {user.get('location') or 'N/A'}
LinkedIn: {user.get('linkedin_url') or ''}
GitHub: {user.get('github_url') or ''}
Portfolio: {user.get('portfolio_url') or ''}
Years experience: {user.get('years_experience') or 'N/A'}
Education: {user.get('education_level') or 'N/A'}
Work authorization: {user.get('work_authorization') or 'N/A'}
Willing to relocate: {'Yes' if user.get('willing_to_relocate') else 'No'}
Remote preference: {user.get('remote_preference') or 'any'}
Salary: {salary or 'Flexible'}
Target roles: {roles}
Target locations: {locations}
Skills: {skills}
Summary: {user.get('summary') or 'N/A'}
Pre-written answers: {custom}""".strip()

    # ── Batch job scoring (Haiku) ────────────────────────────────────────
    async def _batch_score_jobs(self, jobs: list[dict], user: dict) -> list[dict]:
        if not jobs:
            return []
        job_list = "\n".join(
            f"{i+1}. {j.get('title','')} at {j.get('company','')} — {j.get('location','')}: {j.get('snippet','')[:300]}"
            for i, j in enumerate(jobs)
        )
        try:
            resp = await self.client.messages.create(
                model="claude-haiku-4-5-20251001",
                max_tokens=800,
                system=[{
                    "type": "text",
                    "text": "You are a job matching assistant. Score each job 0-100 for fit. Reply ONLY with JSON array: [{\"index\":1,\"score\":85,\"reason\":\"brief reason\"},...]",
                    "cache_control": {"type": "ephemeral"},
                }],
                messages=[{
                    "role": "user",
                    "content": [
                        {"type": "text", "text": f"Candidate profile:\n{self._profile_text(user)}", "cache_control": {"type": "ephemeral"}},
                        {"type": "text", "text": f"Score these jobs:\n{job_list}"},
                    ]
                }],
                extra_headers={"anthropic-beta": "prompt-caching-2024-07-31"},
            )
            text = resp.content[0].text.strip()
            match = re.search(r'\[.*\]', text, re.DOTALL)
            if match:
                scores = json.loads(match.group())
                for item in scores:
                    idx = item.get('index', 0) - 1
                    if 0 <= idx < len(jobs):
                        jobs[idx]['score']  = item.get('score', 0)
                        jobs[idx]['reason'] = item.get('reason', '')
        except Exception:
            for j in jobs:
                j.setdefault('score', 75)
                j.setdefault('reason', 'Could not evaluate')
        return jobs

    # ── LinkedIn login ───────────────────────────────────────────────────
    async def _linkedin_login(self, page, user: dict, session: HuntSession) -> bool:
        email    = user.get('linkedin_email')
        password = user.get('linkedin_password')
        if not email or not password:
            session.emit({"type": "status", "message": "No LinkedIn credentials — searching as guest"})
            return False

        session.emit({"type": "action", "message": "Logging in to LinkedIn..."})
        try:
            await page.goto("https://www.linkedin.com/login", wait_until="domcontentloaded", timeout=20000)
            await asyncio.sleep(1.5)
            # Type credentials with human-like delay
            await page.locator('input[name="session_key"]').click()
            await page.keyboard.type(email, delay=25)
            await asyncio.sleep(0.3)
            await page.locator('input[name="session_password"]').click()
            await page.keyboard.type(password, delay=25)
            await asyncio.sleep(0.5)
            await page.click('button[type="submit"]')
            await asyncio.sleep(3)
            if "feed" in page.url or "checkpoint" in page.url or "home" in page.url:
                session.emit({"type": "action", "message": "✓ LinkedIn login successful"})
                return True
            else:
                session.emit({"type": "action", "message": "⚠ LinkedIn login may have failed — continuing as guest"})
                return False
        except Exception as e:
            session.emit({"type": "action", "message": f"LinkedIn login error: {str(e)[:60]}"})
            return False

    # ── Extract jobs from page DOM (zero AI cost) ────────────────────────
    async def _extract_jobs_from_page(self, page, board: str) -> list[dict]:
        jobs = []
        try:
            if board == "linkedin":
                # Try multiple selector strategies — LinkedIn changes DOM between logged-in, guest, and mobile
                card_selectors = [
                    # Logged-in selectors
                    '.job-card-container',
                    '.jobs-search-results__list-item',
                    '[data-job-id]',
                    # Guest/public page selectors
                    '.base-card',
                    '.base-search-card',
                    '.jobs-search__results-list > li',
                    '.job-search-card',
                    'ul.jobs-search__results-list li',
                    # Generic fallback
                    '[class*="job-card"]',
                    '[class*="search-card"]',
                ]
                cards = []
                for sel in card_selectors:
                    cards = await page.query_selector_all(sel)
                    if len(cards) > 2:
                        break

                for card in cards[:25]:
                    try:
                        title   = await card.query_selector('.job-card-list__title, .base-search-card__title, .base-card__full-link, h3, h4.base-search-card__title')
                        company = await card.query_selector('.job-card-container__company-name, .base-search-card__subtitle, .hidden-nested-link, h4.base-search-card__subtitle')
                        loc     = await card.query_selector('.job-card-container__metadata-item, .job-search-card__location, .base-search-card__metadata span')
                        link    = await card.query_selector('a[href*="/jobs/view/"], a[href*="jobs/view"], a.base-card__full-link, a[href*="/jobs/"]')

                        title_text   = (await title.inner_text()).strip()   if title   else ''
                        company_text = (await company.inner_text()).strip() if company else ''
                        loc_text     = (await loc.inner_text()).strip()     if loc     else ''
                        url          = await link.get_attribute('href')     if link    else ''

                        if title_text and url:
                            if url.startswith('/'):
                                url = 'https://www.linkedin.com' + url
                            url = url.split('?')[0]
                            jobs.append({'title': title_text, 'company': company_text, 'location': loc_text, 'url': url, 'snippet': '', 'board': 'linkedin'})
                    except Exception:
                        continue

                # If DOM selectors found nothing, try extracting all links with /jobs/view/
                if not jobs:
                    try:
                        links = await page.query_selector_all('a[href*="/jobs/view/"]')
                        seen = set()
                        for link in links[:20]:
                            try:
                                url = await link.get_attribute('href') or ''
                                text = (await link.inner_text()).strip()
                                if url.startswith('/'):
                                    url = 'https://www.linkedin.com' + url
                                url = url.split('?')[0]
                                if url not in seen and text and len(text) > 3:
                                    seen.add(url)
                                    jobs.append({'title': text, 'company': '', 'location': '', 'url': url, 'snippet': '', 'board': 'linkedin'})
                            except Exception:
                                continue
                    except Exception:
                        pass
            elif board == "indeed":
                # Indeed job cards
                card_sels = ['.job_seen_beacon', '.jobsearch-ResultsList > li', '.result', '[data-jk]', '.tapItem']
                cards = []
                for sel in card_sels:
                    cards = await page.query_selector_all(sel)
                    if len(cards) > 2:
                        break
                for card in cards[:20]:
                    try:
                        title_el = await card.query_selector('h2.jobTitle a, .jobTitle a, h2 a, a[data-jk]')
                        company_el = await card.query_selector('[data-testid="company-name"], .companyName, .company')
                        loc_el = await card.query_selector('[data-testid="text-location"], .companyLocation, .location')
                        title_text = (await title_el.inner_text()).strip() if title_el else ''
                        company_text = (await company_el.inner_text()).strip() if company_el else ''
                        loc_text = (await loc_el.inner_text()).strip() if loc_el else ''
                        href = await title_el.get_attribute('href') if title_el else ''
                        if title_text and href:
                            if href.startswith('/'):
                                href = 'https://www.indeed.com' + href
                            jobs.append({'title': title_text, 'company': company_text, 'location': loc_text, 'url': href.split('&')[0], 'snippet': '', 'board': 'indeed'})
                    except Exception:
                        continue

            elif board == "google_jobs":
                # Google Jobs uses a special widget — extract from the list items
                card_sels = ['li.iFjolb', '[data-ved] .PwjeAc', '.gws-plugins-horizon-jobs__tl-lif']
                cards = []
                for sel in card_sels:
                    cards = await page.query_selector_all(sel)
                    if len(cards) > 1:
                        break
                for card in cards[:15]:
                    try:
                        title_el = await card.query_selector('.BjJfJf, .sH3zle, [role="heading"]')
                        company_el = await card.query_selector('.vNEEBe, .nJlQNd')
                        loc_el = await card.query_selector('.Qk80Jf, .pwO8Gc')
                        title_text = (await title_el.inner_text()).strip() if title_el else ''
                        company_text = (await company_el.inner_text()).strip() if company_el else ''
                        loc_text = (await loc_el.inner_text()).strip() if loc_el else ''
                        # Google Jobs doesn't have direct links — use Google search URL
                        if title_text:
                            import urllib.parse as up
                            search_url = f"https://www.google.com/search?q={up.quote_plus(title_text + ' ' + company_text + ' apply')}"
                            jobs.append({'title': title_text, 'company': company_text, 'location': loc_text, 'url': search_url, 'snippet': '', 'board': 'google_jobs'})
                    except Exception:
                        continue

            elif board == "tokyodev":
                cards = await page.query_selector_all('article, .job-listing, [class*="job"]')
                for card in cards[:15]:
                    try:
                        title = await card.query_selector('h2, h3, .job-title, [class*="title"]')
                        link  = await card.query_selector('a')
                        if title and link:
                            url = await link.get_attribute('href') or ''
                            if url and not url.startswith('http'):
                                url = 'https://www.tokyodev.com' + url
                            jobs.append({'title': (await title.inner_text()).strip(), 'company': '', 'location': 'Japan', 'url': url, 'snippet': '', 'board': 'tokyodev'})
                    except Exception:
                        continue
        except Exception:
            pass

        if not jobs:
            try:
                text = await page.inner_text("body")
                lines = [l.strip() for l in text.split('\n') if 10 < len(l.strip()) < 100]
                url = page.url
                for i, line in enumerate(lines[:30]):
                    if any(k in line.lower() for k in ['engineer', 'developer', 'designer', 'manager', 'analyst', 'scientist', 'intern']):
                        jobs.append({'title': line, 'company': '', 'location': '', 'url': url + f'#job-{i}', 'snippet': '', 'board': board})
            except Exception:
                pass
        return jobs

    # ── Human-like helpers ───────────────────────────────────────────────

    async def _move_cursor_to(self, page, session: HuntSession, x: int, y: int):
        """Move cursor visually to coordinates."""
        session.cursor_x = x
        session.cursor_y = y
        await page.mouse.move(x, y, steps=8)

    async def _click_element(self, page, session: HuntSession, element):
        """Click with visible cursor movement."""
        try:
            box = await element.bounding_box()
            if box:
                cx = int(box['x'] + box['width'] / 2)
                cy = int(box['y'] + box['height'] / 2)
                await self._move_cursor_to(page, session, cx, cy)
        except Exception:
            pass
        await element.click()
        await asyncio.sleep(0.4)

    async def _human_type(self, page, element, text: str, session: HuntSession):
        """Type with human-like character-by-character delay."""
        try:
            box = await element.bounding_box()
            if box:
                cx = int(box['x'] + box['width'] / 2)
                cy = int(box['y'] + box['height'] / 2)
                await self._move_cursor_to(page, session, cx, cy)
        except Exception:
            pass
        await element.click()
        await asyncio.sleep(0.15)
        # Clear existing value first
        await element.fill('')
        # Type with visible delay — faster for long text
        delay = 20 if len(text) < 30 else 8
        await element.type(text, delay=delay)
        await asyncio.sleep(0.2)

    async def _smooth_scroll(self, page, amount: int, steps: int = 4):
        """Scroll gradually for visible effect."""
        step_amount = amount // steps
        for _ in range(steps):
            await page.evaluate(f"window.scrollBy(0, {step_amount})")
            await asyncio.sleep(0.3)

    # ── Opus-powered form filling ────────────────────────────────────────

    async def _opus_fill_form(self, page, user: dict, resume_path: str, session: HuntSession, job_title: str, company: str) -> dict:
        """
        Use Opus to intelligently read and fill an application form.
        Human-like typing with visible cursor movement.
        Returns: {'fields_filled': [...], 'concerns': [...], 'submitted': bool}
        """
        all_fields_filled = []
        all_concerns = []

        # Process up to 5 form pages (multi-step forms)
        for page_num in range(5):
            if session._stopped:
                break

            # Get current form state
            await asyncio.sleep(0.5)
            try:
                page_text = await page.inner_text("body")
                page_text = page_text[:3000]
            except Exception:
                page_text = ""

            # Ask Opus to analyze and fill
            prompt = f"""You are filling a job application for "{job_title}" at "{company}".

Current form page text:
{page_text}

Candidate profile:
{self._profile_text(user)}

Resume file path: {resume_path}

Look at the form fields above. Fill every empty field using the candidate's data.
Call fill_field for each text input, select_option for dropdowns, click_button for radio/checkbox,
and upload_resume if there's a file upload. When all fields are filled, call form_complete."""

            try:
                resp = await self.client.messages.create(
                    model="claude-opus-4-6",
                    max_tokens=2048,
                    system=FORM_FILL_SYSTEM,
                    tools=FORM_FILL_TOOLS,
                    messages=[{"role": "user", "content": prompt}],
                )
            except Exception as e:
                session.emit({"type": "action", "message": f"AI form analysis failed: {str(e)[:60]}"})
                all_concerns.append("AI could not analyze form")
                break

            # Execute each tool call with human-like interaction
            form_done = False
            next_action = None

            for block in resp.content:
                if session._stopped:
                    break
                if not hasattr(block, 'type') or block.type != 'tool_use':
                    continue

                tool_name = block.name
                inp = block.input

                if tool_name == "fill_field":
                    hint = inp.get("selector_hint", "")
                    value = inp.get("value", "")
                    fname = inp.get("field_name", hint)
                    if not value:
                        continue

                    session.emit({"type": "action", "message": f"Filling: {fname}"})
                    filled = False
                    for strategy in [
                        f'[placeholder*="{hint}" i]',
                        f'[aria-label*="{hint}" i]',
                        f'[name*="{hint}" i]',
                        f'[id*="{hint}" i]',
                        f'label:has-text("{hint}") + input',
                        f'label:has-text("{hint}") ~ input',
                        f'label:has-text("{hint}") input',
                        f'textarea[placeholder*="{hint}" i]',
                        f'textarea[aria-label*="{hint}" i]',
                    ]:
                        try:
                            el = page.locator(strategy).first
                            if await el.count() > 0 and await el.is_visible():
                                await self._human_type(page, el, value, session)
                                filled = True
                                all_fields_filled.append(fname)
                                break
                        except Exception:
                            continue
                    if not filled:
                        all_concerns.append(f"Could not find field: {fname}")

                elif tool_name == "select_option":
                    hint = inp.get("selector_hint", "")
                    opt = inp.get("option_text", "")
                    session.emit({"type": "action", "message": f"Selecting: {opt}"})
                    for strategy in [
                        f'select[aria-label*="{hint}" i]',
                        f'select[name*="{hint}" i]',
                        f'label:has-text("{hint}") + select',
                        f'label:has-text("{hint}") ~ select',
                    ]:
                        try:
                            el = page.locator(strategy).first
                            if await el.count() > 0:
                                await el.select_option(label=opt)
                                all_fields_filled.append(hint)
                                await asyncio.sleep(0.3)
                                break
                        except Exception:
                            continue

                elif tool_name == "click_button":
                    btn_text = inp.get("button_text", "")
                    reason = inp.get("reason", btn_text)
                    session.emit({"type": "action", "message": f"Clicking: {reason}"})
                    for strategy in [
                        f'button:has-text("{btn_text}")',
                        f'[aria-label*="{btn_text}" i]',
                        f'label:has-text("{btn_text}")',
                        f'[role="button"]:has-text("{btn_text}")',
                        f'input[value*="{btn_text}" i]',
                    ]:
                        try:
                            el = page.locator(strategy).first
                            if await el.count() > 0:
                                await self._click_element(page, session, el)
                                break
                        except Exception:
                            continue

                elif tool_name == "upload_resume":
                    if resume_path and os.path.exists(resume_path):
                        session.emit({"type": "action", "message": "Uploading resume..."})
                        try:
                            file_inputs = await page.query_selector_all('input[type="file"]')
                            for fi in file_inputs:
                                await fi.set_input_files(resume_path)
                                all_fields_filled.append("Resume")
                                await asyncio.sleep(1)
                                break
                        except Exception:
                            all_concerns.append("Resume upload failed")

                elif tool_name == "form_complete":
                    form_done = True
                    next_action = inp.get("next_action", "done")
                    if inp.get("concerns"):
                        all_concerns.extend(inp["concerns"])
                    break

            if not form_done:
                break

            # Handle navigation between form pages
            if next_action == "click_next":
                session.emit({"type": "action", "message": "Moving to next page..."})
                for sel in ['button:has-text("Next")', 'button:has-text("Continue")', 'button:has-text("Review")']:
                    try:
                        btn = page.locator(sel).first
                        if await btn.count() > 0 and await btn.is_visible():
                            await self._click_element(page, session, btn)
                            await asyncio.sleep(1)
                            break
                    except Exception:
                        continue
            elif next_action == "click_submit" or next_action == "done":
                break

        return {
            'fields_filled': all_fields_filled,
            'concerns': all_concerns,
        }

    # ── Submit application ───────────────────────────────────────────────

    async def _submit_application(self, page, session: HuntSession) -> bool:
        """Click through form steps to final submit."""
        for _ in range(6):
            await asyncio.sleep(0.6)
            for btn_sel in [
                'button:has-text("Submit application")',
                'button:has-text("Submit")',
                'button:has-text("Next")',
                'button[aria-label*="Submit"]',
            ]:
                try:
                    btn = page.locator(btn_sel).first
                    if await btn.count() > 0 and await btn.is_visible():
                        btn_text = (await btn.inner_text()).strip().lower()
                        await self._click_element(page, session, btn)
                        await asyncio.sleep(0.8)
                        if 'submit' in btn_text:
                            return True
                        break
                except Exception:
                    continue

            # Check if modal closed (submission happened)
            try:
                modal = page.locator('[role="dialog"], .artdeco-modal')
                if await modal.count() == 0:
                    return True
            except Exception:
                break
        return False

    # ── Screenshot loop (5fps for smooth streaming) ──────────────────────

    async def _screenshot_loop(self, page, session: HuntSession):
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
            await asyncio.sleep(0.2)  # 5fps for smooth viewing

    # ── Main hunt loop ───────────────────────────────────────────────────

    async def run(self, user: dict, resume: dict, session: HuntSession, db_session_factory):
        try:
            from playwright.async_api import async_playwright
        except ImportError:
            session.emit({"type": "error", "message": "Playwright not installed."})
            return

        session.emit({"type": "status", "message": "Starting autonomous hunt..."})

        async with async_playwright() as pw:
            browser = await pw.chromium.launch(
                headless=True,
                args=[
                    '--no-sandbox', '--disable-dev-shm-usage',
                    '--disable-blink-features=AutomationControlled',
                    '--window-size=1280,900', '--disable-extensions',
                ],
            )
            context = await browser.new_context(
                viewport={"width": 1280, "height": 900},
                user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
                locale="en-US",
                timezone_id="America/New_York",
            )
            await context.add_init_script("""
                Object.defineProperty(navigator, 'webdriver',    { get: () => undefined });
                Object.defineProperty(navigator, 'plugins',      { get: () => [1,2,3,4,5] });
                Object.defineProperty(navigator, 'languages',    { get: () => ['en-US', 'en'] });
                window.chrome = { runtime: {} };
            """)
            page = await context.new_page()
            session.page = page

            screenshot_task = asyncio.create_task(self._screenshot_loop(page, session))
            resume_path = resume.get('file_path', '') if resume else ''

            try:
                # ── Phase 1: Login ────────────────────────────────────────
                logged_in = await self._linkedin_login(page, user, session)
                await session.check_paused()
                if session._stopped:
                    return

                # ── Phase 2: Build board list based on user profile ──────
                boards = ['linkedin']  # always start with LinkedIn
                locs = ' '.join(user.get('target_locations') or []).lower()
                roles_str = ' '.join(user.get('target_roles') or []).lower()
                # Add Indeed for broader search
                boards.append('indeed')
                # Add Google Jobs as a meta-aggregator
                boards.append('google_jobs')
                # Japan-specific boards
                if 'japan' in locs or 'tokyo' in locs:
                    boards.append('tokyodev')

                session.emit({"type": "thinking", "message": f"Planning hunt strategy: searching {len(boards)} job boards for '{', '.join(user.get('target_roles') or ['jobs'])}' in '{', '.join(user.get('target_locations') or ['your area'])}'. Will evaluate each listing against your profile and apply to strong matches."})

                total_evaluated = 0
                total_applied   = 0
                MAX_EVALUATE    = 40
                MAX_APPLY       = 10  # increased from 8

                for board in boards:
                    if session._stopped or total_evaluated >= MAX_EVALUATE or total_applied >= MAX_APPLY:
                        break

                    await session.check_paused()
                    roles     = user.get('target_roles') or []
                    query     = roles[0] if roles else 'Software Engineer'
                    locations = user.get('target_locations') or []
                    location  = locations[0] if locations else user.get('location') or 'Remote'
                    import urllib.parse
                    q   = urllib.parse.quote_plus(query)
                    loc = urllib.parse.quote_plus(location)

                    if board == 'linkedin':
                        if logged_in:
                            url = f"https://www.linkedin.com/jobs/search/?keywords={q}&location={loc}&f_TPR=r604800&f_LF=f_AL&sortBy=DD"
                        else:
                            url = f"https://www.linkedin.com/jobs/search?keywords={q}&location={loc}&trk=public_jobs_jobs-search-bar_search-submit&position=1&pageNum=0"
                    elif board == 'indeed':
                        url = f"https://www.indeed.com/jobs?q={q}&l={loc}&sort=date&fromage=7"
                    elif board == 'google_jobs':
                        url = f"https://www.google.com/search?q={q}+jobs+{loc}&ibp=htl;jobs"
                    elif board == 'tokyodev':
                        url = f"https://www.tokyodev.com/jobs?q={q}"
                    else:
                        url = f"https://www.google.com/search?q={q}+jobs+{loc}&ibp=htl;jobs"

                    board_display = {'linkedin': 'LinkedIn', 'indeed': 'Indeed', 'google_jobs': 'Google Jobs', 'tokyodev': 'TokyoDev'}.get(board, board.title())
                    session.emit({"type": "action", "message": f"Opening {board_display} — searching for '{query}' in '{location}'"})
                    try:
                        await page.goto(url, wait_until="domcontentloaded", timeout=20000)
                        await asyncio.sleep(2)
                    except Exception as e:
                        session.emit({"type": "action", "message": f"Navigation failed: {str(e)[:60]}"})
                        continue

                    # Smooth scroll to load more jobs (visible to user)
                    session.emit({"type": "action", "message": f"Scrolling through {board_display} results..."})
                    await self._smooth_scroll(page, 2400, steps=8)
                    await asyncio.sleep(1)
                    await page.evaluate("window.scrollTo({ top: 0, behavior: 'smooth' })")
                    await asyncio.sleep(0.8)

                    # Extract jobs from the page
                    raw_jobs = await self._extract_jobs_from_page(page, board)
                    new_jobs = [j for j in raw_jobs if j.get('url') and j['url'] not in session.seen_urls]

                    if not new_jobs:
                        session.emit({"type": "thinking", "message": f"No new listings found on {board_display} — all {len(raw_jobs)} jobs already seen this session. Moving to next board."})
                        continue

                    session.emit({"type": "thinking", "message": f"Found {len(new_jobs)} new listings on {board_display}. Analyzing each one against your profile — looking for roles matching {', '.join(user.get('target_roles') or ['your targets'])} with the right skills and location fit."})

                    # ── Phase 3: Score jobs with Haiku ───────────────────
                    BATCH = 10
                    for i in range(0, len(new_jobs), BATCH):
                        if session._stopped:
                            break
                        batch = new_jobs[i:i+BATCH]
                        session.emit({"type": "action", "message": f"Evaluating batch {i//BATCH + 1}: {len(batch)} jobs..."})
                        await self._batch_score_jobs(batch, user)

                    new_jobs.sort(key=lambda j: j.get('score', 0), reverse=True)

                    # Show decisions with reasoning
                    apply_count = 0
                    skip_count = 0
                    for job in new_jobs:
                        score    = job.get('score', 0)
                        decision = 'apply' if score >= 70 else 'skip'
                        url      = job.get('url', '')
                        if url:
                            session.seen_urls.add(url)
                            _persist_seen_url(session, url, db_session_factory)
                        if decision == 'apply':
                            session.jobs_found += 1
                            apply_count += 1
                        else:
                            skip_count += 1
                        session.emit({
                            "type":       "job_decision",
                            "decision":   decision,
                            "title":      job.get('title', ''),
                            "company":    job.get('company', ''),
                            "location":   job.get('location', ''),
                            "url":        url,
                            "match_score": score,
                            "reason":     job.get('reason', ''),
                        })
                        total_evaluated += 1

                    # Build a rich reasoning summary like a recruiter would
                    user_name = (user.get('full_name') or '').split()[0] or 'you'
                    yrs = user.get('years_experience') or 'N/A'
                    lines = []
                    for j in new_jobs[:8]:  # show top 8
                        s = j.get('score', 0)
                        t = j.get('title', '?')
                        c = j.get('company', '?')
                        r = j.get('reason', '')
                        tag = '🟢 HIGH MATCH' if s >= 80 else '🟡 MODERATE' if s >= 70 else '⚪ LOW'
                        lines.append(f"• **{c} — {t}** ({s}%) {tag}. {r}")

                    reasoning = f"Here's what I found for {user_name} on {board_display}:\n\n" + "\n".join(lines)
                    if apply_count > 0:
                        reasoning += f"\n\n→ {apply_count} strong matches — applying now. {user_name} has {yrs} years of experience so I'll prioritize roles that fit that level."
                    else:
                        reasoning += f"\n\n→ No jobs above 70% match threshold on this board. Moving to next source."
                    session.emit({"type": "thinking", "message": reasoning})

                    # ── Phase 4: Apply to qualifying jobs ────────────────
                    apply_jobs = [j for j in new_jobs if j.get('score', 0) >= 70]
                    if apply_jobs:
                        session.emit({"type": "status", "message": f"Applying to {len(apply_jobs)} matched jobs..."})

                    for job in apply_jobs:
                        if session._stopped or total_applied >= MAX_APPLY:
                            break
                        await session.check_paused()

                        job_title = job.get('title', 'Unknown')
                        company   = job.get('company', 'Unknown')
                        job_url   = job.get('url', '')
                        if not job_url:
                            continue

                        # Navigate to job page (user sees the listing)
                        score = job.get('score', 0)
                        reason = job.get('reason', '')
                        session.emit({"type": "thinking", "message": f"Opening {job_title} at {company} (score: {score}%). {reason}"})
                        try:
                            await page.goto(job_url, wait_until="domcontentloaded", timeout=15000)
                            await asyncio.sleep(2)
                        except Exception as e:
                            session.emit({"type": "action", "message": f"Could not open job page — {str(e)[:50]}"})
                            continue

                        # Scroll to read the listing (visible to user)
                        session.emit({"type": "action", "message": f"Reading job description..."})
                        await self._smooth_scroll(page, 400, steps=3)
                        await asyncio.sleep(0.8)
                        await page.evaluate("window.scrollTo(0, 0)")
                        await asyncio.sleep(0.5)

                        # Find and click Apply — try multiple strategies
                        apply_clicked = False
                        # Strategy 1: Easy Apply / direct Apply button
                        for sel in [
                            'button:has-text("Easy Apply")',
                            'button:has-text("Apply now")',
                            'button:has-text("Apply")',
                            '.jobs-apply-button',
                            '[aria-label*="Easy Apply"]',
                            '[aria-label*="Apply"]',
                            'a:has-text("Apply now")',
                            'a:has-text("Apply on company")',
                            'a:has-text("Apply")',
                        ]:
                            try:
                                el = page.locator(sel).first
                                if await el.count() > 0 and await el.is_visible():
                                    session.emit({"type": "action", "message": f"Clicking apply button..."})
                                    await self._click_element(page, session, el)
                                    await asyncio.sleep(1.5)
                                    apply_clicked = True
                                    break
                            except Exception:
                                continue

                        # Strategy 2: If no button, look for external application links
                        if not apply_clicked:
                            session.emit({"type": "thinking", "message": f"No direct apply button found. Looking for external application link..."})
                            for sel in [
                                'a[href*="greenhouse"]', 'a[href*="lever.co"]',
                                'a[href*="workday"]', 'a[href*="jobs.ashby"]',
                                'a[href*="careers"]', 'a[href*="apply"]',
                                'a[href*="icims"]', 'a[href*="taleo"]',
                            ]:
                                try:
                                    el = page.locator(sel).first
                                    if await el.count() > 0:
                                        ext_url = await el.get_attribute('href')
                                        if ext_url:
                                            session.emit({"type": "action", "message": f"Found external application link — navigating..."})
                                            await page.goto(ext_url, wait_until="domcontentloaded", timeout=15000)
                                            await asyncio.sleep(2)
                                            apply_clicked = True
                                            break
                                except Exception:
                                    continue

                        if not apply_clicked:
                            session.emit({"type": "thinking", "message": f"No application method found for {job_title} at {company}. This might be a listing-only page. Moving to next job."})
                            continue

                        session.emit({"type": "action", "message": "Application form opened — AI is analyzing the fields..."})

                        # ── Opus fills the form (human-like, visible) ────
                        session.emit({"type": "thinking", "message": f"Filling application for {job_title}. Using your resume, skills ({', '.join((user.get('skills') or [])[:4])}), and pre-written answers to complete each field."})
                        fill_result = await self._opus_fill_form(
                            page, user, resume_path, session, job_title, company
                        )
                        filled   = fill_result.get('fields_filled', [])
                        concerns = fill_result.get('concerns', [])

                        if filled:
                            session.emit({"type": "thinking", "message": f"Form filled successfully — completed {len(filled)} fields: {', '.join(filled[:6])}{'...' if len(filled) > 6 else ''}. {'⚠️ Concerns: ' + ', '.join(concerns) if concerns else 'Everything looks good.'}"})

                        # ── Confirm or auto-apply ────────────────────────
                        if session.auto_apply:
                            session.emit({"type": "thinking", "message": f"Auto-apply is enabled — submitting application to {company} now."})
                        else:
                            session.emit({
                                "type":          "confirm_required",
                                "job_title":     job_title,
                                "company":       company,
                                "summary":       f"Application ready for {job_title} at {company}",
                                "fields_filled": filled,
                                "concerns":      concerns,
                            })
                            decision = await session.wait_for_confirmation()
                            if decision == 'skip':
                                session.emit({"type": "action", "message": "Skipped"})
                                continue
                            elif decision == 'stop':
                                session._stopped = True
                                break

                        # ── Submit ───────────────────────────────────────
                        submitted = await self._submit_application(page, session)

                        if submitted:
                            session.jobs_applied += 1
                            total_applied        += 1
                            session.emit({
                                "type":        "submitted",
                                "message":     f"✓ Applied to {job_title} at {company}!",
                                "jobs_applied": session.jobs_applied,
                            })
                            _persist_stats(session, db_session_factory)
                        else:
                            session.emit({"type": "action", "message": f"Could not complete submission for {job_title}"})

                        await asyncio.sleep(1)

                # ── Wrap up ──────────────────────────────────────────────
                if not session._stopped:
                    boards_searched = len([b for b in boards if not session._stopped])
                    summary = f"Hunt complete! Searched {boards_searched} job boards, evaluated {total_evaluated} listings, and submitted {session.jobs_applied} applications."
                    if session.jobs_applied > 0:
                        summary += f" Your applications are in — check your Applications page for status updates."
                    elif total_evaluated > 0:
                        summary += f" No strong matches met the 70% threshold this time. Try adjusting your target roles or locations for better results."
                    else:
                        summary += f" Could not extract listings from the boards searched. This can happen with guest access — try adding LinkedIn credentials for better results."
                    session.emit({
                        "type":        "complete",
                        "message":     summary,
                        "jobs_found":  session.jobs_found,
                        "jobs_applied": session.jobs_applied,
                    })
                    _finalize_db(session, db_session_factory, "complete")

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


# ─── DB helpers ─────────────────────────────────────────────────────────────

def _persist_seen_url(session: HuntSession, url: str, factory):
    try:
        db = factory()
        from app import models as m
        hs = db.query(m.HuntSession).filter(m.HuntSession.id == session.hunt_id).first()
        if hs:
            existing = list(hs.seen_job_urls or [])
            if url not in existing:
                existing.append(url)
                hs.seen_job_urls = existing
                db.commit()
        db.close()
    except Exception:
        pass


def _persist_stats(session: HuntSession, factory):
    try:
        db = factory()
        from app import models as m
        hs = db.query(m.HuntSession).filter(m.HuntSession.id == session.hunt_id).first()
        if hs:
            hs.jobs_found   = session.jobs_found
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
            hs.status       = status
            hs.jobs_found   = session.jobs_found
            hs.jobs_applied = session.jobs_applied
            hs.stopped_at   = func.now()
            db.commit()
        db.close()
    except Exception:
        pass


# Alias for backward compatibility with router
AutonomousHuntAgent = HybridHuntAgent

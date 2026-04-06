"""
Hybrid Hunt Agent — Scripted Playwright + Selective Claude API calls.

Architecture:
  - Scripted Playwright handles 95% of work: navigation, clicks, form filling
    from known user data. Zero AI cost for these.
  - Claude Haiku 4.5 (cheap) for batch job evaluation and unknown form fields.
  - Claude Opus 4.6 (expensive) only if user explicitly needs deep reasoning.
  - Prompt caching on user profile → reused across all evaluations in a session.

Cost estimate:
  Old: Claude Opus for every action → $3-5 per 10-min session
  New: Haiku batch eval + scripted fill → $0.10-0.30 per 10-min session
  = ~15-30 applications per $1 of API spend
"""
import asyncio
import base64
import json
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


# ─── Hybrid Agent ───────────────────────────────────────────────────────────

class HybridHuntAgent:
    """
    Scripted Playwright + Haiku for evaluation.
    Opus is NOT used during hunts — it's overkill for browsing.
    """

    def __init__(self):
        self.client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)

    # ── Cached user profile string (reused across all Haiku calls) ────────
    def _profile_text(self, user: dict) -> str:
        roles     = ', '.join(user.get('target_roles') or []) or 'relevant tech roles'
        locations = ', '.join(user.get('target_locations') or []) or user.get('location') or 'Remote'
        skills    = ', '.join(user.get('skills') or []) or 'not specified'
        salary    = ''
        if user.get('salary_min') or user.get('salary_max'):
            salary = f"${user.get('salary_min',0):,} – ${user.get('salary_max',0):,}"
        return f"""
Name: {user.get('full_name','')}
Email: {user.get('email','')}
Phone: {user.get('phone') or 'N/A'}
Location: {user.get('location') or 'N/A'}
LinkedIn: {user.get('linkedin_url') or ''}
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
""".strip()

    # ── Batch job evaluation (Haiku, 1 call per 10 jobs) ──────────────────
    async def _batch_score_jobs(self, jobs: list[dict], user: dict) -> list[dict]:
        """
        Score up to 10 jobs at once using Haiku.
        Returns list of jobs with 'score' (0-100) and 'reason' added.
        Uses prompt caching on the user profile.
        """
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
                system=[
                    {
                        "type": "text",
                        "text": "You are a job matching assistant. Score each job 0-100 for fit. Reply ONLY with JSON array: [{\"index\":1,\"score\":85,\"reason\":\"brief reason\"},...]",
                        "cache_control": {"type": "ephemeral"},
                    }
                ],
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "text",
                                "text": f"Candidate profile:\n{self._profile_text(user)}",
                                "cache_control": {"type": "ephemeral"},
                            },
                            {
                                "type": "text",
                                "text": f"Score these jobs:\n{job_list}",
                            }
                        ]
                    }
                ],
                extra_headers={"anthropic-beta": "prompt-caching-2024-07-31"},
            )
            text = resp.content[0].text.strip()
            # Parse JSON robustly
            match = re.search(r'\[.*\]', text, re.DOTALL)
            if match:
                scores = json.loads(match.group())
                for item in scores:
                    idx = item.get('index', 0) - 1
                    if 0 <= idx < len(jobs):
                        jobs[idx]['score']  = item.get('score', 0)
                        jobs[idx]['reason'] = item.get('reason', '')
        except Exception as e:
            # Fallback: score everything as 75 so we don't block
            for j in jobs:
                j.setdefault('score', 75)
                j.setdefault('reason', 'Could not evaluate')

        return jobs

    # ── Answer unknown form field (Haiku, ~50 tokens) ────────────────────
    async def _answer_field(self, question: str, context: str, user: dict) -> str:
        """Ask Haiku for the best answer to an unfamiliar form field."""
        try:
            resp = await self.client.messages.create(
                model="claude-haiku-4-5-20251001",
                max_tokens=200,
                system=[{
                    "type": "text",
                    "text": "Answer job application form fields concisely using the candidate profile. Be honest — never fabricate. Output ONLY the answer text, nothing else.",
                    "cache_control": {"type": "ephemeral"},
                }],
                messages=[{
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": f"Candidate:\n{self._profile_text(user)}",
                            "cache_control": {"type": "ephemeral"},
                        },
                        {
                            "type": "text",
                            "text": f"Form field: {question}\nContext: {context}\nAnswer:",
                        }
                    ]
                }],
                extra_headers={"anthropic-beta": "prompt-caching-2024-07-31"},
            )
            return resp.content[0].text.strip()
        except Exception:
            return ""

    # ── Scripted LinkedIn login ────────────────────────────────────────────
    async def _linkedin_login(self, page, user: dict, session: HuntSession) -> bool:
        email    = user.get('linkedin_email')
        password = user.get('linkedin_password')
        if not email or not password:
            session.emit({"type": "status", "message": "No LinkedIn credentials — searching as guest"})
            return False

        session.emit({"type": "action", "message": "Logging in to LinkedIn..."})
        try:
            await page.goto("https://www.linkedin.com/login", wait_until="domcontentloaded", timeout=20000)
            await asyncio.sleep(1)
            await page.fill('input[name="session_key"]', email)
            await page.fill('input[name="session_password"]', password)
            await page.click('button[type="submit"]')
            await asyncio.sleep(3)
            # Check if we're logged in
            if "feed" in page.url or "checkpoint" in page.url or "home" in page.url:
                session.emit({"type": "action", "message": "✓ LinkedIn login successful"})
                return True
            else:
                session.emit({"type": "action", "message": "⚠ LinkedIn login may have failed — continuing as guest"})
                return False
        except Exception as e:
            session.emit({"type": "action", "message": f"LinkedIn login error: {str(e)[:60]}"})
            return False

    # ── Extract job listings from current page (scripted DOM) ─────────────
    async def _extract_jobs_from_page(self, page, board: str) -> list[dict]:
        """Extract job listings using Playwright DOM queries — zero AI cost."""
        jobs = []
        try:
            if board == "linkedin":
                # LinkedIn job cards
                cards = await page.query_selector_all('.job-card-container, .jobs-search-results__list-item, [data-job-id]')
                for card in cards[:20]:
                    try:
                        title   = await card.query_selector('.job-card-list__title, .base-search-card__title, h3')
                        company = await card.query_selector('.job-card-container__company-name, .base-search-card__subtitle, h4')
                        loc     = await card.query_selector('.job-card-container__metadata-item, .job-search-card__location')
                        link    = await card.query_selector('a[href*="/jobs/view/"], a[href*="jobs/view"]')

                        title_text   = (await title.inner_text()).strip()   if title   else ''
                        company_text = (await company.inner_text()).strip() if company else ''
                        loc_text     = (await loc.inner_text()).strip()     if loc     else ''
                        url          = await link.get_attribute('href')     if link    else ''

                        if title_text and url:
                            # Normalize URL
                            if url.startswith('/'):
                                url = 'https://www.linkedin.com' + url
                            url = url.split('?')[0]
                            jobs.append({'title': title_text, 'company': company_text, 'location': loc_text, 'url': url, 'snippet': '', 'board': 'linkedin'})
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

        # Fallback: read page text and parse with a quick regex
        if not jobs:
            try:
                text = await page.inner_text("body")
                # Extract job-like patterns from text
                lines = [l.strip() for l in text.split('\n') if len(l.strip()) > 10 and len(l.strip()) < 100]
                url = page.url
                for i, line in enumerate(lines[:30]):
                    if any(k in line.lower() for k in ['engineer', 'developer', 'designer', 'manager', 'analyst', 'scientist', 'intern']):
                        jobs.append({'title': line, 'company': '', 'location': '', 'url': url + f'#job-{i}', 'snippet': '', 'board': board})
            except Exception:
                pass

        return jobs

    # ── Scripted Easy Apply on LinkedIn ───────────────────────────────────
    async def _do_linkedin_easy_apply(self, page, user: dict, resume_path: str, session: HuntSession) -> dict:
        """
        Fill LinkedIn Easy Apply form using user data.
        Only calls AI for unknown text fields (rare, ~1-2 per application).
        Returns: {'success': bool, 'fields_filled': [...], 'concerns': [...]}
        """
        fields_filled = []
        concerns      = []

        async def fill_if_found(selectors: list, value: str, label: str):
            if not value:
                return False
            for sel in selectors:
                try:
                    el = page.locator(sel).first
                    if await el.count() > 0 and await el.is_visible():
                        await el.fill(str(value))
                        fields_filled.append(label)
                        return True
                except Exception:
                    continue
            return False

        # Known fields: fill from user data, no AI needed
        await fill_if_found(['input[id*="firstName"], input[name*="firstName"]', 'input[placeholder*="first" i]'], (user.get('full_name') or '').split()[0], 'First name')
        await fill_if_found(['input[id*="lastName"], input[name*="lastName"]', 'input[placeholder*="last" i]'], ' '.join((user.get('full_name') or '').split()[1:]) or '', 'Last name')
        await fill_if_found(['input[id*="email"], input[type="email"]'], user.get('email', ''), 'Email')
        await fill_if_found(['input[id*="phone"], input[type="tel"]'], user.get('phone', ''), 'Phone')
        await fill_if_found(['input[id*="city"], input[placeholder*="city" i], input[id*="location"]'], user.get('location', ''), 'Location')
        await fill_if_found(['input[id*="linkedin"], input[placeholder*="linkedin" i]'], user.get('linkedin_url', ''), 'LinkedIn')
        await fill_if_found(['input[id*="github"], input[placeholder*="github" i]'], user.get('github_url', ''), 'GitHub')
        await fill_if_found(['input[id*="portfolio"], input[placeholder*="portfolio" i], input[id*="website" i]'], user.get('portfolio_url', ''), 'Portfolio')
        await fill_if_found(['input[id*="years"], input[placeholder*="years" i]'], str(user.get('years_experience') or ''), 'Years experience')

        # Resume upload
        if resume_path:
            import os
            if os.path.exists(resume_path):
                try:
                    file_inputs = await page.query_selector_all('input[type="file"]')
                    for fi in file_inputs:
                        if await fi.is_visible() or True:
                            await fi.set_input_files(resume_path)
                            await asyncio.sleep(1)
                            fields_filled.append('Resume')
                            break
                except Exception as e:
                    concerns.append(f'Resume upload failed: {str(e)[:50]}')

        # Handle unknown text inputs via Haiku (only the ones we couldn't auto-fill)
        try:
            unknown_inputs = await page.query_selector_all('input[type="text"]:not([value]), textarea')
            page_text = await page.inner_text("body")
            for inp in unknown_inputs[:5]:  # limit to 5 unknown fields
                try:
                    label_text = ''
                    # Try to find the label for this input
                    inp_id = await inp.get_attribute('id') or ''
                    if inp_id:
                        label_el = page.locator(f'label[for="{inp_id}"]')
                        if await label_el.count() > 0:
                            label_text = (await label_el.inner_text()).strip()
                    if not label_text:
                        aria = await inp.get_attribute('aria-label') or await inp.get_attribute('placeholder') or ''
                        label_text = aria.strip()
                    if not label_text or len(label_text) < 3:
                        continue
                    # Skip known fields we already handled
                    skip_words = ['first', 'last', 'email', 'phone', 'city', 'location', 'linkedin', 'github', 'years', 'portfolio']
                    if any(w in label_text.lower() for w in skip_words):
                        continue
                    # Ask Haiku
                    answer = await self._answer_field(label_text, page_text[:1000], user)
                    if answer:
                        await inp.fill(answer)
                        fields_filled.append(label_text)
                except Exception:
                    continue
        except Exception:
            pass

        # Handle dropdowns and radio buttons for common questions
        try:
            selects = await page.query_selector_all('select')
            for sel in selects[:5]:
                try:
                    aria = await sel.get_attribute('aria-label') or ''
                    options = await sel.query_selector_all('option')
                    option_texts = [await o.inner_text() for o in options]

                    if 'experience' in aria.lower() or 'years' in aria.lower():
                        yrs = str(user.get('years_experience') or '0')
                        # Find closest option
                        for opt_text in option_texts:
                            if yrs in opt_text:
                                await sel.select_option(label=opt_text)
                                break
                    elif 'authorized' in aria.lower() or 'work auth' in aria.lower() or 'legally' in aria.lower():
                        await sel.select_option(label='Yes') if 'Yes' in option_texts else None
                    elif 'remote' in aria.lower():
                        pref = user.get('remote_preference', 'any')
                        if 'yes' in option_texts and 'remote' in pref:
                            await sel.select_option(label='Yes')
                except Exception:
                    continue
        except Exception:
            pass

        return {'success': True, 'fields_filled': fields_filled, 'concerns': concerns}

    # ── Screenshot loop ────────────────────────────────────────────────────
    async def _screenshot_loop(self, page, session: HuntSession):
        while not session._stopped:
            try:
                png  = await page.screenshot(full_page=False)
                b64  = base64.b64encode(png).decode()
                meta = {}
                if session.cursor_x is not None:
                    meta = {"cx": session.cursor_x, "cy": session.cursor_y}
                session.emit({"type": "screenshot", "data": b64, **meta})
            except Exception:
                pass
            await asyncio.sleep(0.35)

    # ── Click helper with cursor tracking ─────────────────────────────────
    async def _click(self, page, session: HuntSession, element):
        try:
            box = await element.bounding_box()
            if box:
                cx = int(box['x'] + box['width'] / 2)
                cy = int(box['y'] + box['height'] / 2)
                session.cursor_x = cx
                session.cursor_y = cy
                await page.mouse.move(cx, cy)
        except Exception:
            pass
        await element.click()
        await asyncio.sleep(0.5)

    # ── Main run loop ──────────────────────────────────────────────────────
    async def run(self, user: dict, resume: dict, session: HuntSession, db_session_factory):
        try:
            from playwright.async_api import async_playwright
        except ImportError:
            session.emit({"type": "error", "message": "Playwright not installed."})
            return

        session.emit({"type": "status", "message": "Initializing autonomous hunt..."})

        async with async_playwright() as pw:
            browser = await pw.chromium.launch(
                headless=True,
                args=[
                    '--no-sandbox', '--disable-dev-shm-usage',
                    '--disable-blink-features=AutomationControlled',
                    '--window-size=1280,900', '--disable-extensions',
                ]
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
            session.page = page   # expose for interactive control when paused

            screenshot_task = asyncio.create_task(self._screenshot_loop(page, session))
            resume_path = resume.get('file_path', '') if resume else ''

            try:
                # ── Phase 1: Login ────────────────────────────────────────
                logged_in = await self._linkedin_login(page, user, session)
                await session.check_paused()
                if session._stopped: return

                # ── Phase 2: Board loop ───────────────────────────────────
                boards = []
                if logged_in or user.get('target_locations'):
                    boards.append('linkedin')
                # Add Japan boards if targeting Japan
                locs = ' '.join(user.get('target_locations') or []).lower()
                if 'japan' in locs or 'tokyo' in locs:
                    boards.extend(['tokyodev'])
                if not boards:
                    boards = ['linkedin']

                total_evaluated = 0
                total_applied   = 0
                MAX_EVALUATE    = 40  # stop after evaluating 40 jobs
                MAX_APPLY       = 8   # stop after 8 applications per session

                for board in boards:
                    if session._stopped or total_evaluated >= MAX_EVALUATE or total_applied >= MAX_APPLY:
                        break

                    # Navigate to board
                    await session.check_paused()
                    roles     = user.get('target_roles') or []
                    query     = roles[0] if roles else 'Software Engineer'
                    locations = user.get('target_locations') or []
                    location  = locations[0] if locations else user.get('location') or 'Remote'
                    import urllib.parse
                    q   = urllib.parse.quote_plus(query)
                    loc = urllib.parse.quote_plus(location)

                    if board == 'linkedin':
                        url = f"https://www.linkedin.com/jobs/search/?keywords={q}&location={loc}&f_TPR=r604800&sortBy=DD"
                        if logged_in:
                            url = f"https://www.linkedin.com/jobs/search/?keywords={q}&location={loc}&f_TPR=r604800&f_LF=f_AL&sortBy=DD"  # Easy Apply filter
                    elif board == 'tokyodev':
                        url = f"https://www.tokyodev.com/jobs?q={q}"
                    else:
                        url = f"https://www.linkedin.com/jobs/search/?keywords={q}&sortBy=DD"

                    session.emit({"type": "action", "message": f"Searching {board.title()} for '{query}' in '{location}'"})
                    try:
                        await page.goto(url, wait_until="domcontentloaded", timeout=20000)
                        await asyncio.sleep(2)
                    except Exception as e:
                        session.emit({"type": "action", "message": f"Navigation failed: {str(e)[:60]}"})
                        continue

                    # Scroll to load more jobs
                    for _ in range(3):
                        await page.evaluate("window.scrollBy(0, 600)")
                        await asyncio.sleep(0.5)

                    # Extract jobs from page (scripted DOM, zero AI)
                    raw_jobs = await self._extract_jobs_from_page(page, board)
                    session.emit({"type": "action", "message": f"Found {len(raw_jobs)} listings on {board.title()}"})

                    # Filter out already-seen URLs
                    new_jobs = [j for j in raw_jobs if j.get('url') and j['url'] not in session.seen_urls]

                    if not new_jobs:
                        session.emit({"type": "action", "message": "All listings already seen — skipping"})
                        continue

                    # ── Phase 3: Batch score with Haiku ──────────────────
                    session.emit({"type": "thinking", "message": f"Evaluating {len(new_jobs)} jobs with AI..."})
                    BATCH = 10
                    for i in range(0, len(new_jobs), BATCH):
                        if session._stopped: break
                        batch = new_jobs[i:i+BATCH]
                        await self._batch_score_jobs(batch, user)

                    # Sort by score descending
                    new_jobs.sort(key=lambda j: j.get('score', 0), reverse=True)

                    # Emit decisions
                    for job in new_jobs:
                        score    = job.get('score', 0)
                        decision = 'apply' if score >= 70 else 'skip'
                        url      = job.get('url', '')
                        if url:
                            session.seen_urls.add(url)
                            _persist_seen_url(session, url, db_session_factory)
                        if decision == 'apply':
                            session.jobs_found += 1
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

                    # ── Phase 4: Apply to matches ──────────────────────────
                    apply_jobs = [j for j in new_jobs if j.get('score', 0) >= 70]
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

                        session.emit({"type": "action", "message": f"Opening: {job_title} at {company}"})
                        try:
                            await page.goto(job_url, wait_until="domcontentloaded", timeout=15000)
                            await asyncio.sleep(1.5)
                        except Exception as e:
                            session.emit({"type": "action", "message": f"Could not open job: {str(e)[:50]}"})
                            continue

                        # Find and click Easy Apply
                        easy_apply_clicked = False
                        for sel in [
                            'button:has-text("Easy Apply")',
                            'button:has-text("Apply")',
                            '.jobs-apply-button',
                            '[aria-label*="Easy Apply"]',
                        ]:
                            try:
                                el = page.locator(sel).first
                                if await el.count() > 0 and await el.is_visible():
                                    await self._click(page, session, el)
                                    await asyncio.sleep(1.5)
                                    easy_apply_clicked = True
                                    session.emit({"type": "action", "message": "Opened application form"})
                                    break
                            except Exception:
                                continue

                        if not easy_apply_clicked:
                            session.emit({"type": "action", "message": f"No apply button found for {job_title} — skipping"})
                            continue

                        # Fill the form
                        session.emit({"type": "action", "message": "Filling application form..."})
                        fill_result = await self._do_linkedin_easy_apply(page, user, resume_path, session)
                        filled = fill_result.get('fields_filled', [])
                        concerns = fill_result.get('concerns', [])

                        if filled:
                            session.emit({"type": "action", "message": f"Filled: {', '.join(filled[:5])}"})

                        # Confirm or auto-apply
                        if session.auto_apply:
                            session.emit({"type": "action", "message": f"⚡ Auto-apply: submitting {job_title}..."})
                        else:
                            # Show confirmation
                            session.emit({
                                "type":         "confirm_required",
                                "job_title":    job_title,
                                "company":      company,
                                "summary":      f"Application ready for {job_title} at {company}",
                                "fields_filled": filled,
                                "concerns":     concerns,
                            })
                            decision = await session.wait_for_confirmation()
                            if decision == 'skip':
                                session.emit({"type": "action", "message": "Skipped"})
                                continue
                            elif decision == 'stop':
                                session.emit({"type": "action", "message": "Hunt stopped"})
                                session._stopped = True
                                break

                        # Submit: click through form steps then final submit
                        submitted = False
                        for _ in range(8):  # up to 8 form pages
                            await asyncio.sleep(0.8)
                            # Look for Next or Submit button
                            for btn_sel in ['button:has-text("Submit application")', 'button:has-text("Submit")', 'button:has-text("Next")', 'button[aria-label*="Submit"]']:
                                try:
                                    btn = page.locator(btn_sel).first
                                    if await btn.count() > 0 and await btn.is_visible():
                                        btn_text = (await btn.inner_text()).strip().lower()
                                        await self._click(page, session, btn)
                                        await asyncio.sleep(1)
                                        if 'submit' in btn_text:
                                            submitted = True
                                        break
                                except Exception:
                                    continue
                            if submitted:
                                break
                            # Check if modal closed (application submitted)
                            try:
                                modal = page.locator('[role="dialog"], .artdeco-modal')
                                if await modal.count() == 0:
                                    submitted = True
                                    break
                            except Exception:
                                break

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

                # ── Wrap up ───────────────────────────────────────────────
                if not session._stopped:
                    session.emit({
                        "type":        "complete",
                        "message":     f"Hunt complete! Evaluated {total_evaluated} jobs, applied to {session.jobs_applied}.",
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

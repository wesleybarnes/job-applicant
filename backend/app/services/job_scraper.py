"""Job search service — fetches REAL listings from external APIs.

Sources, in priority order:
  1. JSearch (RapidAPI) — only if JSEARCH_API_KEY is set; best location coverage.
  2. Remotive — free, no key, real remote-job listings with working apply URLs.
  3. Arbeitnow — free, no key, general job board (incl. international) with real URLs.

No mock/demo data: if every source fails we return [] so the UI shows an honest
"no jobs found" state instead of dead example.com links.
"""
import os
import httpx
from typing import Optional
from datetime import datetime, timezone

_TIMEOUT = 12.0
_MAX_RESULTS = 40


async def search_jobs_api(
    query: Optional[str],
    location: Optional[str],
    remote: Optional[bool] = None,
) -> list[dict]:
    """Return a list of real job dicts ready to persist. Never raises."""
    q = (query or "software engineer").strip()
    results: list[dict] = []

    # 1. JSearch first if configured (covers onsite + location filtering well)
    if os.getenv("JSEARCH_API_KEY"):
        results += await _safe(_search_jsearch(q, location, remote))

    # 2 + 3. Free, no-key sources — always queried so the app works out of the box
    if len(results) < _MAX_RESULTS:
        results += await _safe(_search_remotive(q))
    if len(results) < _MAX_RESULTS:
        results += await _safe(_search_arbeitnow(q))

    # Dedup on (source, external_id) then cap
    seen, deduped = set(), []
    for job in results:
        key = (job.get("source"), job.get("external_id"))
        if key in seen:
            continue
        seen.add(key)
        deduped.append(job)
    return deduped[:_MAX_RESULTS]


async def _safe(coro) -> list[dict]:
    """Await a source coroutine, swallowing any failure into an empty list."""
    try:
        return await coro
    except Exception:
        return []


async def _search_jsearch(query: str, location: Optional[str], remote: Optional[bool]) -> list[dict]:
    api_key = os.getenv("JSEARCH_API_KEY", "")
    if not api_key:
        return []
    search_query = f"{query} remote" if remote else query
    async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
        resp = await client.get(
            "https://jsearch.p.rapidapi.com/search",
            headers={"X-RapidAPI-Key": api_key, "X-RapidAPI-Host": "jsearch.p.rapidapi.com"},
            params={"query": f"{search_query} in {location or 'United States'}", "page": "1", "num_pages": "1"},
        )
        resp.raise_for_status()
        data = resp.json()
    jobs = []
    for item in data.get("data", []):
        url = item.get("job_apply_link") or item.get("job_google_link")
        if not url:
            continue
        jobs.append({
            "title": item.get("job_title", ""),
            "company": item.get("employer_name", ""),
            "location": ", ".join(p for p in [item.get("job_city"), item.get("job_state"), item.get("job_country")] if p),
            "remote_type": "remote" if item.get("job_is_remote") else "onsite",
            "description": (item.get("job_description") or "")[:3000],
            "url": url,
            "source": "jsearch",
            "external_id": item.get("job_id", url),
            "posted_date": datetime.now(timezone.utc),
            "salary_min": item.get("job_min_salary"),
            "salary_max": item.get("job_max_salary"),
        })
    return jobs


async def _search_remotive(query: str) -> list[dict]:
    async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
        resp = await client.get(
            "https://remotive.com/api/remote-jobs",
            params={"search": query, "limit": 30},
        )
        resp.raise_for_status()
        data = resp.json()
    jobs = []
    for item in data.get("jobs", []):
        url = item.get("url")
        if not url:
            continue
        jobs.append({
            "title": item.get("title", ""),
            "company": item.get("company_name", ""),
            "location": item.get("candidate_required_location") or "Remote",
            "job_type": (item.get("job_type") or "").replace("_", "-") or None,
            "remote_type": "remote",
            "description": _strip_html(item.get("description", ""))[:3000],
            "url": url,
            "source": "remotive",
            "external_id": str(item.get("id", url)),
            "posted_date": datetime.now(timezone.utc),
        })
    return jobs


async def _search_arbeitnow(query: str) -> list[dict]:
    async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
        resp = await client.get("https://www.arbeitnow.com/api/job-board-api")
        resp.raise_for_status()
        data = resp.json()
    terms = [t for t in query.lower().split() if len(t) > 2]
    jobs = []
    for item in data.get("data", []):
        url = item.get("url")
        if not url:
            continue
        haystack = f"{item.get('title','')} {' '.join(item.get('tags') or [])}".lower()
        # Arbeitnow has no search param — keep only entries matching the query terms
        if terms and not any(t in haystack for t in terms):
            continue
        jobs.append({
            "title": item.get("title", ""),
            "company": item.get("company_name", ""),
            "location": item.get("location") or ("Remote" if item.get("remote") else ""),
            "job_type": (item.get("job_types") or [None])[0],
            "remote_type": "remote" if item.get("remote") else "onsite",
            "description": _strip_html(item.get("description", ""))[:3000],
            "url": url,
            "source": "arbeitnow",
            "external_id": item.get("slug", url),
            "posted_date": datetime.now(timezone.utc),
        })
    return jobs


def _strip_html(text: str) -> str:
    import re
    text = re.sub(r"<[^>]+>", " ", text or "")
    return re.sub(r"\s+", " ", text).strip()

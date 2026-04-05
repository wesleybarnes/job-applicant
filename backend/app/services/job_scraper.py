"""Job search service — fetches jobs from external APIs or returns mock data."""
import httpx
from typing import Optional
from datetime import datetime, timezone


async def search_jobs_api(
    query: Optional[str],
    location: Optional[str],
    remote: Optional[bool] = None,
) -> list[dict]:
    """
    Search for jobs. Currently uses JSearch (RapidAPI) if configured,
    otherwise returns demo data so the app works out of the box.

    To use real data, set JSEARCH_API_KEY in your .env file.
    Sign up at: https://rapidapi.com/letscrape-6bRBa3QguO5/api/JSearch
    """
    try:
        return await _search_jsearch(query, location, remote)
    except Exception:
        return _mock_jobs(query, location)


async def _search_jsearch(query: str, location: str, remote: bool) -> list[dict]:
    import os
    api_key = os.getenv("JSEARCH_API_KEY", "")
    if not api_key:
        raise ValueError("No JSearch API key configured")

    search_query = query or "software engineer"
    if remote:
        search_query += " remote"

    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.get(
            "https://jsearch.p.rapidapi.com/search",
            headers={
                "X-RapidAPI-Key": api_key,
                "X-RapidAPI-Host": "jsearch.p.rapidapi.com",
            },
            params={
                "query": f"{search_query} in {location or 'United States'}",
                "page": "1",
                "num_pages": "1",
            },
        )
        response.raise_for_status()
        data = response.json()

    jobs = []
    for item in data.get("data", []):
        jobs.append({
            "title": item.get("job_title", ""),
            "company": item.get("employer_name", ""),
            "location": f"{item.get('job_city', '')}, {item.get('job_state', '')}".strip(", "),
            "remote_type": "remote" if item.get("job_is_remote") else "onsite",
            "description": item.get("job_description", "")[:3000],
            "url": item.get("job_apply_link", ""),
            "source": "jsearch",
            "external_id": item.get("job_id", ""),
            "posted_date": datetime.now(timezone.utc),
            "salary_min": item.get("job_min_salary"),
            "salary_max": item.get("job_max_salary"),
        })
    return jobs


def _mock_jobs(query: str, location: str) -> list[dict]:
    role = query or "Software Engineer"
    loc = location or "San Francisco, CA"
    return [
        {
            "title": f"Senior {role}",
            "company": "TechCorp Inc.",
            "location": loc,
            "job_type": "full-time",
            "remote_type": "hybrid",
            "description": (
                f"We are looking for a Senior {role} to join our growing team. "
                "You will work on cutting-edge products used by millions. "
                "Strong problem-solving skills and collaboration are key."
            ),
            "requirements": (
                "5+ years of experience\nStrong communication skills\n"
                "Experience with modern frameworks\nTeam player"
            ),
            "url": "https://example.com/jobs/1",
            "source": "demo",
            "external_id": "demo-001",
            "posted_date": datetime.now(timezone.utc),
            "salary_min": 120000,
            "salary_max": 160000,
        },
        {
            "title": f"Mid-Level {role}",
            "company": "StartupXYZ",
            "location": "Remote",
            "job_type": "full-time",
            "remote_type": "remote",
            "description": (
                f"Join StartupXYZ as a {role}! We're a fast-growing startup "
                "disrupting the industry. You'll have huge ownership and impact."
            ),
            "requirements": "3+ years experience\nSelf-starter\nComfort with ambiguity",
            "url": "https://example.com/jobs/2",
            "source": "demo",
            "external_id": "demo-002",
            "posted_date": datetime.now(timezone.utc),
            "salary_min": 90000,
            "salary_max": 130000,
        },
        {
            "title": f"{role} II",
            "company": "Enterprise Solutions LLC",
            "location": "New York, NY",
            "job_type": "full-time",
            "remote_type": "onsite",
            "description": (
                f"Enterprise Solutions is hiring a {role} II to help scale "
                "our platform. Great benefits, stable environment, strong team."
            ),
            "requirements": "4+ years experience\nEnterprise background preferred",
            "url": "https://example.com/jobs/3",
            "source": "demo",
            "external_id": "demo-003",
            "posted_date": datetime.now(timezone.utc),
            "salary_min": 100000,
            "salary_max": 140000,
        },
    ]

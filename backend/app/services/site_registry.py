"""Curated registry of job sites the hunt agent knows how to search and log into.

Each entry carries a search-URL template ({q} = role query, {loc} = location),
an optional login URL, whether login is required to apply, the regions/tags it
serves, and generic login-form selectors. The agent ranks/selects from this set
based on the candidate's resume + goal summary, so e.g. "move to Japan" surfaces
the Japan-focused boards.
"""
from typing import Optional

# Generic login selectors cover most sites; per-site overrides go in "login".
SITES: dict[str, dict] = {
    "linkedin": {
        "name": "LinkedIn",
        "search_url": "https://www.linkedin.com/jobs/search/?keywords={q}&location={loc}&f_AL=true&sortBy=DD",
        "login_url": "https://www.linkedin.com/login",
        "requires_login": True,
        "regions": ["global"], "tags": ["general", "tech"],
        "login": {"user": 'input#username, input[name="session_key"]',
                   "pass": 'input#password, input[name="session_password"]',
                   "submit": 'button[type="submit"]',
                   "success": ["feed", "/in/", "mynetwork", "messaging"]},
    },
    "indeed": {
        "name": "Indeed",
        "search_url": "https://www.indeed.com/jobs?q={q}&l={loc}&sort=date&fromage=7",
        "login_url": "https://secure.indeed.com/account/login",
        "requires_login": False,
        "regions": ["global"], "tags": ["general"],
    },
    "wellfound": {
        "name": "Wellfound (AngelList)",
        "search_url": "https://wellfound.com/role/{q}",
        "login_url": "https://wellfound.com/login",
        "requires_login": True,
        "regions": ["global", "remote"], "tags": ["startup", "tech"],
    },
    "remoteok": {
        "name": "RemoteOK",
        "search_url": "https://remoteok.com/remote-{q}-jobs",
        "login_url": None,
        "requires_login": False,
        "regions": ["remote"], "tags": ["remote", "tech"],
    },
    "tokyodev": {
        "name": "TokyoDev",
        "search_url": "https://www.tokyodev.com/jobs?q={q}",
        "login_url": "https://www.tokyodev.com/accounts/sign-in",
        "requires_login": True,
        "regions": ["japan"], "tags": ["tech"],
    },
    "japandev": {
        "name": "Japan Dev",
        "search_url": "https://japan-dev.com/jobs?search={q}",
        "login_url": None,
        "requires_login": False,
        "regions": ["japan"], "tags": ["tech"],
    },
    "gaijinpot": {
        "name": "GaijinPot Jobs",
        "search_url": "https://jobs.gaijinpot.com/index/index/search?keywords={q}",
        "login_url": "https://jobs.gaijinpot.com/login",
        "requires_login": True,
        "regions": ["japan"], "tags": ["general"],
    },
    "daijob": {
        "name": "Daijob",
        "search_url": "https://www.daijob.com/en/jobs/search?keyword={q}",
        "login_url": "https://www.daijob.com/en/login",
        "requires_login": True,
        "regions": ["japan"], "tags": ["bilingual"],
    },
    "wantedly": {
        "name": "Wantedly",
        "search_url": "https://www.wantedly.com/projects?q={q}",
        "login_url": "https://www.wantedly.com/users/sign_in",
        "requires_login": True,
        "regions": ["japan"], "tags": ["startup"],
    },
}

# Region keywords → region tag, used by the heuristic ranker.
_REGION_HINTS = {
    "japan": ["japan", "tokyo", "osaka", "kyoto", "日本", "東京"],
    "remote": ["remote", "anywhere", "wfh"],
}


def detect_regions(*texts: Optional[str]) -> set[str]:
    """Infer region tags (e.g. 'japan', 'remote') from free text + locations."""
    blob = " ".join(t for t in texts if t).lower()
    found = {region for region, kws in _REGION_HINTS.items() if any(k in blob for k in kws)}
    return found or {"global"}


def rank_sites(user: dict, goal_summary: Optional[str] = None, limit: int = 6) -> list[str]:
    """Heuristic site selection from resume/goals. Returns ordered registry keys.

    Region-matched sites first, then general/global, then a remote board. A
    future enhancement can replace this with an LLM ranking call.
    """
    locations = " ".join(user.get("target_locations") or [])
    regions = detect_regions(goal_summary, locations, user.get("location"))

    scored: list[tuple[int, str]] = []
    for key, site in SITES.items():
        score = 0
        site_regions = set(site["regions"])
        if site_regions & regions:
            score += 3
        if "global" in site_regions:
            score += 1
        if "remote" in regions and "remote" in site_regions:
            score += 2
        # Always keep LinkedIn/Indeed in contention as broad defaults
        if key in ("linkedin", "indeed"):
            score += 1
        if score > 0:
            scored.append((score, key))

    scored.sort(key=lambda s: s[0], reverse=True)
    ordered = [key for _, key in scored]
    # Guarantee at least the broad defaults if nothing matched
    for fallback in ("linkedin", "indeed", "remoteok"):
        if fallback not in ordered:
            ordered.append(fallback)
    return ordered[:limit]


def build_search_url(site_key: str, query: str, location: str = "") -> str:
    import urllib.parse
    site = SITES[site_key]
    return site["search_url"].format(
        q=urllib.parse.quote_plus(query or ""),
        loc=urllib.parse.quote_plus(location or ""),
    )

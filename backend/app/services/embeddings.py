"""Embedding service for the career knowledge base.

Uses Voyage AI (Anthropic's recommended embedding provider) over httpx so we
don't add a new SDK dependency. If no key is configured the service reports
disabled and callers fall back to the previous non-RAG behavior.
"""
import asyncio
import httpx
from typing import List
from app.config import settings

VOYAGE_URL = "https://api.voyageai.com/v1/embeddings"
_MAX_BATCH = 100          # Voyage accepts up to 128 inputs per request
_TIMEOUT = 30.0


def is_enabled() -> bool:
    """True when an embedding provider is configured and usable."""
    return settings.embedding_provider == "voyage" and bool(settings.voyage_api_key)


async def _voyage(texts: List[str], input_type: str) -> List[List[float]]:
    headers = {
        "Authorization": f"Bearer {settings.voyage_api_key}",
        "Content-Type": "application/json",
    }
    out: List[List[float]] = []
    async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
        for start in range(0, len(texts), _MAX_BATCH):
            batch = texts[start:start + _MAX_BATCH]
            payload = {
                "input": batch,
                "model": settings.embedding_model,
                "input_type": input_type,
            }
            resp = await client.post(VOYAGE_URL, headers=headers, json=payload)
            resp.raise_for_status()
            data = sorted(resp.json()["data"], key=lambda d: d["index"])
            out.extend(d["embedding"] for d in data)
    return out


async def embed_documents(texts: List[str]) -> List[List[float]]:
    """Embed a list of stored documents (resume chunks, answers, etc.)."""
    if not texts or not is_enabled():
        return []
    return await _voyage(texts, "document")


async def embed_query(text: str) -> List[float]:
    """Embed a single search query (a job posting). Returns [] if disabled."""
    if not text or not is_enabled():
        return []
    result = await _voyage([text], "query")
    return result[0] if result else []

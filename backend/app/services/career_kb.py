"""Career knowledge base — semantic retrieval over a candidate's career history.

Instead of truncating the resume and stuffing it into every prompt, we chunk
the resume + structured sections + pre-written answers + approved cover letters,
embed each chunk once, and retrieve only the pieces most relevant to a specific
job at apply time. Retrieval is brute-force cosine similarity in Python, which
is plenty fast for the tens-to-hundreds of chunks a single user accumulates and
keeps the store DB-agnostic (works on both SQLite and Postgres).

Every public function degrades gracefully: if embeddings are disabled, indexing
is a no-op and retrieval returns "" so the agent uses its existing fallback.
"""
import math
import re
from typing import List, Optional
from sqlalchemy.orm import Session

from app import models
from app.services import embeddings

# source_types derived from a resume — replaced wholesale when a resume is (re)indexed
_RESUME_SOURCES = ["resume", "experience", "skills", "summary", "education"]

_TARGET_CHARS = 800
_OVERLAP_CHARS = 150


# ──────────────────────────────────────────────────────────────────────────
# Chunking
# ──────────────────────────────────────────────────────────────────────────
def chunk_text(text: str, target: int = _TARGET_CHARS, overlap: int = _OVERLAP_CHARS) -> List[str]:
    """Split text into ~target-sized chunks on paragraph boundaries."""
    text = (text or "").strip()
    if not text:
        return []
    paragraphs = [p.strip() for p in re.split(r"\n\s*\n", text) if p.strip()]
    chunks: List[str] = []
    buf = ""
    for para in paragraphs:
        if buf and len(buf) + len(para) + 1 > target:
            chunks.append(buf)
            buf = ""
        if len(para) <= target:
            buf = f"{buf}\n{para}".strip() if buf else para
        else:
            # Hard-split an oversized paragraph with overlap
            if buf:
                chunks.append(buf)
                buf = ""
            step = max(1, target - overlap)
            for i in range(0, len(para), step):
                chunks.append(para[i:i + target])
    if buf:
        chunks.append(buf)
    return chunks


# ──────────────────────────────────────────────────────────────────────────
# Indexing
# ──────────────────────────────────────────────────────────────────────────
async def _store(db: Session, user_id: int, items: List[dict]) -> int:
    """Embed and persist a list of {content, source_type, source_id, meta} dicts."""
    items = [it for it in items if it.get("content", "").strip()]
    if not items:
        return 0
    vectors = await embeddings.embed_documents([it["content"] for it in items])
    if not vectors:
        return 0
    for it, vec in zip(items, vectors):
        db.add(models.CareerChunk(
            user_id=user_id,
            source_type=it["source_type"],
            source_id=it.get("source_id"),
            content=it["content"],
            embedding=vec,
            meta=it.get("meta"),
        ))
    db.commit()
    return len(items)


async def index_resume(db: Session, resume) -> int:
    """(Re)index the active resume. Replaces any prior resume-derived chunks."""
    if not embeddings.is_enabled() or not resume:
        return 0

    # Clear previous resume-derived chunks for this user so the KB tracks the active resume
    db.query(models.CareerChunk).filter(
        models.CareerChunk.user_id == resume.user_id,
        models.CareerChunk.source_type.in_(_RESUME_SOURCES),
    ).delete(synchronize_session=False)
    db.commit()

    items: List[dict] = []
    for chunk in chunk_text(resume.parsed_text or ""):
        items.append({"content": chunk, "source_type": "resume", "source_id": resume.id})

    # Structured sections (already segmented by the parser) get their own labeled chunks
    structured = resume.structured_data or {}
    for key, source_type in (("experience", "experience"), ("education", "education"),
                             ("skills", "skills"), ("summary", "summary")):
        value = structured.get(key)
        if isinstance(value, str) and value.strip():
            for chunk in chunk_text(value):
                items.append({
                    "content": chunk,
                    "source_type": source_type,
                    "source_id": resume.id,
                    "meta": {"label": key},
                })

    return await _store(db, resume.user_id, items)


async def index_custom_answers(db: Session, user) -> int:
    """Index the user's pre-written Q&A so past answers can be retrieved/adapted."""
    if not embeddings.is_enabled() or not user or not user.custom_answers:
        return 0
    db.query(models.CareerChunk).filter(
        models.CareerChunk.user_id == user.id,
        models.CareerChunk.source_type == "answer",
    ).delete(synchronize_session=False)
    db.commit()
    items = [
        {
            "content": f"Q: {q}\nA: {a}",
            "source_type": "answer",
            "meta": {"question": q},
        }
        for q, a in user.custom_answers.items() if str(a).strip()
    ]
    return await _store(db, user.id, items)


async def index_cover_letter(db: Session, user_id: int, application) -> int:
    """Index an approved cover letter so its phrasing informs future letters."""
    if not embeddings.is_enabled() or not application or not application.cover_letter:
        return 0
    # One chunk per application; replace if re-approved
    db.query(models.CareerChunk).filter(
        models.CareerChunk.user_id == user_id,
        models.CareerChunk.source_type == "cover_letter",
        models.CareerChunk.source_id == application.id,
    ).delete(synchronize_session=False)
    db.commit()
    return await _store(db, user_id, [{
        "content": application.cover_letter,
        "source_type": "cover_letter",
        "source_id": application.id,
    }])


# ──────────────────────────────────────────────────────────────────────────
# Retrieval
# ──────────────────────────────────────────────────────────────────────────
def _cosine(a: List[float], b: List[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b))
    na = math.sqrt(sum(x * x for x in a))
    nb = math.sqrt(sum(y * y for y in b))
    if na == 0.0 or nb == 0.0:
        return 0.0
    return dot / (na * nb)


async def retrieve(db: Session, user_id: int, query: str, k: int) -> List[models.CareerChunk]:
    """Return the k career chunks most relevant to the query, ranked."""
    if not embeddings.is_enabled():
        return []
    query_vec = await embeddings.embed_query(query)
    if not query_vec:
        return []
    chunks = db.query(models.CareerChunk).filter(
        models.CareerChunk.user_id == user_id
    ).all()
    scored = [
        (c, _cosine(query_vec, c.embedding))
        for c in chunks if c.embedding
    ]
    scored.sort(key=lambda pair: pair[1], reverse=True)
    return [c for c, _ in scored[:k]]


_LABELS = {
    "resume": "Resume",
    "experience": "Experience",
    "education": "Education",
    "skills": "Skills",
    "summary": "Professional summary",
    "answer": "Previously written answer",
    "cover_letter": "Past cover letter (phrasing reference)",
}


def build_context(chunks: List[models.CareerChunk]) -> str:
    """Format retrieved chunks into a prompt block. Empty string if none."""
    if not chunks:
        return ""
    blocks = []
    for c in chunks:
        label = _LABELS.get(c.source_type, c.source_type.title())
        blocks.append(f"[{label}]\n{c.content.strip()}")
    return "\n\n".join(blocks)


async def retrieve_context(db: Session, user_id: int, query: str, k: Optional[int] = None) -> str:
    """Convenience: retrieve + format in one call. Returns "" when disabled/empty."""
    from app.config import settings
    chunks = await retrieve(db, user_id, query, k or settings.rag_top_k)
    return build_context(chunks)

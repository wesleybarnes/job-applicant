"""Resume parsing service — extracts text and structured data from uploaded files."""
import re
from typing import Tuple, Optional


def parse_resume(file_path: str, ext: str) -> Tuple[str, dict]:
    """Parse a resume file and return (raw_text, structured_data)."""
    raw_text = _extract_text(file_path, ext)
    structured = _extract_structured(raw_text)
    return raw_text, structured


def _extract_text(file_path: str, ext: str) -> str:
    try:
        if ext == ".pdf":
            return _extract_pdf(file_path)
        elif ext in (".docx", ".doc"):
            return _extract_docx(file_path)
        else:
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                return f.read()
    except Exception as e:
        return f"[Error extracting text: {e}]"


def _extract_pdf(file_path: str) -> str:
    try:
        import pdfplumber
        text_parts = []
        with pdfplumber.open(file_path) as pdf:
            for page in pdf.pages:
                text = page.extract_text()
                if text:
                    text_parts.append(text)
        return "\n".join(text_parts)
    except ImportError:
        try:
            import PyPDF2
            with open(file_path, "rb") as f:
                reader = PyPDF2.PdfReader(f)
                return "\n".join(page.extract_text() or "" for page in reader.pages)
        except ImportError:
            return "[Install pdfplumber or PyPDF2 to parse PDFs]"


def _extract_docx(file_path: str) -> str:
    try:
        from docx import Document
        doc = Document(file_path)
        return "\n".join(p.text for p in doc.paragraphs if p.text.strip())
    except ImportError:
        return "[Install python-docx to parse Word documents]"


def _extract_structured(text: str) -> dict:
    """Extract key sections from resume text using heuristics."""
    return {
        "emails": _extract_emails(text),
        "phones": _extract_phones(text),
        "urls": _extract_urls(text),
        "skills": _extract_skills_section(text),
        "education": _extract_section(text, ["education", "academic background"]),
        "experience": _extract_section(text, ["experience", "work history", "employment"]),
        "summary": _extract_section(text, ["summary", "objective", "profile", "about"]),
        "certifications": _extract_section(text, ["certifications", "certificates", "licenses"]),
        "word_count": len(text.split()),
    }


def _extract_emails(text: str) -> list:
    return re.findall(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}", text)


def _extract_phones(text: str) -> list:
    return re.findall(r"[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}", text)


def _extract_urls(text: str) -> list:
    return re.findall(
        r"https?://[^\s]+|linkedin\.com/in/[^\s]+|github\.com/[^\s]+", text
    )


def _extract_skills_section(text: str) -> str:
    return _extract_section(text, ["skills", "technologies", "technical skills", "competencies"])


def _extract_section(text: str, headers: list) -> str:
    lines = text.split("\n")
    section_lines = []
    in_section = False
    section_header_pattern = re.compile(
        r"^(" + "|".join(re.escape(h) for h in headers) + r")\s*[:]*\s*$",
        re.IGNORECASE,
    )
    next_section_pattern = re.compile(
        r"^[A-Z][A-Za-z\s]{2,30}[:]*\s*$"
    )
    for line in lines:
        stripped = line.strip()
        if section_header_pattern.match(stripped):
            in_section = True
            continue
        if in_section:
            if next_section_pattern.match(stripped) and stripped.lower() not in headers:
                break
            if stripped:
                section_lines.append(stripped)
    return "\n".join(section_lines[:50])  # cap at 50 lines

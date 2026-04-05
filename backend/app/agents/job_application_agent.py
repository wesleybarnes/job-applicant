"""
Job Application Agent — powered by Claude Opus 4.6 with adaptive thinking.

This agent:
1. Analyzes the job description against the user's profile and resume
2. Scores the match (0-100) with reasoning
3. Generates a tailored, compelling cover letter
4. Fills out common application form questions
5. (Optional) Uses Playwright MCP to submit the application
"""
import json
import asyncio
from typing import AsyncIterator, Optional
import anthropic
from app.config import settings


SYSTEM_PROMPT = """You are an expert job application specialist and career coach with 20+ years of experience.
Your role is to help candidates land their dream jobs by:
1. Analyzing job requirements vs candidate qualifications with precision
2. Writing compelling, personalized cover letters that stand out
3. Identifying keyword matches and gaps
4. Tailoring application materials to maximize ATS scores
5. Crafting honest, impactful responses to application questions

Always be honest — never fabricate experience or qualifications. Focus on genuine strengths.
Write in a professional but authentic voice that matches the candidate's background.
"""


class JobApplicationAgent:
    def __init__(self):
        self.client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)

    def _build_tools(self) -> list:
        return [
            {
                "name": "analyze_job_match",
                "description": (
                    "Analyze how well a candidate matches a job posting. "
                    "Returns a match score (0-100) and detailed breakdown."
                ),
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "match_score": {
                            "type": "number",
                            "description": "Overall match score from 0 to 100",
                        },
                        "matching_skills": {
                            "type": "array",
                            "items": {"type": "string"},
                            "description": "Skills/experience that match the job requirements",
                        },
                        "missing_skills": {
                            "type": "array",
                            "items": {"type": "string"},
                            "description": "Required skills/experience the candidate lacks",
                        },
                        "key_selling_points": {
                            "type": "array",
                            "items": {"type": "string"},
                            "description": "Strongest reasons to hire this candidate",
                        },
                        "concerns": {
                            "type": "array",
                            "items": {"type": "string"},
                            "description": "Potential concerns the hiring manager might have",
                        },
                        "recommendation": {
                            "type": "string",
                            "enum": ["strong_apply", "apply", "apply_with_note", "skip"],
                            "description": "Whether to apply and how confidently",
                        },
                    },
                    "required": ["match_score", "matching_skills", "missing_skills",
                                 "key_selling_points", "recommendation"],
                },
            },
            {
                "name": "generate_cover_letter",
                "description": "Generate a tailored, compelling cover letter for the job application.",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "cover_letter": {
                            "type": "string",
                            "description": "The full cover letter text (3-4 paragraphs)",
                        },
                        "subject_line": {
                            "type": "string",
                            "description": "Email subject line for the application",
                        },
                    },
                    "required": ["cover_letter"],
                },
            },
            {
                "name": "answer_application_questions",
                "description": "Generate answers to common job application questions.",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "answers": {
                            "type": "object",
                            "description": "Map of question -> answer pairs",
                            "additionalProperties": {"type": "string"},
                        },
                    },
                    "required": ["answers"],
                },
            },
            {
                "name": "complete_application",
                "description": "Mark the application analysis as complete with a final summary.",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "status": {
                            "type": "string",
                            "enum": ["ready_to_submit", "needs_review", "not_recommended"],
                        },
                        "summary": {
                            "type": "string",
                            "description": "Brief summary of what was prepared",
                        },
                        "next_steps": {
                            "type": "array",
                            "items": {"type": "string"},
                            "description": "Recommended next steps for the candidate",
                        },
                    },
                    "required": ["status", "summary"],
                },
            },
        ]

    def _build_prompt(self, user, job, resume, mode: str) -> str:
        resume_text = ""
        if resume and resume.parsed_text:
            resume_text = f"\n\n## Resume Content\n{resume.parsed_text[:4000]}"

        structured = resume.structured_data if resume and resume.structured_data else {}
        skills_text = ""
        if structured.get("skills"):
            skills_text = f"\nExtracted skills: {structured['skills']}"

        custom_answers = ""
        if user.custom_answers:
            qa_items = "\n".join(f"- {k}: {v}" for k, v in user.custom_answers.items())
            custom_answers = f"\n\n## Candidate's Pre-written Answers\n{qa_items}"

        salary_info = ""
        if user.salary_min or user.salary_max:
            salary_info = f"\nSalary expectation: ${user.salary_min:,} - ${user.salary_max:,}" if user.salary_min and user.salary_max else ""

        job_salary = ""
        if job.salary_min or job.salary_max:
            job_salary = f"\nSalary range: ${job.salary_min or 0:,} - ${job.salary_max or 0:,}"

        return f"""Please analyze this job application opportunity and prepare all necessary materials.

## Job Details
**Title:** {job.title}
**Company:** {job.company}
**Location:** {job.location or 'Not specified'} ({job.remote_type or 'Not specified'})
**Type:** {job.job_type or 'Full-time'}
{job_salary}

**Job Description:**
{(job.description or 'Not provided')[:2500]}

**Requirements:**
{(job.requirements or 'See description')[:1000]}

## Candidate Profile
**Name:** {user.full_name}
**Email:** {user.email}
**Location:** {user.location or 'Not specified'}
**Years of Experience:** {user.years_experience or 'Not specified'}
**Education:** {user.education_level or 'Not specified'}
**Work Authorization:** {user.work_authorization or 'Not specified'}
**Remote Preference:** {user.remote_preference or 'Any'}
{salary_info}

**Skills:** {', '.join(user.skills or [])}
{skills_text}

**Professional Summary:**
{user.summary or 'Not provided'}

**LinkedIn:** {user.linkedin_url or 'N/A'}
**GitHub:** {user.github_url or 'N/A'}
{resume_text}
{custom_answers}

## Instructions
Mode: {mode}

Please:
1. Call `analyze_job_match` with a thorough analysis of the candidate-job fit
2. Call `generate_cover_letter` with a compelling, personalized cover letter (if mode is 'full' or 'cover_letter_only')
3. Call `answer_application_questions` with answers to: "Why do you want to work here?", "What makes you a good fit?", "Tell me about yourself" (if mode is 'full')
4. Call `complete_application` to finalize

The cover letter should:
- Open with a specific, compelling hook referencing the company
- Highlight 2-3 most relevant achievements/skills for this specific role
- Show genuine interest in the company's mission
- Be 3-4 paragraphs, professional but warm
- NOT start with "I am writing to apply for..."
"""

    async def run(self, user, job, resume, mode: str = "full") -> dict:
        """Run the agent and return the complete result."""
        messages = [{"role": "user", "content": self._build_prompt(user, job, resume, mode)}]
        tools = self._build_tools()
        agent_log = []
        results = {}

        while True:
            response = await self.client.messages.create(
                model="claude-opus-4-6",
                max_tokens=8000,
                thinking={"type": "adaptive"},
                system=SYSTEM_PROMPT,
                tools=tools,
                messages=messages,
            )

            # Log assistant turn
            for block in response.content:
                if hasattr(block, "type"):
                    if block.type == "text":
                        agent_log.append({"type": "text", "content": block.text[:500]})
                    elif block.type == "tool_use":
                        agent_log.append({
                            "type": "tool_call",
                            "tool": block.name,
                            "summary": _summarize_tool_input(block.name, block.input),
                        })
                        results[block.name] = block.input

            if response.stop_reason == "end_turn":
                break

            # Handle tool calls
            tool_results = []
            for block in response.content:
                if hasattr(block, "type") and block.type == "tool_use":
                    tool_results.append({
                        "type": "tool_result",
                        "tool_use_id": block.id,
                        "content": json.dumps({"status": "recorded", "data": block.input}),
                    })

            if not tool_results:
                break

            messages.append({"role": "assistant", "content": response.content})
            messages.append({"role": "user", "content": tool_results})

        # Build final result
        match_data = results.get("analyze_job_match", {})
        cover_letter_data = results.get("generate_cover_letter", {})
        completion_data = results.get("complete_application", {})

        status_map = {
            "strong_apply": "ready_to_submit",
            "apply": "ready_to_submit",
            "apply_with_note": "needs_review",
            "skip": "not_recommended",
        }
        recommendation = match_data.get("recommendation", "apply")

        return {
            "status": completion_data.get("status") or status_map.get(recommendation, "ready_to_submit"),
            "cover_letter": cover_letter_data.get("cover_letter", ""),
            "match_score": match_data.get("match_score"),
            "match_reasons": match_data.get("key_selling_points", []),
            "agent_log": agent_log,
            "submitted": False,
            "message": completion_data.get("summary", "Application materials prepared successfully."),
            "analysis": match_data,
            "answers": results.get("answer_application_questions", {}).get("answers", {}),
            "next_steps": completion_data.get("next_steps", []),
        }

    async def run_stream(self, user, job, resume, mode: str = "full") -> AsyncIterator[dict]:
        """Run the agent with streaming events for real-time UI updates."""
        messages = [{"role": "user", "content": self._build_prompt(user, job, resume, mode)}]
        tools = self._build_tools()

        yield {"type": "start", "message": "Agent starting analysis..."}
        await asyncio.sleep(0)

        while True:
            async with self.client.messages.stream(
                model="claude-opus-4-6",
                max_tokens=8000,
                thinking={"type": "adaptive"},
                system=SYSTEM_PROMPT,
                tools=tools,
                messages=messages,
            ) as stream:
                current_tool_name = None
                async for event in stream:
                    if event.type == "content_block_start":
                        block = event.content_block
                        if block.type == "tool_use":
                            current_tool_name = block.name
                            yield {
                                "type": "tool_start",
                                "tool": block.name,
                                "message": _tool_start_message(block.name),
                            }
                        elif block.type == "thinking":
                            yield {"type": "thinking", "message": "Analyzing..."}
                        elif block.type == "text":
                            yield {"type": "text_start", "message": ""}

                    elif event.type == "content_block_delta":
                        if event.delta.type == "text_delta":
                            yield {"type": "text_delta", "content": event.delta.text}

                final = await stream.get_final_message()

            tool_results = []
            for block in final.content:
                if hasattr(block, "type") and block.type == "tool_use":
                    yield {
                        "type": "tool_complete",
                        "tool": block.name,
                        "data": _summarize_tool_input(block.name, block.input),
                    }
                    tool_results.append({
                        "type": "tool_result",
                        "tool_use_id": block.id,
                        "content": json.dumps({"status": "recorded"}),
                    })

            if final.stop_reason == "end_turn" or not tool_results:
                yield {"type": "complete", "message": "Application materials ready!"}
                break

            messages.append({"role": "assistant", "content": final.content})
            messages.append({"role": "user", "content": tool_results})


def _summarize_tool_input(tool_name: str, inp: dict) -> str:
    if tool_name == "analyze_job_match":
        return f"Match score: {inp.get('match_score', 'N/A')}/100 — {inp.get('recommendation', '')}"
    elif tool_name == "generate_cover_letter":
        cl = inp.get("cover_letter", "")
        return f"Cover letter generated ({len(cl)} chars)"
    elif tool_name == "answer_application_questions":
        n = len(inp.get("answers", {}))
        return f"Answered {n} application questions"
    elif tool_name == "complete_application":
        return inp.get("summary", "Complete")
    return str(inp)[:100]


def _tool_start_message(tool_name: str) -> str:
    messages = {
        "analyze_job_match": "Analyzing job fit and scoring your match...",
        "generate_cover_letter": "Writing your personalized cover letter...",
        "answer_application_questions": "Crafting answers to common questions...",
        "complete_application": "Finalizing your application package...",
    }
    return messages.get(tool_name, f"Running {tool_name}...")

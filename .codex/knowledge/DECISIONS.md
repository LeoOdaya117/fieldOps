# Project Decisions

Append meaningful architectural or workflow decisions with their date, context, chosen approach, and rationale. Do not use this file as a general activity log. Preserve earlier entries; if a decision is superseded, add a new entry that links to it.

## 2026-09-26 — Keep the Codex specialist setup project-local

- **Context:** FieldOps needs reusable specialist roles and durable feature workflows for the project team.
- **Decision:** Store skills under `.agents/skills/`, agents under `.codex/agents/`, and project knowledge and plans under `.codex/` in Git.
- **Rationale:** The setup and verified project guidance should travel with the repository and remain reviewable across sessions.

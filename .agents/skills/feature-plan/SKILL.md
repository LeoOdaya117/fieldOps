---
name: feature-plan
description: Turn a feature request into a repository-grounded, decision-complete implementation plan saved under `.codex/plans/` for later execution.
---

# Save a feature plan

Use this skill when asked to plan a feature or preserve an implementation plan for a later session.

1. Read `AGENTS.md` and available `.codex/knowledge/` files, then inspect relevant source, tests, interfaces, and configuration. Resolve discoverable questions from the repository before asking the user.
2. Clarify material product choices that cannot be inferred. Make the plan specific enough that implementation does not require avoidable design decisions; record reasonable defaults when the user leaves optional preferences unanswered.
3. Save a new Markdown file at `.codex/plans/YYYY-MM-DD-<short-feature-slug>.md`. Use the current local date. If that path already exists, add a numeric suffix; never replace an earlier plan.
4. Include the goal and success criteria, implementation approach and affected boundaries, interface/data changes where applicable, edge cases, test and acceptance scenarios, and assumptions. Keep scope focused and refer to source paths only when they help implementation.
5. Do not modify application code while planning. Preserve the saved plan as the durable record and report its path and any unresolved decisions.

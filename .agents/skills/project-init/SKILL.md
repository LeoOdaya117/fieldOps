---
name: project-init
description: Inspect a repository and create or refresh persistent, source-verified architecture knowledge for future Codex work.
---

# Initialize project knowledge

Use this skill when asked to initialize project knowledge, map the architecture, or refresh saved architecture and convention notes.

1. Read the repository's `AGENTS.md` and existing `.codex/knowledge/` files before changing anything. Inspect manifests, route definitions, entry points, directory structure, and test/build configuration to verify the current state.
2. Create or refresh `.codex/knowledge/PROJECT_CONTEXT.md` with concise detected clues: stack and versions, major application boundaries, important entry points, and actual test, lint, format, type-check, and build commands. Mark uncertain or inferred clues as such.
3. Update `.codex/knowledge/PROJECT_NOTES.md` only with conventions verified from source or canonical project instructions. Preserve existing useful notes and correct stale facts with a brief explanation rather than replacing the file wholesale.
4. Append to `.codex/knowledge/DECISIONS.md` only when this initialization establishes a meaningful project decision. Do not invent decisions or duplicate ordinary observations.
5. Do not overwrite `.codex/plans/` or unrelated files. Do not store secrets, environment values, credentials, or sensitive user data.
6. Summarize the files updated, evidence inspected, and any unresolved or inferred items. Do not claim the repository is continuously monitored; knowledge refreshes when this skill is run.

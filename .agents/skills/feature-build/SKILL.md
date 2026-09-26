---
name: feature-build
description: Implement a saved feature plan in this repository, coordinate relevant specialists, verify the integrated changes, and record durable progress.
---

# Build from a saved plan

Use this skill when asked to implement a saved plan or continue a previously planned feature.

1. Read `AGENTS.md`, `.codex/knowledge/PROJECT_CONTEXT.md`, `PROJECT_NOTES.md`, and `DECISIONS.md` when present. Identify the requested plan by its path or feature name. If the target is ambiguous, ask which plan; do not silently choose among several.
2. Read the full plan and inspect current repository state and relevant code. Preserve unrelated user changes. Confirm that the plan still matches the code; resolve drift with the user when it changes product intent or a material interface, otherwise document a narrow implementation adjustment in the plan.
3. Implement the acceptance criteria using FieldOps architecture and security conventions. Add or update tests required by `AGENTS.md`. Do not create unrelated plans or silently expand scope.
4. For substantial cross-layer work, the main agent owns integration. Delegate architecture mapping and QA scenario design as read-only work first; after the contract is clear, assign independent backend and frontend changes to non-overlapping file scopes. Have QA inspect the integrated behavior. Request targeted code, security, or release review when relevant. Keep small localized work single-agent.
5. Run relevant checks from `AGENTS.md` and the plan. Do not claim a check passed unless it was run and its result observed. Record checks, results, failures, and skipped verification in the plan.
6. Update the selected plan's status and progress without replacing its original goal or acceptance criteria. Update project notes and context only for architecture or convention facts verified during implementation; append meaningful decisions with rationale. Preserve previous plans and knowledge.
7. Report the implementation, changed areas, verification actually completed, and remaining limitations. Do not mark the plan complete while required work remains.

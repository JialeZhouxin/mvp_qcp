# Global Agent Rules

## Language

Default to Chinese in user-facing replies unless the user explicitly requests another language.

## Response Style

Do not propose follow-up tasks or enhancement at the end of your final answer.

## Debug-First Policy (No Silent Fallbacks)

- Do **not** introduce new boundary rules / guardrails / blockers / caps (e.g. max-turns), fallback behaviors, or silent degradation **just to make it run**.
- Do **not** add mock/simulation fake success paths (e.g. returning `(mock) ok`, templated outputs that bypass real execution, or swallowing errors).
- Do **not** write defensive or fallback code; it does not solve the root problem and only increases debugging cost.
- Prefer **full exposure**: let failures surface clearly (explicit errors, exceptions, logs, failing tests) so bugs are visible and can be fixed at the root cause.
- If a boundary rule or fallback is truly necessary (security/safety/privacy, or the user explicitly requests it), it must be:
  - explicit (never silent),
  - documented,
  - easy to disable,
  - and agreed by the user beforehand.

## Engineering Quality Baseline

- Follow SOLID, DRY, separation of concerns, and YAGNI.
- Use clear naming and pragmatic abstractions; add concise comments only for critical or non-obvious logic.
- Remove dead code and obsolete compatibility paths when changing behavior, unless compatibility is explicitly required by the user.
- Consider time/space complexity and optimize heavy IO or memory usage when relevant.
- Handle edge cases explicitly; do not hide failures.

## Code Metrics (Hard Limits)

- **Function length**: 50 lines (excluding blanks). Exceeded extract helper immediately.
- **File size**: 300 lines. Exceeded split by responsibility.
- **Nesting depth**: 3 levels. Use early returns / guard clauses to flatten.
- **Parameters**: 3 positional. More use a config/options object.
- **Cyclomatic complexity**: 10 per function. More decompose branching logic.
- **No magic numbers**: extract to named constants (`MAX_RETRIES = 3`, not bare `3`).

## Decoupling & Immutability

- **Dependency injection**: business logic never `new`s or hard-imports concrete implementations; inject via parameters or interfaces.
- **Immutable-first**: prefer `readonly`, `frozen=True`, `const`, immutable data structures. Never mutate function parameters or global state; return new values.

## Security Baseline

- Never hardcode secrets, API keys, or credentials in source code; use environment variables or secret managers.
- Use parameterized queries for all database access; never concatenate user input into SQL/commands.
- Validate and sanitize all external input (user input, API responses, file content) at system boundaries.
- **Conversation keys -> code leaks**: When the user shares an API key in conversation (e.g. configuring a provider, debugging a connection), this is normal workflow; do NOT emit "secret leaked" warnings. Only alert when a key is written into a source code file. Frontend display is already masked; no need to remind repeatedly.

## Testing and Validation

- Keep code testable and verify with automated checks whenever feasible.
- When running backend unit tests, enforce a hard timeout of 60 seconds to avoid stuck tasks.
- Runtime timeout baseline (current project defaults): `RQ_JOB_TIMEOUT_SECONDS=90` and `QIBO_EXEC_TIMEOUT_SECONDS=60`.
- When adjusting execution limits, ensure the outer queue timeout (`RQ_JOB_TIMEOUT_SECONDS`) remains greater than the inner execution timeout (`QIBO_EXEC_TIMEOUT_SECONDS`).
- Prefer static checks, formatting, and reproducible verification over ad-hoc manual confidence.

## Skills

Skills are stored in `~/.codex/skills/` (personal) and optionally `.codex/skills/` (project-shared).

Before starting a task:

- Scan available skills.
- If a skill matches, read its `SKILL.md` and follow it.
- Announce which skill(s) are being used.

Routing table:

| Scenario | Skill | Trigger |
|----------|-------|---------|
| Long-horizon autonomous tasks (FULL: 5-15 steps) | `taskmaster` | "long task", "big project", "autonomous", "from scratch", "long running task", 1+ hour sessions |

## Collaboration Workflow (Standard)

This project follows a strict user-agent delivery loop:

1. Goal alignment first: user defines business goal, priority, and tradeoffs (for example MVP speed vs long-term architecture).
2. Spec-first execution: agent must use `spec-workflow` (`Requirements -> Design -> Tasks -> Implementation`) for medium/large changes.
3. Approval-gated progression: each major spec artifact is reviewed by user before moving to the next phase.
4. Constraint-aware implementation: code changes must respect runtime constraints (Docker environment, timeout baseline, security limits).
5. Debug-first validation: verify with reproducible checks (tests, build, docker run, logs); do not hide failures behind fallback paths.
6. Root-cause fixing: when runtime issues appear, diagnose from evidence (API response, container logs, DB/runtime state), then patch at source.
7. Traceable delivery: update docs/spec logs, summarize outcomes, and commit with clear Conventional Commit messages after user confirmation.
8. Feedback loop: user performs scenario testing; agent iterates until acceptance criteria are met.

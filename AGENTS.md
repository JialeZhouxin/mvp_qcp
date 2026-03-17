# Global Agent Rules

## 项目运行 (Project Run)

### 启动开发环境

```powershell
# 需要 Redis 运行在 127.0.0.1:6379
.\scripts\start-dev.ps1
```

脚本会自动：
1. 检查 Redis 连接（若无则尝试启动）
2. 验证 Python 3.11 环境
3. 检查后端/前端依赖
4. 启动后端 API (端口 8000)
5. 启动 RQ Worker
6. 启动前端开发服务器 (端口 5173)

### 常用命令

| 命令 | 说明 |
|------|------|
| `cd backend; pytest` | 后端单元测试 |
| `cd frontend; npm test` | 前端测试 (vitest) |
| `cd frontend; npm run build` | 前端生产构建 |
| `cd backend; uv run uvicorn app.main:app --reload --port 8000` | 单独启动后端 |

### 环境要求

- **Python**: 3.11
- **Node.js**: 18+
- **Redis**: 127.0.0.1:6379
- **包管理器**: uv (Python), npm (Node)

## 目录结构 (Directory Layout)

```
mvp_qcp/
├─ backend/                    # FastAPI 后端
│  ├─ app/
│  │  ├─ api/                 # REST API 路由 (auth, tasks, projects)
│  │  ├─ core/                # 配置、日志
│  │  ├─ db/                  # SQLModel 数据库会话
│  │  ├─ models/              # 数据模型
│  │  ├─ schemas/             # Pydantic 模型
│  │  ├─ services/            # 业务逻辑 (鉴权、沙箱、执行器)
│  │  └─ worker/              # RQ Worker
│  └─ tests/                  # 后端测试
├─ frontend/                   # React + TypeScript 前端
│  ├─ src/
│  │  ├─ api/                 # API 客户端
│  │  ├─ auth/                # Token 管理
│  │  ├─ components/           # 通用组件
│  │  ├─ pages/               # 页面组件
│  │  └─ features/            # 功能模块
│  └─ tests/                  # 前端测试
├─ scripts/                    # 开发脚本
│  └─ start-dev.ps1           # 开发环境启动脚本
└─ docs/                      # 文档
```

## 验证标准 (Completion Criteria)

完成任务后，Agent 必须验证：
1. 后端测试通过：`cd backend; pytest`
2. 前端构建成功：`cd frontend; npm run build`
3. 代码通过各自 lint 检查
4. 手动验证端到端流程

## 项目约束 (Project Constraints)

- **数据库**: SQLite，位于 `backend/app.db`
- **任务队列**: Redis + RQ，超时配置见环境变量 (`RQ_JOB_TIMEOUT_SECONDS`, `QIBO_EXEC_TIMEOUT_SECONDS`)
- **前端状态**: React Context，无状态管理库
- **禁止**: 绕过 `app/services/` 直接在 API 层写业务逻辑
## Language

Default to Chinese in user-facing replies unless the user explicitly requests another language.

## Response Style

Do not propose follow-up tasks or enhancement at the end of your final answer.

## Debug-First Policy (No Silent Fallbacks)

- Do **not** introduce new boundary rules / guardrails / blockers / caps (e.g. max-turns), fallback behaviors, or silent degradation **just to make it run**.
- Do **not** add mock/simulation fake success paths (e.g. returning `(mock) ok`, templated outputs that bypass real execution, or swallowing errors).
- Avoid silent fallback. Do not hide errors.Expose failures clearly.it does not solve the root problem and only increases debugging cost.
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

- **Function length**: Soft limit: 80,Hard limit: 120
- **File size**: 300 lines. Exceeded split by responsibility.
- **Nesting depth**: Soft limit: 4
- **Parameters**: 5 positional. More -> config/options object.
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
- Tests must use real execution paths. Do not use mock/fake/stub/simulated-success flows to claim feature correctness.
- If a dependency is unavailable, tests should fail explicitly with actionable errors instead of replacing behavior with test doubles.
- Migration policy: no new mock-based tests are allowed; existing mock-based tests must be replaced by real tests in subsequent iterations.

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

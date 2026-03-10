# Tasks Document

- [x] 1. 新增后端与前端 Docker 忽略文件
  - File: `backend/.dockerignore`, `frontend/.dockerignore`
  - 为镜像构建排除无关目录（如测试缓存、本地虚拟环境、node_modules、git 元数据）
  - 目的：减少镜像构建上下文体积并提升构建稳定性
  - _Leverage: `backend/`, `frontend/` 现有目录结构_
  - _Requirements: 1.1, 2.1, NFR Architecture_
  - _Prompt: Implement the task for spec dockerized-dev-demo-runtime, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Containerization Engineer | Task: Create focused `.dockerignore` files for backend and frontend to keep build context minimal and deterministic | Restrictions: Do not ignore required runtime source files, do not introduce unrelated cleanup changes | _Leverage: Existing project directory layout and current build inputs | _Requirements: Requirement 1 and 2 + Architecture NFR | Success: Docker build context excludes temporary/cache artifacts while preserving all required app files; then set task to in-progress `[-]`, implement, log with `log-implementation`, and mark completed `[x]`._

- [x] 2. 新增后端开发镜像定义并支持 API/Worker 复用
  - File: `backend/Dockerfile`
  - 构建 Python 3.11 运行环境并安装 `requirements.txt`
  - 目的：为 API 与 Worker 提供统一基础镜像，避免依赖漂移
  - _Leverage: `backend/requirements.txt`, `backend/pyproject.toml`, `backend/app/`_
  - _Requirements: 2.1, 2.2, 2.3_
  - _Prompt: Implement the task for spec dockerized-dev-demo-runtime, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Backend Platform Engineer | Task: Create backend Dockerfile for development runtime so API and worker can share the same image base | Restrictions: Keep design MVP-focused, no production hardening extras, no fallback/mock paths | _Leverage: Existing backend dependency and startup command patterns | _Requirements: Requirement 2 | Success: Backend image builds successfully and supports launching both uvicorn API and rq worker via different compose commands; then set task `[-]`, implement, log artifacts, and mark `[x]`._

- [x] 3. 新增前端开发镜像定义并保留 Vite 开发体验
  - File: `frontend/Dockerfile`
  - 构建 Node 开发运行环境并使用现有 `npm run dev`
  - 目的：在容器内保持前端热更新与开发调试体验
  - _Leverage: `frontend/package.json`, `frontend/vite.config.ts`, `frontend/src/`_
  - _Requirements: 1.1, 5.1, 5.2_
  - _Prompt: Implement the task for spec dockerized-dev-demo-runtime, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Frontend Infrastructure Engineer | Task: Create a frontend development Dockerfile to run Vite in container with mounted source workflow | Restrictions: Do not switch to production static serving mode, keep MVP dev speed priority | _Leverage: Existing `npm run dev` script and Vite host config | _Requirements: Requirement 1 and 5 | Success: Frontend image builds and can run dev server accessible from host; then set task `[-]`, implement, log artifacts, and mark `[x]`._

- [x] 4. 新增 Docker Compose 编排并定义服务网络、卷与命令
  - File: `docker-compose.yml`
  - 编排 `frontend`、`backend`、`worker`、`redis` 四服务
  - 目的：提供一键启动与标准化运行拓扑
  - _Leverage: `scripts/start-dev.ps1` 现有服务命令、`backend/app/core/config.py` 配置项_
  - _Requirements: 1.1, 1.2, 1.3, 2.2, 2.3, 3.1, 4.1, 4.2, 4.3_
  - _Prompt: Implement the task for spec dockerized-dev-demo-runtime, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Docker Compose Architect | Task: Create docker-compose orchestration for frontend/backend/worker/redis with proper env vars, ports, dependencies, and sqlite named volume | Restrictions: No production-only components (nginx/ingress), no hidden startup fallbacks, keep configuration explicit | _Leverage: Existing local startup script command chain and settings keys | _Requirements: Requirement 1, 2, 3, 4 | Success: `docker compose up --build` starts full chain with shared DB volume and Redis connectivity; then set task `[-]`, implement, log artifacts, and mark `[x]`._

- [x] 5. 调整后端配置默认值与跨域策略以适配容器化
  - File: `backend/app/core/config.py`, `backend/app/main.py`, `.env.example`
  - 使 Redis、CORS 配置可通过环境变量控制并与 compose 对齐
  - 目的：移除对 localhost 假设的硬编码依赖
  - _Leverage: 现有 `Settings` 结构与 `.env.example` 键名_
  - _Requirements: 3.1, 3.2, 3.3, 6.3_
  - _Prompt: Implement the task for spec dockerized-dev-demo-runtime, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Backend Application Engineer | Task: Refactor runtime config defaults and CORS origin loading for container-friendly behavior without breaking local usage | Restrictions: Preserve existing API contract, avoid introducing silent fallback behavior | _Leverage: Existing pydantic settings model and middleware setup | _Requirements: Requirement 3 and 6 | Success: Backend runs correctly with compose-provided env vars and browser can call API under configured origins; then set task `[-]`, implement, log artifacts, and mark `[x]`._

- [x] 6. 修正跨平台测试路径脆弱点并保持本地测试可运行
  - File: `backend/tests/test_mvp_smoke.py`
  - 去除硬编码 Windows 绝对路径清理逻辑，改为与数据库配置一致的路径处理
  - 目的：确保容器/Linux 下测试行为稳定
  - _Leverage: `backend/app/db/session.py` 中数据库路径归一化思路_
  - _Requirements: 6.3, Reliability NFR_
  - _Prompt: Implement the task for spec dockerized-dev-demo-runtime, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Test Reliability Engineer | Task: Remove platform-specific absolute-path assumptions in backend smoke tests while preserving current assertions | Restrictions: Do not weaken test coverage, do not skip failing cases silently | _Leverage: Existing test structure and DB path normalization behavior | _Requirements: Requirement 6 + Reliability NFR | Success: Tests no longer rely on Windows absolute paths and remain deterministic in local and container environments; then set task `[-]`, implement, log artifacts, and mark `[x]`._

- [x] 7. 更新文档与健康检查说明，提供 Docker 运行与验证流程
  - File: `README.md`, `scripts/dev-health-check.ps1`
  - 新增 Docker 启停命令与最小验证步骤，保持本机模式说明并列
  - 目的：保证团队可重复执行迁移后的开发/演示流程
  - _Leverage: 现有 README 结构与健康检查脚本深度检查逻辑_
  - _Requirements: 6.1, 6.2, 5.3_
  - _Prompt: Implement the task for spec dockerized-dev-demo-runtime, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Developer Experience Engineer | Task: Document dockerized dev/demo workflow and align health-check usage so verification steps are clear and repeatable | Restrictions: Keep instructions concise and executable, do not remove local-mode instructions unless obsolete | _Leverage: Existing README sections and dev-health-check command contract | _Requirements: Requirement 5 and 6 | Success: Team can follow README to run, verify, and troubleshoot dockerized flow without ambiguity; then set task `[-]`, implement, log artifacts, and mark `[x]`._

- [x] 8. 执行容器化联调验证并完成收尾
  - File: `.spec-workflow/specs/dockerized-dev-demo-runtime/tasks.md`（状态更新）, 运行时日志/命令输出（不入库）
  - 执行 `docker compose up --build` 与闭环验证，记录结果
  - 目的：确认迁移目标达成并形成可审计实现记录
  - _Leverage: `scripts/dev-health-check.ps1 -Deep`, API 健康接口与前端任务流程_
  - _Requirements: 1.3, 4.2, 6.2_
  - _Prompt: Implement the task for spec dockerized-dev-demo-runtime, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Integration Verification Engineer | Task: Run end-to-end validation on dockerized stack and ensure requirements are satisfied before closing spec tasks | Restrictions: Do not claim success without command evidence, do not bypass failed checks | _Leverage: Compose runtime, existing health-check script, and task flow APIs | _Requirements: Requirement 1, 4, 6 | Success: Full chain verified (frontend/api/worker/redis/sqlite persistence) and task statuses/logs are updated accurately; then set task `[-]`, implement, log artifacts, and mark `[x]`._

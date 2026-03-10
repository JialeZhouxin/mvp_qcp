# Tasks Document

- [x] 1. 新增执行器抽象契约与统一异常模型
  - File: `backend/app/services/execution/base.py`, `backend/app/services/execution/__init__.py`
  - 定义 `ExecutionBackend` 抽象接口（输入 `code + timeout`，输出执行结果对象）
  - 定义执行失败的统一异常类型与错误码字段，供 Worker 持久化错误语义复用
  - 目的：让业务层依赖抽象而不是 Docker 具体实现
  - _Leverage: `backend/app/services/qibo_executor.py` 现有执行入口_
  - _Requirements: 2.1, 2.2, 4.1_
  - _Prompt: Implement the task for spec container-isolated-task-execution, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Backend Architect | Task: Add execution backend abstraction and common exception contract under `app/services/execution` so business logic can stay implementation-agnostic | Restrictions: Do not modify API schemas/routes, do not add fallback behavior, keep interface minimal and explicit | _Leverage: existing qibo executor contract and task status flow | _Requirements: Requirement 2 and 4 | Success: Clear execution abstraction exists with stable method signature and typed failure model; then set task `[-]`, implement, log with `log-implementation`, and mark `[x]`._

- [x] 2. 实现本地执行器（仅测试显式使用）
  - File: `backend/app/services/execution/local_executor.py`
  - 封装现有 `sandbox.run_with_limits` 为 `LocalExecutor` 实现
  - 明确注释其用途为测试/调试显式启用，不作为默认路径
  - 目的：在不依赖 Docker 的单元测试中可验证执行契约
  - _Leverage: `backend/app/services/sandbox.py`_
  - _Requirements: 2.3, 6.1_
  - _Prompt: Implement the task for spec container-isolated-task-execution, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Python Backend Engineer | Task: Implement `LocalExecutor` adapting existing sandbox execution for explicit test usage only | Restrictions: Do not set local executor as default, do not duplicate sandbox logic | _Leverage: existing `run_with_limits` implementation | _Requirements: Requirement 2 and 6 | Success: Local executor conforms to abstraction and can be selected explicitly in tests; then set task `[-]`, implement, log artifacts, and mark `[x]`._

- [x] 3. 实现容器内 runner 入口，标准化输出协议
  - File: `backend/app/services/execution/runner.py`
  - 实现容器入口模块：读取 base64 代码与超时配置，执行后输出单行 JSON payload
  - 明确成功与失败输出格式（`ok/result`、`ok=false/error`），失败时使用非零退出码
  - 目的：建立 DockerExecutor 与容器内执行逻辑的稳定通信协议
  - _Leverage: `backend/app/services/sandbox.py` 现有代码校验与执行能力_
  - _Requirements: 1.1, 1.2, 5.2_
  - _Prompt: Implement the task for spec container-isolated-task-execution, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Runtime Engineer | Task: Create container runner entrypoint that executes provided code and prints a parseable JSON envelope to stdout | Restrictions: No silent success on failure, no mock output, keep protocol deterministic | _Leverage: sandbox validation and execution utility | _Requirements: Requirement 1 and 5 | Success: Runner always emits machine-parseable output and exits with proper code semantics; then set task `[-]`, implement, log artifacts, and mark `[x]`._

- [x] 4. 实现 DockerExecutor（默认执行路径）
  - File: `backend/app/services/execution/docker_executor.py`
  - 基于 Docker API 创建短生命周期容器，注入脚本输入并执行 runner
  - 启用隔离与限制：禁网、只读 rootfs、CPU/内存/PIDs 限制、超时强制回收
  - 采集退出码与日志，映射为统一异常
  - 目的：替代进程内执行，满足容器隔离要求
  - _Leverage: `docker-compose.yml` 现有 backend/worker 运行环境约定_
  - _Requirements: 1.1, 3.1, 3.2, 3.3, 5.1, 5.3_
  - _Prompt: Implement the task for spec container-isolated-task-execution, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Container Platform Engineer | Task: Implement Docker-backed executor with strict lifecycle control and resource/security limits | Restrictions: Do not add local fallback, do not swallow Docker errors, always cleanup containers | _Leverage: existing compose topology and worker task error flow | _Requirements: Requirement 1, 3, 5 | Success: Docker executor runs user code in ephemeral containers with enforced limits and deterministic failure mapping; then set task `[-]`, implement, log artifacts, and mark `[x]`._

- [x] 5. 新增执行器工厂与配置项，并切换 qibo 执行入口
  - File: `backend/app/services/execution/factory.py`, `backend/app/core/config.py`, `backend/app/services/qibo_executor.py`
  - 在配置中新增执行后端选择与容器限制参数，默认 `docker`
  - 通过工厂返回执行器实现，`qibo_executor` 改为依赖抽象执行器
  - 目的：完成“可替换后端 + 默认 Docker”落地
  - _Leverage: `Settings` 现有配置入口、`execute_qibo_script` 现有结果标准化逻辑_
  - _Requirements: 2.1, 2.2, 2.3, 4.1, 4.2, 4.3_
  - _Prompt: Implement the task for spec container-isolated-task-execution, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Backend Application Engineer | Task: Add backend selector/factory and wire qibo executor to use abstraction with docker default | Restrictions: Preserve API response contract, avoid broad refactors outside execution path | _Leverage: current settings model and result normalization path | _Requirements: Requirement 2 and 4 | Success: Execution path is abstraction-driven with docker default and unchanged API contract semantics; then set task `[-]`, implement, log artifacts, and mark `[x]`._

- [x] 6. 更新运行时依赖与编排，提供 worker 访问 Docker 的能力
  - File: `backend/requirements.txt`, `.env.example`, `docker-compose.yml`
  - 增加 Docker 客户端依赖；补充执行器相关环境变量示例
  - 在 compose 中为 worker 增加 Docker socket 挂载与执行镜像配置，避免隐式假设
  - 目的：让容器化开发链路可直接运行新执行路径
  - _Leverage: 当前 dockerized dev/demo 编排文件与环境变量规范_
  - _Requirements: 3.1, 3.2, 6.2, 6.3_
  - _Prompt: Implement the task for spec container-isolated-task-execution, first run spec-workflow-guide to get the workflow guide then implement the task: Role: DevOps Engineer | Task: Update dependencies and compose/env configuration for docker-in-docker-socket execution from worker | Restrictions: Keep MVP scope only, no production-grade orchestrator additions | _Leverage: existing compose services and env naming conventions | _Requirements: Requirement 3 and 6 | Success: Worker has required runtime dependencies and Docker access to run execution containers with explicit config; then set task `[-]`, implement, log artifacts, and mark `[x]`._

- [x] 7. 补充自动化测试覆盖新执行链路关键语义
  - File: `backend/tests/test_execution_backend.py`, `backend/tests/test_qibo_executor.py`
  - 覆盖工厂选择、非法配置报错、执行结果标准化与错误传播
  - 对 DockerExecutor 使用 mock client 验证超时/退出码/日志解析与容器清理行为
  - 目的：确保迁移后关键成功与失败路径可回归验证
  - _Leverage: `backend/tests/test_mvp_smoke.py` 现有测试组织方式_
  - _Requirements: 5.2, 6.1_
  - _Prompt: Implement the task for spec container-isolated-task-execution, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Test Engineer | Task: Add focused unit tests for execution backend factory, docker executor behaviors (via mocks), and qibo result normalization integration points | Restrictions: Do not depend on real Docker daemon in unit tests, do not weaken assertions | _Leverage: existing pytest style and task/error semantics | _Requirements: Requirement 5 and 6 | Success: New tests validate success/failure semantics and are deterministic without external services; then set task `[-]`, implement, log artifacts, and mark `[x]`._

- [x] 8. 更新文档并完成端到端验证与收尾
  - File: `README.md`, `.spec-workflow/specs/container-isolated-task-execution/tasks.md`（状态更新）
  - 新增执行后端配置、Docker 前置条件、常见故障排查说明
  - 运行后端测试与容器化联调，记录验证结果并完成任务状态闭环
  - 目的：确保团队可按文档直接运行并排障
  - _Leverage: `scripts/dev-health-check.ps1`、现有 Docker 启动文档_
  - _Requirements: 5.1, 6.2, 6.3_
  - _Prompt: Implement the task for spec container-isolated-task-execution, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Integration Verification Engineer | Task: Update usage docs for container execution and run verification commands to close the spec reliably | Restrictions: No unverifiable success claims, no hidden caveats in docs | _Leverage: current health-check workflow and dockerized startup docs | _Requirements: Requirement 5 and 6 | Success: Documentation is executable, verification evidence is collected, and task states/logs are accurately finalized; then set task `[-]`, implement, log artifacts, and mark `[x]`._

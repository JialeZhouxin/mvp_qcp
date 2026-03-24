# 架构审查报告（2026-03-24）

## 审查范围

本次审查以最新 `AGENTS.md` 中的 `Production-Ready Guidelines` 为基线，重点核查以下 5 个维度：

1. 跨平台与配置隔离
2. 数据库无关性
3. 无状态架构与存储抽象
4. 容器化优先的服务边界
5. 企业级 Python 代码规范

本轮为静态审查，不包含代码修改，不包含全量测试执行。

## 总体结论

当前仓库在以下方面方向正确：

- 已使用 `pydantic-settings` 管理配置
- 后端数据访问基本通过 `SQLModel` / `SQLAlchemy ORM` 完成
- 部分路径处理已采用 `pathlib`

但整体仍未达到新的生产就绪基线。主要矛盾集中在：

1. 任务系统仍然强绑定 `RQ`
2. 执行架构仍依赖宿主机 Docker Socket
3. 运行脚本和文档仍在强化旧架构
4. 数据库运行时实现仍偏向 SQLite 文件库
5. Python 工程规范执行不一致
6. `StorageService` 抽象尚未落地

## 详细问题清单

### 1. 任务系统仍然实质性绑定 RQ

#### 结论
当前任务提交、队列适配、Worker 启动和依赖管理都围绕 `RQ` 设计，与“按 Celery 无状态 Worker 设计”的新守则正面冲突。

#### 证据
- [backend/app/core/config.py:17](/E:/02_Projects/quantuncloudplatform/mvp_qcp/backend/app/core/config.py#L17)
- [backend/app/worker/rq_worker.py:1](/E:/02_Projects/quantuncloudplatform/mvp_qcp/backend/app/worker/rq_worker.py#L1)
- [backend/app/queue/rq_queue.py:1](/E:/02_Projects/quantuncloudplatform/mvp_qcp/backend/app/queue/rq_queue.py#L1)
- [backend/app/dependencies/task_submit.py:6](/E:/02_Projects/quantuncloudplatform/mvp_qcp/backend/app/dependencies/task_submit.py#L6)
- [backend/requirements.txt:6](/E:/02_Projects/quantuncloudplatform/mvp_qcp/backend/requirements.txt#L6)
- [scripts/start-dev.ps1:170](/E:/02_Projects/quantuncloudplatform/mvp_qcp/scripts/start-dev.ps1#L170)

#### 风险
- 队列抽象不稳定，未来切到 Celery 需要修改配置、依赖、提交链路和启动流程
- 团队会继续围绕 `RQ` 扩展实现，技术债持续累积
- 无法满足新基线中对 Worker 架构的统一要求

#### 建议
- 第一优先级执行 `RQ -> Celery` 迁移
- 保留现有任务提交应用层，但把底层队列实现切换到真正的队列端口抽象
- 清理 `rq_*` 配置项、模块名、启动命令和文档描述

### 2. 执行架构依赖宿主机 Docker Socket

#### 结论
当前 Worker 不是通过网络调用独立执行服务，而是直接操作宿主机 Docker API 创建容器执行任务。这与“服务独立容器化、通过网络或消息系统通信”的守则不一致。

#### 证据
- [docker-compose.yml:57](/E:/02_Projects/quantuncloudplatform/mvp_qcp/docker-compose.yml#L57)
- [docker-compose.yml:60](/E:/02_Projects/quantuncloudplatform/mvp_qcp/docker-compose.yml#L60)
- [backend/app/services/execution/factory.py:12](/E:/02_Projects/quantuncloudplatform/mvp_qcp/backend/app/services/execution/factory.py#L12)
- [backend/app/services/execution/docker_executor.py:49](/E:/02_Projects/quantuncloudplatform/mvp_qcp/backend/app/services/execution/docker_executor.py#L49)
- [backend/app/worker/tasks.py:58](/E:/02_Projects/quantuncloudplatform/mvp_qcp/backend/app/worker/tasks.py#L58)

#### 风险
- Worker 拥有过大的宿主机控制权限，安全边界过弱
- 执行能力与部署环境强耦合，后续拆分成云原生微服务难度高
- 不利于未来多节点扩容和执行资源隔离

#### 建议
- 把执行器抽象为远程执行端口，例如 `ExecutionGateway`
- Worker 只负责调度和状态推进，不直接接触 Docker Socket
- 后续可演进为独立 `execution service`

### 3. 数据库访问方式合规，但运行时仍明显以 SQLite 为中心

#### 结论
当前未发现原生 SQL，ORM 使用方向正确；但运行时实现仍包含 SQLite 专属路径归一化和连接分支，数据库无关性不足。

#### 证据
- [backend/app/core/config.py:14](/E:/02_Projects/quantuncloudplatform/mvp_qcp/backend/app/core/config.py#L14)
- [backend/app/db/session.py:9](/E:/02_Projects/quantuncloudplatform/mvp_qcp/backend/app/db/session.py#L9)
- [backend/app/db/session.py:23](/E:/02_Projects/quantuncloudplatform/mvp_qcp/backend/app/db/session.py#L23)
- [backend/app/db/session.py:32](/E:/02_Projects/quantuncloudplatform/mvp_qcp/backend/app/db/session.py#L32)
- [backend/app/main.py:25](/E:/02_Projects/quantuncloudplatform/mvp_qcp/backend/app/main.py#L25)

#### 风险
- 数据库初始化逻辑和路径管理混入运行时代码，未来迁移 PostgreSQL/MySQL 时改动面大
- 启动时 `create_all` 不适合作为长期演进策略
- 团队容易继续把 SQLite 特殊处理写进更多业务模块

#### 建议
- 保留 SQLite 作为 MVP 默认实现，但把 engine 创建收口为方言无关工厂
- 把 schema 初始化从应用启动迁移到迁移工具链
- 后续采用 Alembic 或等价机制管理 schema 变更

### 4. 运行脚本和文档仍然强化旧架构

#### 结论
脚本、README 和项目文档仍然默认 `RQ`、全栈 Docker 开发链路和旧 Worker 启动方式，这会持续误导团队。

#### 证据
- [scripts/start-dev.ps1:109](/E:/02_Projects/quantuncloudplatform/mvp_qcp/scripts/start-dev.ps1#L109)
- [scripts/start-dev.ps1:133](/E:/02_Projects/quantuncloudplatform/mvp_qcp/scripts/start-dev.ps1#L133)
- [scripts/start-dev.ps1:175](/E:/02_Projects/quantuncloudplatform/mvp_qcp/scripts/start-dev.ps1#L175)
- [scripts/dev-health-check.ps1:62](/E:/02_Projects/quantuncloudplatform/mvp_qcp/scripts/dev-health-check.ps1#L62)
- [README.md:121](/E:/02_Projects/quantuncloudplatform/mvp_qcp/README.md#L121)
- [README.md:370](/E:/02_Projects/quantuncloudplatform/mvp_qcp/README.md#L370)
- [docs/project-status-and-usage.md:162](/E:/02_Projects/quantuncloudplatform/mvp_qcp/docs/project-status-and-usage.md#L162)

#### 风险
- 新成员会按旧文档继续启动 `RQ worker`
- 旧脚本会继续强化不符合目标架构的开发方式
- 规范和代码行为持续分叉，导致架构治理失效

#### 建议
- 第二优先级统一脚本与文档
- 先修脚本，再修 README 与 docs
- 明确区分“当前可运行实现”和“目标生产架构”，避免模糊表述

### 5. 企业级 Python 规范执行不一致

#### 结论
代码库已具备 Type Hints 基础，但主要类、函数、API 路由普遍缺少规范 Docstring，多处异常捕获仍过宽，日志尚未达到结构化标准。

#### 证据
- [backend/app/main.py:25](/E:/02_Projects/quantuncloudplatform/mvp_qcp/backend/app/main.py#L25)
- [backend/app/api/tasks.py:25](/E:/02_Projects/quantuncloudplatform/mvp_qcp/backend/app/api/tasks.py#L25)
- [backend/app/api/projects.py:43](/E:/02_Projects/quantuncloudplatform/mvp_qcp/backend/app/api/projects.py#L43)
- [backend/app/services/readiness_service.py:43](/E:/02_Projects/quantuncloudplatform/mvp_qcp/backend/app/services/readiness_service.py#L43)
- [backend/app/services/execution/runner.py:46](/E:/02_Projects/quantuncloudplatform/mvp_qcp/backend/app/services/execution/runner.py#L46)
- [backend/app/services/sandbox.py:93](/E:/02_Projects/quantuncloudplatform/mvp_qcp/backend/app/services/sandbox.py#L93)
- [backend/app/core/logging.py:4](/E:/02_Projects/quantuncloudplatform/mvp_qcp/backend/app/core/logging.py#L4)

#### 风险
- 可维护性差，团队接手成本高
- 异常边界不清晰，不利于问题定位和审计
- 日志难以被机器检索和聚合分析

#### 建议
- 建立后端质量基线：新改 Python 文件必须补齐 Type Hints、Docstring、精确异常和结构化日志字段
- 优先治理 `api/`、`worker/`、`services/execution/` 三个目录

### 6. StorageService 抽象尚未落地

#### 结论
目前用户代码、任务结果和项目 payload 主要以内联数据库字段形式存在，尚未形成统一文件存储抽象。当前没有立刻报错，但这是明确的能力缺口。

#### 证据
- [backend/app/models/task.py:20](/E:/02_Projects/quantuncloudplatform/mvp_qcp/backend/app/models/task.py#L20)
- [backend/app/models/project.py:15](/E:/02_Projects/quantuncloudplatform/mvp_qcp/backend/app/models/project.py#L15)
- [backend/app/services/project_service.py:42](/E:/02_Projects/quantuncloudplatform/mvp_qcp/backend/app/services/project_service.py#L42)

#### 风险
- 一旦加入文件上传、结果导出、图表落盘等需求，将缺少统一存储边界
- 容易再次出现本地磁盘直写、路径硬编码、跨服务共享文件等反模式

#### 建议
- 在引入真正的文件型业务前先定义 `StorageService` 接口
- 文件元数据入库，文件内容通过存储服务持久化
- 本地文件系统实现只作为一个适配器，不作为默认长期架构真相源

## 符合新守则的部分

### 1. 配置系统方向正确
- [backend/app/core/config.py:1](/E:/02_Projects/quantuncloudplatform/mvp_qcp/backend/app/core/config.py#L1)

已使用 `pydantic-settings`，具备继续收口配置管理的基础。

### 2. 数据访问基本通过 ORM 完成
本轮审查未发现面向生产代码的原生 SQL，数据库访问方向符合要求。

### 3. 部分路径处理已使用 pathlib
- [backend/app/db/session.py:1](/E:/02_Projects/quantuncloudplatform/mvp_qcp/backend/app/db/session.py#L1)

已有正确示例，可作为后续路径治理的统一模式。

## 优先级排序

### P0：必须先处理
1. `RQ -> Celery` 迁移
2. 去除 Worker 对 Docker Socket 的直接依赖

### P1：紧随其后
1. 修正开发脚本和健康检查脚本
2. 修正文档和 README 中的旧架构描述
3. 收口数据库初始化与方言特化逻辑

### P2：持续治理
1. 建立 Python 代码质量基线并补齐 Docstring / 日志 / 异常处理
2. 引入 `StorageService` 抽象
3. 持续减少 SQLite 专属分支和宿主机耦合假设

## 建议的分步优化路线

### 第一步
- 设计并实施 `RQ -> Celery` 最小迁移方案
- 保持现有 HTTP 契约不变
- 保持任务状态模型不变

### 第二步
- 调整开发脚本与健康检查脚本
- 统一 README 和 docs 的运行说明

### 第三步
- 收口执行架构，抽离远程执行网关
- 降低 Worker 对宿主机 Docker 的直接控制

### 第四步
- 推进数据库初始化与迁移治理
- 引入标准迁移工具链

### 第五步
- 推行 Python 质量基线
- 分批补齐高风险模块的 Docstring、异常和日志

### 第六步
- 定义并接入 `StorageService`
- 为未来对象存储切换预留稳定边界

## 审查边界说明

1. 本次将测试代码中使用 SQLite 内存库视为测试策略，不视为生产架构冲突。
2. 本次未修改代码，结论基于静态阅读与搜索结果。
3. 本次未跑全量测试，因此本报告不对当前运行稳定性做完整担保。

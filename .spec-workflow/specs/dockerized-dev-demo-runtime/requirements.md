# Requirements Document

## Introduction

本特性用于将 QCP MVP 从本机多终端手动启动模式，迁移为基于 Docker Compose 的开发/演示容器化运行模式。迁移后，开发者应通过单一入口启动前端、后端 API、Worker 与 Redis，并保持现有任务提交与执行闭环行为不变。该特性明确保留 SQLite，目标是降低 MVP 迭代成本与环境不一致风险，而非构建生产级部署系统。

## Alignment with Product Vision

该特性与当前项目“最小可运行闭环验证”一致，直接服务于“本地优先、一键跑通 API/Worker/Redis/Frontend”的工程目标，并降低新环境复现成本。该范围不引入与 MVP 闭环无关的生产化扩展（如复杂编排、集群扩容、数据库迁移）。

## Requirements

### Requirement 1

**User Story:** 作为开发者，我希望使用单条命令启动完整运行链路，以便快速进入联调或演示状态。

#### Acceptance Criteria

1. WHEN 开发者在仓库根目录执行标准 Docker Compose 启动命令 THEN 系统 SHALL 同时启动 `frontend`、`backend`、`worker`、`redis` 四个服务。
2. IF 任一服务启动失败 THEN 系统 SHALL 在容器日志中输出可定位的错误信息且进程以非成功状态退出。
3. WHEN 所有服务启动完成 AND 健康检查通过 THEN 系统 SHALL 支持从前端登录、提交任务、查询状态到查看结果的完整闭环。

### Requirement 2

**User Story:** 作为开发者，我希望后端 API 与 Worker 使用一致的运行环境，以便减少依赖漂移和重复维护。

#### Acceptance Criteria

1. WHEN 构建后端容器镜像 THEN 系统 SHALL 复用同一份后端依赖与代码基础给 API 与 Worker。
2. IF 启动 API 服务 THEN 系统 SHALL 运行 FastAPI 开发命令并监听外部可访问地址。
3. IF 启动 Worker 服务 THEN 系统 SHALL 运行任务消费进程并连接同一 Redis 与数据库配置。

### Requirement 3

**User Story:** 作为开发者，我希望容器网络配置可控且不依赖 localhost 假设，以便在容器中稳定互联。

#### Acceptance Criteria

1. WHEN 服务运行在 Compose 网络内 THEN 系统 SHALL 通过服务名进行容器间连接（例如 Redis 连接）。
2. IF 未显式提供环境变量 THEN 系统 SHALL 使用可在本机与容器化场景下工作的默认值或文档化示例值。
3. WHEN 配置前端 API 地址与后端 CORS 策略 THEN 系统 SHALL 允许浏览器从开发前端地址访问后端接口。

### Requirement 4

**User Story:** 作为演示人员，我希望容器重建后业务数据可保留，以便避免重复初始化账号与任务数据。

#### Acceptance Criteria

1. WHEN 使用 Docker Compose 启动系统 THEN 系统 SHALL 将 SQLite 数据文件存储在持久化卷中。
2. IF 重建 `backend` 或 `worker` 容器 THEN 系统 SHALL 保留此前 SQLite 数据。
3. WHEN `backend` 与 `worker` 访问数据库 THEN 系统 SHALL 指向同一持久化路径。

### Requirement 5

**User Story:** 作为 MVP 开发者，我希望在容器化环境中保持高迭代效率，以便快速验证改动。

#### Acceptance Criteria

1. WHEN 开发者修改前端或后端源码 THEN 系统 SHALL 支持开发态热更新或等效的快速生效机制。
2. IF 运行容器化开发环境 THEN 系统 SHALL 允许通过宿主机端口访问前端与后端服务。
3. WHEN 开发者查看运行状态 THEN 系统 SHALL 提供可读的服务日志与基础健康检查路径。

### Requirement 6

**User Story:** 作为项目维护者，我希望迁移后文档与验证流程保持一致，以便团队成员可重复执行。

#### Acceptance Criteria

1. WHEN 迁移完成 THEN 系统 SHALL 提供容器化启动、停止、重建与健康检查的文档说明。
2. IF 需要验证迁移结果 THEN 系统 SHALL 提供最小验证步骤覆盖 Redis、API、Frontend 与任务闭环。
3. WHEN 运行既有测试或健康检查脚本 THEN 系统 SHALL 保持可执行，或提供明确的 Docker 等价命令。

## Non-Functional Requirements

### Code Architecture and Modularity
- **Single Responsibility Principle**: 容器编排、后端镜像、前端镜像、运行脚本与文档应按职责拆分，避免单文件承载多类责任。
- **Modular Design**: API 与 Worker 复用后端基础镜像，启动命令分离；前端镜像独立维护。
- **Dependency Management**: 通过镜像层与锁定依赖减少环境漂移；避免新增与目标无关的中间件。
- **Clear Interfaces**: 通过环境变量定义服务间连接契约（Redis、DB 路径、API 基址、CORS）。

### Performance
- 冷启动（首次 `docker compose up --build`）应可在可接受时间内完成，不引入明显阻塞开发的额外步骤。
- 常规增量启动应支持在短时间内进入可联调状态。

### Security
- 不在代码仓库中硬编码密钥或凭据。
- 容器仅暴露开发/演示必需端口。
- 保持现有沙箱执行约束，不新增静默降级路径。

### Reliability
- 服务启动失败应可观测并可复现。
- 容器重建不应导致 SQLite 数据意外丢失。
- 关键依赖（Redis）不可用时应明确失败而非静默成功。

### Usability
- 开发者应能通过少量命令完成启动与验证。
- 文档应明确本机模式与 Docker 模式差异，避免混淆。

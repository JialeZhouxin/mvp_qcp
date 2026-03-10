# Requirements Document

## Introduction

本规格将 QCP MVP 当前“进程内沙箱执行用户代码”的路径替换为“容器隔离执行”，目标是在不改变现有任务提交/查询 API 契约的前提下，显著降低执行隔离风险，并保持 MVP 研发效率。  
本次仅实现方案 B：引入执行器抽象层，默认使用 Docker 容器执行，保留本地执行器仅用于测试场景显式启用。

## Alignment with Product Vision

该能力直接服务于 MVP 核心链路（提交脚本 -> 异步执行 -> 查询结果）中的“执行环节安全性与可控性”，符合项目“最小可运行闭环 + 可审计 + 单体优先”的原则。  
通过容器边界替代进程内 `exec`，可以在不引入复杂平台化改造的情况下提升风险可控度，满足当前阶段“优先换取开发效率”的决策。

## Requirements

### Requirement 1

**User Story:** 作为平台开发者，我希望用户量子脚本在短生命周期容器内执行，以便避免主进程直接执行不可信代码。

#### Acceptance Criteria

1. WHEN Worker 执行用户任务 THEN 系统 SHALL 在容器中完成脚本执行，而不是在 Worker 进程内 `exec` 用户代码。
2. IF 容器执行成功 THEN 系统 SHALL 返回与当前 API 兼容的标准结果结构（`counts`/`probabilities`）。
3. IF 容器执行失败 THEN 系统 SHALL 记录可诊断错误并将任务状态更新为 `FAILURE`。

### Requirement 2

**User Story:** 作为后端维护者，我希望执行链路通过抽象接口解耦，以便后续替换执行后端时不影响业务层逻辑。

#### Acceptance Criteria

1. WHEN 系统初始化执行器 THEN 系统 SHALL 通过统一抽象（例如 `ExecutionBackend`）选择后端实现。
2. IF 运行环境为默认配置 THEN 系统 SHALL 使用 Docker 执行器作为默认实现。
3. IF 测试需要本地执行路径 THEN 系统 SHALL 允许显式切换到本地执行器，且默认不启用。

### Requirement 3

**User Story:** 作为安全负责人，我希望容器执行具备最小权限与资源边界，以便降低越权与滥用风险。

#### Acceptance Criteria

1. WHEN 创建执行容器 THEN 系统 SHALL 禁用网络并启用只读根文件系统。
2. WHEN 创建执行容器 THEN 系统 SHALL 配置 CPU、内存、进程数与超时限制。
3. IF 任务超时或容器异常退出 THEN 系统 SHALL 强制回收容器并返回明确错误信息。

### Requirement 4

**User Story:** 作为 API 使用方，我希望迁移后接口行为保持稳定，以便前端与现有调用方无需改造即可继续使用。

#### Acceptance Criteria

1. WHEN 调用 `/api/tasks/submit`、`/api/tasks/{id}`、`/api/tasks/{id}/result` THEN 系统 SHALL 保持当前请求/响应结构不变。
2. IF 任务成功完成 THEN 系统 SHALL 继续返回 `SUCCESS` 状态与结果字段。
3. IF 执行后端故障 THEN 系统 SHALL 返回清晰错误语义，且不产生“假成功”状态。

### Requirement 5

**User Story:** 作为运维与开发人员，我希望容器执行过程可观测、可排障，以便快速定位执行失败原因。

#### Acceptance Criteria

1. WHEN 容器任务启动与结束 THEN 系统 SHALL 记录任务 ID、容器退出码、执行时长等关键日志。
2. IF 发生执行失败 THEN 系统 SHALL 在任务错误信息中保留可追溯的错误代码与简要原因。
3. WHEN 执行资源回收完成 THEN 系统 SHALL 确保无残留运行容器。

### Requirement 6

**User Story:** 作为项目维护者，我希望该改造在 MVP 约束下可快速落地并可验证，以便控制交付风险。

#### Acceptance Criteria

1. WHEN 完成本规格实现 THEN 系统 SHALL 提供自动化测试覆盖关键成功/失败路径。
2. WHEN 按文档运行开发环境 THEN 系统 SHALL 能在 Docker 化链路中验证容器执行生效。
3. IF 本地环境缺少 Docker 运行条件 THEN 系统 SHALL 明确报错并停止执行，不提供静默降级。

## Non-Functional Requirements

### Code Architecture and Modularity
- **Single Responsibility Principle**: 执行器抽象、Docker 执行实现、任务状态更新逻辑必须职责分离。
- **Modular Design**: 容器执行相关代码集中在独立服务模块，避免散落于 API/Worker 业务代码。
- **Dependency Management**: 业务层依赖抽象接口，不直接依赖 Docker 具体实现细节。
- **Clear Interfaces**: 执行输入/输出采用稳定契约对象，禁止隐式字典协议扩散。

### Performance
- 单任务执行冷启动开销可接受，MVP 阶段优先保证隔离正确性与确定性。
- 在默认超时与资源限制下，不得出现无边界占用主机资源的行为。

### Security
- 不允许进程内直接执行用户脚本。
- 默认执行容器必须禁网、只读根文件系统、限制资源并可强制回收。
- 禁止引入静默 fallback 到不隔离执行路径。

### Reliability
- 失败必须显式失败：任务状态与错误信息一致。
- 容器生命周期管理必须具备“创建-等待-收集-删除”完整闭环。
- 异常场景（超时、镜像缺失、Docker 不可用）必须可诊断。

### Usability
- 对前端和 API 调用方保持无感升级（接口不变）。
- 开发文档需清晰说明运行前置条件、配置项与排障步骤。

# Requirements Document

## Introduction

本规范定义图形化量子工作台（`/tasks/circuit`）的 P0 提交闭环能力：在保留浏览器本地模拟体验的同时，允许用户将当前线路直接提交到后端任务系统执行。目标是补齐“可构建、可模拟、可提交、可追踪”的最小可用链路，避免用户只能停留在本地模拟阶段。

## Alignment with Product Vision

该能力直接支撑当前 MVP 的核心路径：`构建线路 -> 运行任务 -> 查看任务结果`。  
通过在同一界面完成提交与状态回看，降低从图形化编程过渡到云端执行的操作成本，提升演示成功率和真实使用价值。

## Requirements

### Requirement 1: 图形化工作台提供任务提交入口

**User Story:** 作为使用图形化编程的用户，我希望在工作台直接提交当前线路为后端任务，这样我不需要切换到代码模式也能执行任务。

#### Acceptance Criteria

1. WHEN 用户进入 `/tasks/circuit` 页面 THEN 系统 SHALL 显示“提交任务”主操作按钮。
2. WHEN 用户点击“提交任务”并请求进行中 THEN 系统 SHALL 禁用按钮并显示“提交中...”状态文案，防止重复点击。
3. WHEN 提交成功 THEN 系统 SHALL 在当前页面显示 `task_id` 与初始任务状态。
4. IF 提交失败 THEN 系统 SHALL 在当前页面显示明确错误信息，且不清空当前线路与 QASM 编辑内容。

### Requirement 2: 提交前校验与失败可诊断

**User Story:** 作为用户，我希望在提交前就被明确告知线路不可提交的原因，这样我可以先修复问题，减少无效请求。

#### Acceptance Criteria

1. WHEN 当前存在 QASM 解析错误 THEN 系统 SHALL 阻止提交并提示“请先修复 QASM 错误后再提交”。
2. WHEN 当前线路复杂度超限（比特数、深度或门数） THEN 系统 SHALL 阻止提交并展示复杂度超限原因。
3. WHEN 后端返回错误响应 THEN 系统 SHALL 显示结构化错误信息（沿用现有错误转换规则），不允许静默失败。
4. IF 用户修复错误后再次提交 THEN 系统 SHALL 正常发起请求并覆盖上一次提交错误提示。

### Requirement 3: 图形线路到后端执行脚本的确定性转换

**User Story:** 作为用户，我希望图形线路提交后与我当前看到的线路语义一致，这样任务结果是可预期和可解释的。

#### Acceptance Criteria

1. WHEN 用户提交图形线路 THEN 系统 SHALL 将当前 `CircuitModel` 确定性转换为可执行的 Python/Qibo 脚本并调用现有任务提交接口。
2. WHEN 转换单比特门、双比特门、参数门时 THEN 系统 SHALL 使用明确且稳定的门映射规则，不依赖随机顺序。
3. IF 线路中出现当前不支持提交映射的门 THEN 系统 SHALL 阻止提交并提示具体门类型。
4. WHEN 线路未显式包含测量门 THEN 系统 SHALL 在提交脚本中自动补充对全部量子比特的测量，以保证后端可返回概率分布。

### Requirement 4: 提交后状态可见与任务中心衔接

**User Story:** 作为用户，我希望提交后能立刻看到任务状态并进入任务中心查看详情，这样我能确认提交是否生效并继续追踪。

#### Acceptance Criteria

1. WHEN 提交返回成功 THEN 系统 SHALL 在工作台展示当前任务 `task_id` 与状态（至少包含 `PENDING/RUNNING/SUCCESS/FAILURE`）。
2. WHEN 用户点击“刷新状态” THEN 系统 SHALL 查询并更新当前任务状态。
3. WHEN 用户需要查看完整详情 THEN 系统 SHALL 提供跳转至任务中心的快捷入口。
4. IF 当前没有已提交任务 THEN 系统 SHALL 禁用“刷新状态”并给出空态提示。

### Requirement 5: 防重复提交（幂等）

**User Story:** 作为用户，我希望在误触或网络抖动重试时不会创建大量重复任务，这样队列不会被同一条线路污染。

#### Acceptance Criteria

1. WHEN 前端发起提交 THEN 系统 SHALL 为请求附加 `Idempotency-Key`，键值由当前提交内容的稳定哈希生成。
2. WHEN 在幂等窗口内重复提交同一线路内容 THEN 系统 SHALL 复用已有任务并返回同一 `task_id`。
3. WHEN 用户修改线路后再次提交 THEN 系统 SHALL 生成新的 `Idempotency-Key` 并创建新任务。
4. IF 后端返回 `deduplicated=true` THEN 前端 SHALL 向用户明确展示“已复用已有任务”提示。

## Non-Functional Requirements

### Code Architecture and Modularity
- **Single Responsibility Principle**: 提交流程编排、脚本生成、幂等键生成、状态展示分别在独立模块/函数中实现。
- **Modular Design**: 新增逻辑优先放入 `features/circuit` 与 `api` 层，不把业务逻辑堆入页面 JSX。
- **Dependency Management**: 复用现有 `submitTask/getTaskStatus` 与错误处理工具，避免引入新依赖。
- **Clear Interfaces**: 提交函数应使用显式输入（`CircuitModel`、QASM、显示模式）与显式输出（任务响应或错误）。

### Performance
- 提交按钮交互反馈应在 100ms 内可见（进入 loading/disabled 状态）。
- 幂等键计算应为轻量级纯前端计算，不引入可感知页面卡顿。

### Security
- 不在前端持久化保存用户 token、提交代码明文日志或敏感头信息。
- `Idempotency-Key` 不应包含可逆的敏感用户信息。

### Reliability
- 任一提交失败必须显式报错，禁止静默降级或伪成功。
- 提交相关状态更新不得破坏现有本地模拟与草稿恢复能力。

### Usability
- 用户应可在同一页面完成“编辑线路 -> 提交任务 -> 查看任务状态”的闭环。
- 提交相关文案和错误提示统一使用简体中文，且具备可操作性。

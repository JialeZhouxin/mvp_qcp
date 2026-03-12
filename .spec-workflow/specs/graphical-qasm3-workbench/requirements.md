# Requirements Document

## Introduction

本功能将当前“手写 Python 脚本提交执行”的主交互升级为“图形化量子线路构建 + OpenQASM 3 双向编辑 + 浏览器本地实时仿真”的工作台体验。目标是提供与主流量子云平台一致的基础交互能力，降低量子电路构建门槛，同时保留现有代码提交流程作为独立入口。

## Alignment with Product Vision

项目北极星是验证量子云平台最小可运行闭环。本功能通过前端本地化实时反馈强化“可演示、可验证、可理解”的产品价值，在不引入后端执行复杂度的前提下提升可用性和演示效果，符合 MVP 阶段“高价值、低运维增量”的策略。

## Requirements

### Requirement 1: 图形化量子线路构建

**User Story:** As a 量子平台用户, I want 通过拖拽量子门构建电路, so that 我无需先掌握 Python 编程也能快速搭建并验证线路。

#### Acceptance Criteria

1. WHEN 用户进入图形化页面 THEN 系统 SHALL 展示可拖拽门库与量子线路画布。
2. WHEN 用户拖拽门到线路 THEN 系统 SHALL 在目标 qubit/layer 位置创建对应操作并更新电路模型。
3. IF 用户删除或修改门参数 THEN 系统 SHALL 立即更新电路模型并触发后续同步流程。
4. WHEN 用户编辑导致电路超出限制 THEN 系统 SHALL 阻止执行并提示具体超限项与当前值。

### Requirement 2: OpenQASM 3 双向同步编辑

**User Story:** As a 量子平台用户, I want 左侧图形线路与右侧 OpenQASM 3 保持双向同步, so that 我可以在可视化与代码表达之间自由切换。

#### Acceptance Criteria

1. WHEN 左侧电路发生合法变更 THEN 系统 SHALL 生成规范化 OpenQASM 3 并更新右侧编辑器内容。
2. WHEN 用户在右侧输入合法的 OpenQASM 3 子集 THEN 系统 SHALL 解析并回写左侧图形电路。
3. IF 用户输入非法或不支持的 OpenQASM 语句 THEN 系统 SHALL 拒绝同步、保留左侧上一次有效电路，并展示错误位置与原因。
4. WHEN 系统生成 OpenQASM THEN 系统 SHALL 使用 `OPENQASM 3; include "stdgates.inc";` 头部与规范语句格式。

### Requirement 3: 浏览器本地实时仿真与直方图可视化

**User Story:** As a 量子平台用户, I want 每次编辑后立即看到基态概率分布, so that 我能实时理解量子门对结果的影响。

#### Acceptance Criteria

1. WHEN 电路处于合法状态并发生变更 THEN 系统 SHALL 在浏览器本地触发仿真并返回概率分布。
2. WHEN 仿真返回概率分布 THEN 系统 SHALL 以直方图展示 `2^n` 基态分布中的可见态。
3. WHEN 绘图前处理概率 THEN 系统 SHALL 按 `epsilon = 2^-(n+2)` 过滤 `p <= epsilon` 的态并显示隐藏态数量。
4. IF 仿真失败或超时 THEN 系统 SHALL 显式显示错误信息且不得伪造成功结果。

### Requirement 4: 复杂度与性能保护

**User Story:** As a 平台维护者, I want 对本地仿真复杂度设置硬限制, so that 浏览器交互保持可用且不会被高复杂度电路拖垮。

#### Acceptance Criteria

1. WHEN 用户设置 qubit 数 THEN 系统 SHALL 保证 `qubits <= 10`。
2. WHEN 用户编辑电路深度 THEN 系统 SHALL 保证 `depth <= 200`。
3. WHEN 用户叠加门操作 THEN 系统 SHALL 保证 `total_gates <= 1000`。
4. IF 任一限制被触发 THEN 系统 SHALL 阻止仿真并返回结构化超限错误。

### Requirement 5: 兼容现有代码模式入口

**User Story:** As a 现有用户, I want 保留代码提交流程, so that 我可以继续沿用当前脚本提交方式。

#### Acceptance Criteria

1. WHEN 新图形化功能上线 THEN 系统 SHALL 提供图形化入口与代码入口并存。
2. WHEN 用户访问代码入口 THEN 系统 SHALL 保持现有鉴权与提交流程行为不变。
3. IF 用户未登录 THEN 系统 SHALL 继续沿用现有受保护路由策略并重定向到登录页。

## Non-Functional Requirements

### Code Architecture and Modularity
- **Single Responsibility Principle**: 电路模型、QASM 转换、仿真调度、UI 组件分别隔离实现。
- **Modular Design**: 图形编辑、代码编辑、仿真与图表模块独立可替换。
- **Dependency Management**: 优先复用现有前端依赖，新增依赖需限定在图形化能力必需范围。
- **Clear Interfaces**: 使用明确类型契约连接 `CircuitModel`、`QasmBridge`、`SimulationWorker`。

### Performance
- 图形化编辑应保持可交互（避免主线程被仿真阻塞）。
- 仿真计算需在 Web Worker 中执行。
- 编辑触发应具备防抖和旧任务取消机制，防止结果乱序覆盖。

### Security
- 不引入执行任意用户脚本能力到主线程。
- 所有外部输入（QASM 文本）必须先解析校验再进入模型。
- 不在前端代码中写入凭证信息。

### Reliability
- 禁止静默降级与伪成功路径。
- 非法 QASM、超限、仿真错误均需显式错误码/消息。
- 失败时保留最近一次成功结果供用户对照。

### Usability
- 新手可仅依赖拖拽完成电路构建。
- 专业用户可通过 QASM 编辑快速精确修改。
- 图表必须显示隐藏态统计，确保结果可解释。


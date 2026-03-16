# Requirements Document

## Introduction

本需求用于完成图形化工作台的 P0 体验优化，聚焦四个问题：

1. 主交互流不连贯（直方图距离拖拽区过远）。
2. 提交区位置不符合操作顺序。
3. 缺少量子比特增减控件。
4. 将“本地模拟能力上限”错误地绑定到了“可编辑/可提交能力”。

目标是在不改变后端任务协议的前提下，优化前端编排与交互规则：允许编辑和提交 `>10` 量子比特的电路，同时在本地实时模拟阶段显式降级并给出可理解反馈。

## Alignment with Product Vision

该优化直接服务于 MVP 的核心链路“图形化编辑 -> 任务提交 -> 状态跟踪 -> 结果查看”：

- 通过布局重排减少操作跳跃，提升从编辑到观察再到提交的闭环效率。
- 通过 qubit 规则解耦，避免对用户产生“平台不支持大电路”的误导。
- 通过明确的降级提示保持失败可见性，符合 Debug-First 原则，不使用静默 fallback。

## Requirements

### Requirement 1

**User Story:** 作为图形化工作台用户，我希望结果直方图紧邻编辑区下方展示，以便在修改电路后立即看到可视化反馈。

#### Acceptance Criteria

1. WHEN 用户进入 `/tasks/circuit` THEN 系统 SHALL 将结果面板渲染在拖拽电路主区域的正下方。
2. WHEN 用户修改电路并触发重算 THEN 系统 SHALL 在该相邻结果区域更新状态与结果，而不是要求用户滚动到页面底部。
3. IF 当前无可展示结果 THEN 系统 SHALL 在该结果区域展示明确的状态文案（如运行中/暂无结果/不可模拟原因）。

### Requirement 2

**User Story:** 作为图形化工作台用户，我希望“提交任务”按钮位于结果区下方，以便先观察本地结果再执行提交。

#### Acceptance Criteria

1. WHEN 页面渲染完成 THEN 系统 SHALL 将提交面板放置在结果面板之后的下一块区域。
2. WHEN 用户完成编辑后 THEN 系统 SHALL 保持“编辑 -> 结果 -> 提交”的纵向顺序一致，不因刷新或局部重渲染打乱位置。
3. IF 提交状态变化（提交中/成功/失败） THEN 系统 SHALL 在该提交区域就地反馈，不跳转布局位置。

### Requirement 3

**User Story:** 作为图形化工作台用户，我希望可以通过显式控件增减量子比特数量，以便快速构造不同规模电路。

#### Acceptance Criteria

1. WHEN 用户点击 `+Qubit` THEN 系统 SHALL 在当前电路上增加 1 个量子比特并更新画布行数。
2. WHEN 用户点击 `-Qubit` THEN 系统 SHALL 减少 1 个量子比特并更新画布行数。
3. IF 减少量子比特会导致已有门操作引用越界 qubit THEN 系统 SHALL 阻止该操作并给出明确提示。
4. IF qubit 数量达到系统定义上限 THEN 系统 SHALL 禁用继续增加并给出边界提示。
5. IF qubit 数量达到系统定义下限 THEN 系统 SHALL 禁用继续减少并给出边界提示。

### Requirement 4

**User Story:** 作为图形化工作台用户，我希望即使电路量子比特数大于 10，仍然可以继续编辑和提交任务，只在本地实时模拟阶段收到限制提示。

#### Acceptance Criteria

1. WHEN `numQubits > 10` THEN 系统 SHALL 允许继续拖拽编辑、QASM 编辑与任务提交。
2. WHEN `numQubits > 10` THEN 系统 SHALL 禁用浏览器本地实时模拟，并在结果区域显示“量子比特过多，不支持实时模拟，但可提交后端执行”的显式提示。
3. WHEN `numQubits <= 10` THEN 系统 SHALL 恢复本地实时模拟并正常渲染直方图。
4. IF 用户在 `numQubits > 10` 条件下提交任务 THEN 系统 SHALL 按现有提交流程发起后端请求，不因本地模拟不可用而阻塞提交。

## Non-Functional Requirements

### Code Architecture and Modularity
- **Single Responsibility Principle**: 布局编排、qubit 调整、模拟门禁分别放在独立模块/函数，不在单函数混杂规则。
- **Modular Design**: 新增的 qubit 控件逻辑应复用现有 `CircuitModel` 变更路径，避免分叉状态。
- **Dependency Management**: 不引入新的全局状态管理库。
- **Clear Interfaces**: 明确区分 `simulateGuard` 与 `submitGuard` 规则边界。

### Performance
- qubit 增减与布局调整后，页面重渲染应保持在现有可接受范围内，不引入明显卡顿。
- 在 `numQubits > 10` 时应跳过本地模拟计算，避免无效 CPU 开销。

### Security
- 不新增敏感数据存储。
- 不改变认证与任务提交鉴权链路。

### Reliability
- 不允许静默失败：越界、禁止减少、禁用模拟都必须有可见提示。
- 现有提交流程与任务状态刷新能力在该改动后必须保持可用。

### Usability
- 用户可在 3 秒内理解当前链路顺序（编辑、看结果、提交）。
- 对 `>10` 限制的文案必须清楚区分“本地模拟限制”与“后端提交能力”。

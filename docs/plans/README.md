# 方案与实施记录

`docs/plans/` 用来保存设计方案、实施计划和阶段性拆解文档。

这里的内容有两个用途：

- 还原某个功能当时是怎么设计和拆解的
- 理解实现过程中的权衡、范围和阶段目标

这里的内容不等于当前实现事实源。
判断“系统现在到底是什么”，请优先回到 [../README.md](../README.md) 中列出的当前事实文档。

## 阅读建议

### 想看当前系统怎么工作

不要先看本目录。
先看：

1. [../architecture.md](../architecture.md)
2. [../usage-guide.md](../usage-guide.md)
3. [../docker-deployment.md](../docker-deployment.md)
4. [../data-flow.md](../data-flow.md)

### 想了解某个功能当时如何设计

按主题查看对应方案文档即可。

## 当前目录内容

### 图形化量子编程工作台

- [2026-03-12-graphical-qasm3-workbench-design.md](2026-03-12-graphical-qasm3-workbench-design.md)
  - 图形化量子编程工作台设计文档
- [2026-03-12-graphical-qasm3-workbench.md](2026-03-12-graphical-qasm3-workbench.md)
  - 图形化量子编程工作台实施计划与任务拆解

### 任务域导航与信息架构

- [2026-03-16-task-navigation-ia-design.md](2026-03-16-task-navigation-ia-design.md)
  - 任务域导航信息架构设计
- [2026-03-16-task-navigation-ia.md](2026-03-16-task-navigation-ia.md)
  - 导航 IA 的实施拆解

### 电路画布重构

- [2026-03-23-circuit-canvas-refactor.md](2026-03-23-circuit-canvas-refactor.md)
  - 电路画布重构计划

## 使用约定

- 带 `-design` 的文档更偏方案设计与权衡
- 不带 `-design` 的文档更偏实施步骤、任务拆解和验收路径
- 如果方案文档与当前代码实现不一致，以当前代码和事实文档为准

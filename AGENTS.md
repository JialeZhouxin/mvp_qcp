# AGENTS.md - Quantum Cloud Platform MVP V1.0

## 项目定位
- 项目目标：构建本土化、轻量级量子计算云平台（Quantum as a Service）。
- 商业定位：面向 B 端客户展示技术能力并承接 PoC 咨询。
- 设计原则：场景化 API 封装 + 经典与量子混合任务调度 + 本土化体验。

## MVP V1.0 强约束（必须）
- 仅实现最小技术闭环，不做超范围功能。
- 必须具备：
  1. 轻量级鉴权（注册/登录 + API Token）。
  2. 在线代码提交（Web IDE，支持 Qibo Python 脚本）。
  3. 异步任务调度（提交即入队，返回 Task ID）。
  4. Worker 执行（受限环境调用本地 Qibo 模拟后端执行）。
  5. 结果轮询与可视化（前端轮询状态 + 概率直方图）。

## 明确不做（MVP 阶段）
- 拖拽式量子电路设计器。
- 复杂计费系统。
- RBAC 权限体系。
- 任何与最小闭环无关的扩展功能。

## 技术栈约束（必须遵守）
- 前端：React + Vite。
- UI：Tailwind CSS（或 Ant Design，默认 Tailwind）。
- 在线编辑器：Monaco Editor（React 封装）。
- 可视化：Apache ECharts。
- 后端：FastAPI。
- 数据层：SQLite + SQLModel（或 SQLAlchemy，默认 SQLModel）。
- 队列：Redis + Celery。
- 量子引擎：Qibo。

## 工程原则
- KISS：保持实现简单直接。
- YAGNI：只实现当前明确需求。
- DRY：避免重复逻辑。
- SOLID：在可维护性和交付速度之间平衡，优先单一职责和依赖抽象。

## 单人开发执行准则
- 优先交付端到端可演示链路，再局部优化。
- 默认选择低运维复杂度方案（本地 SQLite、单 Redis、单 Worker 起步）。
- 所有新增模块需回答：是否支撑上述 5 条 MVP 核心业务流。
- 若不支撑，拒绝进入当前迭代。


# Project Memory - Quantum Computing Cloud Platform MVP V1.0

## Last Updated
- 2026-03-03

## North Star
- 以最小可运行闭环验证“量子云平台”技术可行性，并支撑内部汇报与 PoC 业务承接。

## Current Scope (Locked)
- 轻量鉴权：注册/登录 + Token。
- Web IDE 提交 Python 量子脚本。
- FastAPI 接入层异步入队，立即返回 Task ID。
- Celery Worker 从 Redis 拉取任务并调用 Qibo 模拟后端执行。
- 前端轮询任务状态并渲染测量概率直方图。

## Explicitly Out of Scope (MVP)
- 拖拽式电路设计器。
- 复杂计费与结算。
- RBAC 与企业级权限分层。
- 与核心闭环无关的平台化能力。

## Mandatory Stack
- Frontend: React + Vite + Tailwind CSS + Monaco Editor + ECharts
- Backend: FastAPI + SQLite + SQLModel
- Queue: Redis + Celery
- Quantum Runtime: Qibo

## Architectural Bias for Solo Development
- 单体优先：前后端分离部署形态，但后端保持单体服务。
- 本地优先：先保证开发机可一键跑通（API/Worker/Redis/Frontend）。
- 可观测最小集：任务状态、错误信息、执行时长必须可追踪。
- 安全最小集：仅允许受控脚本执行路径，禁止任意系统调用。

## Decision Rules
- 新需求进入前必须验证是否直接服务于 MVP 五段链路。
- 无法在 1-2 天内落地验证的需求，默认延期。
- 优先减少依赖和组件数量，避免运维复杂度增长。


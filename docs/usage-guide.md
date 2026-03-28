# 使用说明

## 摘要

本说明面向内部研发团队，覆盖当前仓库最常用的操作路径：

- 启动系统
- 登录与获取任务界面
- 使用图形化量子工作台
- 提交代码任务
- 查看任务中心与项目

如果你只关心 Docker 启动与排障，请看 [docker-deployment.md](docker-deployment.md)。

## 环境准备

### Docker 模式

需要：

- Docker Desktop / Docker Engine
- 可用的 `docker compose`

### 宿主机开发模式

需要：

- Python 3.11 + `uv`
- Node.js + npm
- 可用的 Redis

宿主机模式使用：

```powershell
powershell -ExecutionPolicy Bypass -File "scripts/start-dev.ps1"
```

该模式会让 API/worker 走 `EXECUTION_BACKEND=local`，主要用于本地开发联调。

## 登录与入口

系统启动后，主要入口如下：

- 前端：`http://127.0.0.1:5173`
- OpenAPI：`http://127.0.0.1:8000/docs`

前端主要页面：

- `/login`
- `/register`
- `/tasks/circuit`
- `/tasks/code`
- `/tasks/center`

推荐初次体验流程：

1. 注册账号
2. 登录
3. 先进入 `/tasks/circuit` 验证图形化工作台
4. 再进入 `/tasks/code` 提交简单代码任务
5. 最后到 `/tasks/center` 查看历史和详情

## 图形化工作台

### 当前能力

工作台支持：

- 从门库拖拽量子门到画布
- 通过 OpenQASM 与电路双向编辑
- 浏览器内本地模拟
- 时间步滑块预览
- 结果区直方图与 Bloch 球
- 项目保存与加载

### 提交流程

图形化工作台提交时：

- 前端不会提交 Python 代码
- 后端接收结构化电路 payload
- 任务进入 `qcp-circuit` 队列
- 由 `circuit-worker` 的热进程执行

如果提交时看到：

- `CIRCUIT_EXECUTOR_UNAVAILABLE`

通常说明：

- `circuit-worker` 未启动
- 或热执行器尚未完成预热

## 代码任务页

代码任务页面向兼容路径，提交的是 Python 脚本。

典型最小脚本：

```python
def main():
    return {"counts": {"00": 2, "11": 2}}
```

代码任务会走：

- `POST /api/tasks/submit`
- `worker`
- `execution-service`
- Docker 隔离执行

因此相比图形电路任务，它的固定开销更大。

## 任务中心

任务中心用于查看：

- 任务历史
- 状态筛选
- 详情与结果
- SSE 状态流

当前任务终态包括：

- `SUCCESS`
- `FAILURE`
- `TIMEOUT`
- `RETRY_EXHAUSTED`

## 项目保存

当前支持保存项目。

相关能力：

- 保存当前工作台电路项目
- 列出项目
- 读取项目内容

项目保存接口在后端由 `projects` 路由承载，使用 Bearer Token 鉴权。

## 常用脚本

### 启动宿主机联调

```powershell
powershell -ExecutionPolicy Bypass -File "scripts/start-dev.ps1"
```

### 后端测试

```powershell
powershell -ExecutionPolicy Bypass -File "scripts/run-backend-tests.ps1"
```

### 健康检查

```powershell
powershell -ExecutionPolicy Bypass -File "scripts/dev-health-check.ps1"
```

Docker 模式：

```powershell
powershell -ExecutionPolicy Bypass -File "scripts/dev-health-check.ps1" -Docker
```

深度检查：

```powershell
powershell -ExecutionPolicy Bypass -File "scripts/dev-health-check.ps1" -Docker -Deep
```

## 常见问题

### 1. 图形电路任务返回 503

优先检查：

- `circuit-worker` 是否运行
- Redis 中是否有 `qcp:circuit:heartbeat`
- `circuit-worker` 启动日志里是否出现 warmup timeout

### 2. 前端新增依赖后仍报模块找不到

常见原因：

- `frontend-node-modules` 命名卷仍挂着旧依赖

处理方式：

- 停掉前端容器
- 删除前端 `node_modules` 对应 volume
- 重建前端容器

### 3. 任务长时间停在 `RUNNING`

当前仓库仍可能存在历史遗留的僵尸任务状态；这种情况需要结合 worker 日志和任务创建时间判断，不应默认视为正在执行。

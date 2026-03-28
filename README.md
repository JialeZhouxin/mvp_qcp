# Quantum Cloud Platform MVP

量子计算云平台 MVP，当前已经具备以下闭环能力：

- 用户注册、登录、Bearer Token 鉴权
- 图形化量子电路工作台：门库、画布、OpenQASM、时间步预览、本地模拟
- 代码任务提交与图形电路任务提交
- Redis + Celery 异步任务执行
- PostgreSQL 多租户数据存储
- 执行服务隔离与图形电路热执行器
- 任务中心、项目保存与结果可视化

## 当前运行事实

- 前端：React + Vite
- 后端：FastAPI
- 数据库：PostgreSQL + Alembic
- 队列：Redis + Celery
- 代码任务执行：`worker -> execution-service -> Docker`
- 图形电路执行：`circuit-worker -> 常驻 qibo 热进程`
- 默认容器编排：`docker-compose.yml`

当前仓库的 Docker 栈仍然偏开发模式：

- `backend` 与 `execution-service` 使用 `uvicorn --reload`
- `frontend` 使用 `npm run dev`

因此它是**当前可运行的单机 Compose 开发/演示栈**，不是完成生产硬化的部署方案。

## 快速入口

### 1. Docker Compose 启动

```powershell
cd "E:/02_Projects/quantuncloudplatform/mvp_qcp"
docker compose up --build -d
```

### 2. 健康检查

```powershell
powershell -ExecutionPolicy Bypass -File "scripts/dev-health-check.ps1" -Docker
```

深度检查：

```powershell
powershell -ExecutionPolicy Bypass -File "scripts/dev-health-check.ps1" -Docker -Deep
```

### 3. 主要访问入口

- 前端：`http://127.0.0.1:5173`
- OpenAPI：`http://127.0.0.1:8000/docs`
- 健康检查：`http://127.0.0.1:8000/api/health`

## 文档入口

详细文档请从 [docs/README.md](docs/README.md) 开始。

# Docker 部署文档

## 摘要

本文件只描述**当前仓库真实可运行**的单机 Docker Compose 栈：

- 文件：`docker-compose.yml`
- 用途：本地开发、内部联调、PoC 演示
- 不包含：未来 `docker-compose.prod.yml`、Kubernetes、生产高可用拓扑

## 当前服务清单

`docker-compose.yml` 当前包含以下服务：

- `postgres`
- `redis`
- `backend`
- `worker`
- `circuit-worker`
- `execution-service`
- `frontend`

## 关键运行事实

### 数据与队列

- PostgreSQL：主业务数据库
- Redis：Celery broker / backend

### 执行路径

- `worker`
  - 消费 `qcp-default`
  - 处理代码任务
- `circuit-worker`
  - 消费 `qcp-circuit`
  - 处理图形电路任务
- `execution-service`
  - 代码任务执行服务
  - 当前配置为 Docker 执行后端

### 当前限制

当前 Compose 栈仍带开发特征：

- `backend` 使用 `uvicorn --reload`
- `execution-service` 使用 `uvicorn --reload`
- `frontend` 使用 `npm run dev`
- 并非生产 hardened 配置

## 启动步骤

### 1. 启动全部服务

```powershell
cd "E:/02_Projects/quantuncloudplatform/mvp_qcp"
docker compose up --build -d
```

### 2. 查看服务状态

```powershell
docker compose ps
```

### 3. 执行健康检查

```powershell
powershell -ExecutionPolicy Bypass -File "scripts/dev-health-check.ps1" -Docker
```

### 4. 执行深度检查

```powershell
powershell -ExecutionPolicy Bypass -File "scripts/dev-health-check.ps1" -Docker -Deep
```

深度检查会验证：

- 注册
- 登录
- 代码任务提交
- 任务到达终态
- 结果接口可读

## 主要访问地址

- 前端：`http://127.0.0.1:5173`
- OpenAPI：`http://127.0.0.1:8000/docs`
- 健康检查：`http://127.0.0.1:8000/api/health`

## 数据持久化

当前 Compose 文件中使用的关键 volume：

- `postgres-data`
- `frontend-node-modules`

说明：

- `postgres-data` 保存数据库数据
- `frontend-node-modules` 用于前端容器依赖缓存

## 常用运维命令

### 停止服务

```powershell
docker compose down
```

### 停止并删除 volume

```powershell
docker compose down -v
```

这个操作会删除数据库 volume，执行前必须确认。

### 查看日志

```powershell
docker compose logs backend --tail=200
docker compose logs worker --tail=200
docker compose logs circuit-worker --tail=200
docker compose logs execution-service --tail=200
docker compose logs frontend --tail=200
```

## 常见问题

### 1. 图形电路提交返回 `CIRCUIT_EXECUTOR_UNAVAILABLE`

说明 `backend` 在提交前没有检测到 `circuit-worker` 心跳。

优先排查：

```powershell
docker compose ps
docker compose logs circuit-worker --tail=200
docker compose exec redis redis-cli EXISTS qcp:circuit:heartbeat
```

如果心跳不存在，常见原因是：

- `circuit-worker` 没启动
- 热执行器预热超时

### 2. 前端新增依赖后容器里仍然找不到模块

常见原因是旧的 `frontend-node-modules` 卷还在复用。

典型处理顺序：

1. 停掉前端相关容器
2. 删除前端 `node_modules` 对应 volume
3. `docker compose up -d --build frontend`

### 3. 某些容器 `docker compose down` 后仍卡住

这更像 Docker 运行时状态问题，而不是应用逻辑问题。

处理顺序：

1. `docker ps -a --filter "name=mvp_qcp"`
2. `docker rm -f <卡住容器>`
3. 再执行局部重建

### 4. 代码任务耗时明显高于电路任务

这是当前架构设计结果：

- 代码任务走 `execution-service -> Docker`
- 图形电路任务走 `circuit-worker` 热进程

二者不应按同一性能预期理解。

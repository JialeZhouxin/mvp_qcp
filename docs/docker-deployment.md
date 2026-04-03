# Docker 部署与运维说明

## 适用范围

本文档只覆盖当前仓库真实存在的 `docker-compose.yml` 开发/演示栈，不覆盖生产部署。

如果你要在中国网络环境或受限网络环境运行，请同时阅读 [china-deployment-playbook.md](china-deployment-playbook.md)。

## 当前 Compose 服务

当前 Compose 栈包含：

- `postgres`
- `redis`
- `backend`
- `worker`
- `circuit-worker`
- `hybrid-worker`
- `execution-service`
- `frontend`

## 服务角色

- `backend`
  - FastAPI 主 API
  - 开发态使用 `uvicorn --reload`
- `worker`
  - 消费 `qcp-default`
  - 负责代码任务
- `circuit-worker`
  - 消费 `qcp-circuit`
  - 负责图形化量子电路任务
- `hybrid-worker`
  - 消费 `qcp-hybrid`
  - 负责混合算法任务（当前为 VQE）
- `execution-service`
  - 只服务代码任务
  - 开发态使用 `uvicorn --reload`
- `frontend`
  - Vite 开发服务

## 重要运行事实

- `backend` 和 `execution-service` 会热更新
- `worker`、`circuit-worker` 和 `hybrid-worker` 不会热更新
- 只要后端任务执行逻辑、量子门映射、payload 校验规则发生变化，就必须重启对应 worker

这条规则对图形化量子电路尤其重要：前端门库更新不代表后端 worker 已经加载新门支持。

## 启动

```powershell
cd "E:/02_Projects/quantuncloudplatform/mvp_qcp"
docker compose up --build -d
```

## 基础验证

### 查看服务状态

```powershell
docker compose ps
```

### 运行健康检查

```powershell
powershell -ExecutionPolicy Bypass -File "scripts/dev-health-check.ps1" -Docker
```

### 运行深度检查

```powershell
powershell -ExecutionPolicy Bypass -File "scripts/dev-health-check.ps1" -Docker -Deep
```

## 常用地址

- 前端：`http://127.0.0.1:5173`
- OpenAPI：`http://127.0.0.1:8000/docs`
- 后端健康检查：`http://127.0.0.1:8000/api/health`

## 重启规则

### 什么时候只需要重启 `backend`

- API 路由层逻辑变化，但不涉及 Celery worker 执行路径

### 什么时候需要重启 `worker`

- 代码任务执行逻辑变化
- `execution-service` 调用方式变化
- 代码任务相关的 Celery 行为变化

### 什么时候需要重启 `circuit-worker`

- 图形化电路 payload 校验变化
- 量子门支持集合变化
- Qibo 门映射变化
- 电路热执行器逻辑变化

典型命令：

```powershell
docker compose restart circuit-worker
```

### 什么时候需要重启 `hybrid-worker`

- 混合算法执行逻辑变化（如 VQE 迭代策略）
- 混合任务 payload 校验变化
- 混合任务流事件模型变化

典型命令：

```powershell
docker compose restart hybrid-worker
```

## 日志查看

```powershell
docker compose logs backend --tail=200
docker compose logs worker --tail=200
docker compose logs circuit-worker --tail=200
docker compose logs hybrid-worker --tail=200
docker compose logs execution-service --tail=200
docker compose logs frontend --tail=200
```

## 常见排障

### 1. 图形化任务提交返回 `CIRCUIT_EXECUTOR_UNAVAILABLE`

优先检查：

```powershell
docker compose ps
docker compose logs circuit-worker --tail=200
docker compose exec redis redis-cli EXISTS qcp:circuit:heartbeat
```

重点关注：

- `circuit-worker` 是否存活
- 心跳键是否存在
- 热执行器是否完成预热

### 2. 新增门前端已出现，但提交任务报 `unsupported gate`

这通常表示：

- 前端已经更新
- 但 `circuit-worker` 还在运行旧代码

处理方式：

```powershell
docker compose restart circuit-worker
docker compose logs circuit-worker --tail=200
```

### 3. 任务中心看到 `RETRY_EXHAUSTED`

这不是根因，而是最终状态。
需要继续查 worker 日志中的真实异常，例如：

- `unsupported gate`
- 执行器初始化失败
- Qibo 执行异常

### 4. 前端热更新异常或依赖状态错乱

优先检查 `frontend-node-modules` volume 是否异常。
必要时可重建前端容器：

```powershell
docker compose up -d --build frontend
```

### 5. 混合任务长期停留 `PENDING`

优先检查：

```powershell
docker compose ps
docker compose logs hybrid-worker --tail=200
docker compose exec worker celery -A app.worker.celery_app:celery_app inspect active_queues --timeout=10
docker compose exec redis redis-cli LLEN qcp-hybrid
```

重点关注：

- `hybrid-worker` 是否在运行
- Celery active queues 是否包含 `qcp-hybrid`
- `qcp-hybrid` 队列长度是否持续增长

## 停止与清理

### 停止服务

```powershell
docker compose down
```

### 连同 volume 一起删除

```powershell
docker compose down -v
```

注意：这会清除数据库卷和前端依赖卷，属于破坏性操作，执行前应确认影响范围。

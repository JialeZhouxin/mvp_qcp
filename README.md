# Quantum Cloud Platform MVP (Qibo)

## 当前范围
- 已实现：鉴权、任务提交、Redis/Celery 异步执行、Qibo 受限执行、前端 Monaco + ECharts 展示。
- MVP 目标：跑通最小技术闭环（鉴权 -> 提交 -> 入队 -> 执行 -> 结果）。

## 本机运行（无 Docker）

### 1. 准备后端环境（uv）
```powershell
cd "backend"
uv venv
uv pip install -r requirements.txt
```

### 2. 启动 API
```powershell
cd "backend"
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 3. 启动 Worker
```powershell
cd "backend"
uv run celery -A app.worker.celery_app:celery_app worker --loglevel=info --pool=solo
```

### 4. 启动前端
```powershell
cd "frontend"
npm install
npm run dev
```

### 5. 一键启动（可选）
```powershell
powershell -ExecutionPolicy Bypass -File "scripts/start-dev.ps1"
```

## 健康检查
- `GET http://127.0.0.1:8000/api/health`

## 最小验收与测试

### 后端 Smoke 测试
```powershell
cd "backend"
uv run pytest -q
```

### 演示清单
- 见 `scripts/demo-checklist.md`

### 验收标准
1. 可注册/登录并获取 token。
2. 可提交任务并返回 Task ID。
3. 可查询任务状态（PENDING/RUNNING/SUCCESS/FAILURE）。
4. SUCCESS 时前端显示概率直方图与 JSON 结果。

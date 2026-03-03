# Quantum Cloud Platform MVP (Qibo)

## 当前范围
- 本阶段已完成：项目骨架、FastAPI 基础层、SQLite + SQLModel 数据层（User/Task）
- 下一阶段：鉴权、任务入队、Qibo 执行与轮询可视化

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

### 3. 启动 Worker（当前为占位，后续步骤补全）
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

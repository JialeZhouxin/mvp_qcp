# 演示脚本（MVP）

## 0. 前置检查
1. 本机 Redis 已启动，端口 `6379` 可连接。
2. Python 3.11，Node.js 18+ 已安装。

## 1. 启动后端与前端
```powershell
powershell -ExecutionPolicy Bypass -File "scripts/start-dev.ps1"
```

## 2. 演示路径
1. 浏览器打开 `http://127.0.0.1:5173`。
2. 注册一个新用户并登录。
3. 在任务页粘贴/编辑 Python 脚本（Qibo 格式，返回 `counts`）。
4. 点击“提交任务”。
5. 观察状态从 `PENDING/RUNNING` 到 `SUCCESS/FAILURE`。
6. 成功后查看概率柱状图与原始 JSON 结果。

## 3. API 快速验证（可选）
- 健康检查：`GET http://127.0.0.1:8000/api/health`
- 登录获取 token：`POST /api/auth/login`
- 提交任务：`POST /api/tasks/submit`

## 4. 最小验收标准
1. 可注册/登录并获取 token。
2. 可提交任务并拿到 Task ID。
3. 可查询任务状态。
4. 成功时可查看结果 JSON 与概率图。


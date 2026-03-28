# 数据流说明

## 摘要

当前仓库存在两条主要任务链路：

- 任意 Python 代码任务
- 图形化量子电路任务

此外还有两条辅助链路：

- 浏览器本地模拟预览
- 项目保存与读取

本文件只描述当前真实实现，不描述历史实现和未来目标态。

## 1. 认证链路

```text
Frontend
  -> POST /api/auth/register
  -> POST /api/auth/login
  -> access_token
  -> Authorization: Bearer <token>
  -> protected APIs
```

说明：

- 注册时自动创建租户
- 登录后返回 Bearer Token
- 后续任务、项目、任务中心接口都需要 token

## 2. 代码任务链路

```text
/tasks/code
  -> POST /api/tasks/submit
  -> backend 创建 task
  -> Celery worker 消费 qcp-default
  -> execution-service
  -> Docker runner 执行代码
  -> result_json 回写 PostgreSQL
  -> frontend 轮询 / 任务中心查看
```

关键点：

- 代码任务面向任意 Python 脚本
- 执行链路偏安全隔离
- 固定启动成本较高

## 3. 图形电路任务链路

```text
/tasks/circuit
  -> 前端构造结构化 circuit payload
  -> POST /api/tasks/circuit/submit
  -> backend 创建 circuit task
  -> Celery circuit-worker 消费 qcp-circuit
  -> qibo 常驻热进程执行
  -> result_json 回写 PostgreSQL
  -> frontend 查看状态 / 结果
```

关键点：

- 不再提交 Python 脚本
- 图形电路执行前需要 `circuit-worker` 心跳可用
- 提交前若热执行器不可用，会直接返回 `CIRCUIT_EXECUTOR_UNAVAILABLE`

## 4. 工作台本地模拟链路

```text
CircuitCanvas / QASM Editor
  -> frontend simulation worker
  -> 本地计算概率分布与 Bloch 向量
  -> WorkbenchResultPanel
```

这条链路仅用于前端即时反馈：

- 不依赖后端
- 不写数据库
- 不进入 Celery 队列

它的结果面板包括：

- 测量直方图
- Bloch 球
- 时间步预览联动

## 5. 项目保存链路

```text
Workbench / Code page
  -> PUT /api/projects/{name}
  -> PostgreSQL project
  -> GET /api/projects
  -> GET /api/projects/{project_id}
```

项目与任务不同：

- 项目是用户保存的编辑成果
- 任务是一次执行记录

## 6. 任务中心链路

```text
Task Center
  -> GET /api/tasks
  -> GET /api/tasks/{task_id}
  -> GET /api/tasks/{task_id}/detail
  -> GET /api/tasks/{task_id}/result
  -> GET /api/tasks/stream
```

任务中心用于：

- 列表浏览
- 状态筛选
- 详情诊断
- 实时状态观察

## 7. 状态与结果

当前主要任务终态：

- `SUCCESS`
- `FAILURE`
- `TIMEOUT`
- `RETRY_EXHAUSTED`

结果以标准化 `result_json` 回写数据库，再由前端读取和可视化。

## 8. 需要明确区分的两类结果

理解当前平台时必须区分：

### 前端预览结果

- 来源：浏览器本地模拟
- 作用：即时反馈
- 页面：工作台下方结果区

### 后端执行结果

- 来源：Celery + 执行链路
- 作用：真实任务记录
- 页面：任务中心 / 任务结果查看

二者在页面上都可能表现为“结果”，但来源不同，不能混淆。

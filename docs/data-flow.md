# 数据流说明

## 目的

本文档描述当前仓库中的真实数据流，重点说明：

- 用户认证
- 代码任务执行
- 图形化量子电路任务执行
- 本地模拟预览
- 项目保存与读取
- 任务中心结果展示

## 1. 认证数据流

```text
Frontend
  -> POST /api/auth/register
  -> POST /api/auth/login
  -> access_token
  -> Authorization: Bearer <token>
  -> protected APIs
```

当前事实：

- 注册时会创建并绑定独立租户
- 登录后前端使用 Bearer Token 访问受保护接口
- 当前产品形态仍偏单用户单租户，但数据模型已具备租户边界

## 2. 代码任务数据流

```text
/tasks/code
  -> POST /api/tasks/submit
  -> backend 创建 task
  -> Celery worker 消费 qcp-default
  -> execution-service
  -> Docker runner 执行用户代码
  -> result_json 回写 PostgreSQL
  -> frontend 在任务中心查看结果
```

说明：

- 这条链路用于直接执行 Python 代码
- 结果以数据库持久化后的任务结果为准
- `execution-service` 只属于这条链路

## 3. 图形化量子电路任务数据流

```text
/tasks/circuit
  -> 前端构造 circuit payload
  -> POST /api/tasks/circuit/submit
  -> backend 创建 circuit task
  -> Celery circuit-worker 消费 qcp-circuit
  -> qibo hot executor 执行
  -> result_json 回写 PostgreSQL
  -> frontend 在任务中心或工作台查看结果
```

说明：

- 后端接收的是结构化电路 payload，不是前端拼接的 Python 脚本
- 图形化电路和代码任务使用不同队列、不同 worker、不同执行边界
- 高级量子门的后端支持由 `circuit-worker` 当前加载的代码决定

## 4. 图形化工作台本地模拟流

```text
CircuitCanvas / QASM Editor
  -> frontend simulation worker
  -> 本地概率分布
  -> 本地 Bloch 球数据
  -> WorkbenchResultPanel
```

说明：

- 这条链路完全发生在前端浏览器
- 只服务即时反馈和预览
- 不会进入 Celery，也不会写回数据库

因此图形化工作台里实际存在两套结果来源：

- 本地模拟结果
- 后端正式任务结果

阅读结果时必须区分来源。

## 5. QASM 数据流

```text
GatePalette / CircuitCanvas
  <-> QASM bridge
  <-> QASM Editor
```

当前事实：

- 画布与 QASM 可双向同步
- 标准门可直接走标准表示
- 部分高级门导出为 QASM 时会做等价分解

这意味着：

- 高级门在画布上可以保持高级语义
- 经过 QASM 导出再导入后，可能回到等价基础门线路

## 6. 项目保存数据流

```text
Workbench / Code page
  -> PUT /api/projects/{name}
  -> PostgreSQL project
  -> GET /api/projects
  -> GET /api/projects/{project_id}
```

说明：

- 项目保存是持久化业务数据，不是浏览器临时缓存
- 图形化工作台和代码页都可使用项目保存
- 访问受认证和租户边界约束

## 7. 任务中心数据流

```text
Task Center
  -> GET /api/tasks
  -> GET /api/tasks/{task_id}
  -> GET /api/tasks/{task_id}/detail
  -> GET /api/tasks/{task_id}/result
  -> GET /api/tasks/stream
```

任务中心聚合展示：

- 任务状态
- 任务详情
- 执行结果
- 失败信息
- 实时更新

当前常见终态：

- `SUCCESS`
- `FAILURE`
- `TIMEOUT`
- `RETRY_EXHAUSTED`

## 8. 关键边界

### 代码任务与图形化任务边界

- 代码任务走 `worker -> execution-service -> Docker`
- 图形化任务走 `circuit-worker -> qibo hot executor`

两条链路不要混为一谈。

### 前端预览与后端正式执行边界

- 前端预览只负责即时反馈
- 提交任务后的正式结果由后端执行链路产生

### 热更新边界

- API 服务可热更新
- Celery worker 不会自动热更新

因此后端逻辑改动后，数据流是否生效取决于对应 worker 是否重启。

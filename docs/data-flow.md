# 量子任务端到端数据流（MVP）

本文档描述用户在前端点击“运行计算/提交任务”后，代码与测量概率在系统中的完整流动路径。

## 1. 前端触发提交

1. 用户在 `Monaco Editor` 输入 Python 脚本（基于 Qibo）。
2. 点击“提交任务”按钮，触发 `TasksPage.onSubmit`。
3. 前端调用 `submitTask(code)`，发起：
   - `POST /api/tasks/submit`
   - Header: `Authorization: Bearer <token>`
   - Body:

```json
{
  "code": "from qibo import Circuit\\n...\\ndef main():\\n    return {\"counts\": {\"00\": 512, \"11\": 512}}"
}
```

## 2. 后端接收并入队

1. FastAPI `submit_task` 接收请求，先做鉴权（Bearer Token）。
2. 将任务写入 SQLite `tasks` 表：
   - `user_id`: 当前用户
   - `code`: 用户脚本原文
   - `status`: `PENDING`
3. 调用 `queue.enqueue(run_quantum_task, task_id)` 将任务发布到 Redis（RQ Queue）。
4. 立即返回给前端（异步，不阻塞）：

```json
{
  "task_id": 123,
  "status": "PENDING"
}
```

## 3. 前端轮询任务状态

1. 前端保存 `task_id`，启动定时轮询（默认 1.5 秒）。
2. 轮询接口：
   - `GET /api/tasks/{task_id}`
3. 返回状态可能为：
   - `PENDING`
   - `RUNNING`
   - `SUCCESS`
   - `FAILURE`

## 4. Worker 执行量子脚本

1. RQ Worker 从 Redis 拉取任务 `task_id`。
2. 将数据库状态更新为 `RUNNING`。
3. 调用执行器 `execute_qibo_script(task.code)`，内部流程：
   - 沙箱校验：AST 检查、导入白名单、危险调用限制。
   - 子进程执行：限制超时，避免阻塞主进程。
   - 获取用户返回值：要求 `main()` 或 `RESULT` 给出结果。
4. 结果规范化逻辑：
   - 期望核心为 `counts`（bitstring -> 计数）。
   - 若未提供 `probabilities`，后端按 `count / total` 自动计算。
5. 执行成功：
   - `status = SUCCESS`
   - `result_json = {"counts": ..., "probabilities": ...}`
6. 执行失败：
   - `status = FAILURE`
   - `error_message` 记录错误信息。

## 5. 结果回传前端

1. 当前端轮询到 `status = SUCCESS`，会请求结果接口：
   - `GET /api/tasks/{task_id}/result`
2. 后端返回：

```json
{
  "task_id": 123,
  "status": "SUCCESS",
  "result": {
    "counts": {
      "00": 512,
      "11": 512
    },
    "probabilities": {
      "00": 0.5,
      "11": 0.5
    }
  },
  "message": null
}
```

3. 前端将：
   - `result` 原文展示在结果面板
   - `result.probabilities` 传给 ECharts 组件渲染概率柱状图。

## 6. 数据主线总结

1. **代码数据流**：`Monaco -> POST /submit -> SQLite(code) -> Worker(sandbox+qibo)`
2. **概率数据流**：`Worker计算/归一化 -> SQLite(result_json) -> GET /result -> ECharts可视化`

## 7. 状态机（任务维度）

`PENDING -> RUNNING -> SUCCESS`

`PENDING -> RUNNING -> FAILURE`

状态由后端单向推进，前端只读展示。

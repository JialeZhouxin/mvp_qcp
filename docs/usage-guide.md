# 使用说明

## 适用范围

本文档面向当前仓库的开发、联调和演示使用，不描述生产部署。

如果你先想知道系统结构，请先看 [architecture.md](architecture.md)。
如果你要排查 Docker 运行问题，请看 [docker-deployment.md](docker-deployment.md)。

## 快速启动

### Docker Compose 启动

```powershell
cd "E:/02_Projects/quantuncloudplatform/mvp_qcp"
docker compose up --build -d
```

### 健康检查

```powershell
powershell -ExecutionPolicy Bypass -File "scripts/dev-health-check.ps1" -Docker
```

需要更完整的检查时：

```powershell
powershell -ExecutionPolicy Bypass -File "scripts/dev-health-check.ps1" -Docker -Deep
```

## 常用访问地址

- 前端：`http://127.0.0.1:5173`
- OpenAPI：`http://127.0.0.1:8000/docs`
- 后端健康检查：`http://127.0.0.1:8000/api/health`

## 页面入口

- `/login`
- `/register`
- `/tasks/circuit`
- `/tasks/code`
- `/tasks/center`

## 日常使用路径

推荐操作顺序：

1. 注册或登录
2. 进入图形化编程或代码任务页
3. 提交任务
4. 到任务中心查看执行状态与结果
5. 需要长期保留时保存项目

## 图形化编程工作台

图形化编程工作台支持以下能力：

- 门库拖拽放置
- 参数编辑
- 电路画布编辑
- OpenQASM 编辑与同步
- 浏览器本地模拟
- Bloch 球预览
- 时间步结果预览
- 项目保存
- 后端正式任务提交

### 当前支持的量子门

- 基础单比特门：
  - `I`、`X`、`Y`、`Z`、`H`、`S`、`SDG`、`T`、`TDG`
- 参数门：
  - `RX`、`RY`、`RZ`、`U`、`P`
- 新增单比特门：
  - `SX`、`√Y`
- 受控/多比特门：
  - `CX`、`CY`、`CZ`、`CH`、`CP`、`CCX`、`CCZ`、`CSWAP`、`SWAP`
- 多量子旋转门：
  - `RXX`、`RYY`、`RZZ`、`RZX`
- 测量：
  - `M`

### 本地预览与正式结果的区别

工作台里会同时看到两类结果：

- 本地模拟结果
  - 由前端浏览器直接计算
  - 用于即时反馈、Bloch 球展示和时间步预览
- 正式任务结果
  - 由后端 `circuit-worker` 执行
  - 以任务中心或提交结果为准

如果两者不一致，先检查是否看混了“本地预览”和“后端正式执行”。

### 高级门的使用说明

- `SX`、`CY`、`CH`、`CSWAP` 可直接进入标准 QASM 路径
- `√Y`、`CCZ`、`RXX`、`RYY`、`RZZ`、`RZX` 会在导出 QASM 时分解成等价标准门序列
- 这类高级门在画布上保留高级语义，但经过 QASM 导出再导入后，可能表现为等价基础门线路

## 代码任务页

代码任务页用于直接提交 Python 量子脚本。

典型流程：

1. 编写 Python 代码
2. 提交到 `/api/tasks/submit`
3. 后端入队到 `qcp-default`
4. `worker` 调用 `execution-service`
5. Docker runner 执行并写回结果

适合场景：

- 直接验证 Python 代码执行
- 演示隔离执行链路
- 不依赖图形化电路编辑器的任务

## 任务中心

任务中心用于统一查看：

- 任务状态
- 执行详情
- 结果数据
- 失败原因

当前常见状态：

- `SUCCESS`
- `FAILURE`
- `TIMEOUT`
- `RETRY_EXHAUSTED`

## 项目保存

当前工作台支持项目保存与读取：

- 图形化工作台可保存当前电路草稿
- 代码任务页可保存代码项目
- 项目数据保存在 PostgreSQL

## 常见问题

### 1. 图形化任务提交后显示 `CIRCUIT_EXECUTOR_UNAVAILABLE`

优先检查：

- `circuit-worker` 是否正常运行
- Redis 心跳键是否存在
- `qibo` 热执行器是否启动成功

### 2. 新增量子门前端已经能看到，但提交后仍然失败

高概率原因：

- `circuit-worker` 仍在运行旧代码
- Celery worker 不会自动热重载

处理方式：

- 重启 `circuit-worker`
- 再次提交任务验证

### 3. 出现“重试次数上限”

这通常不是前端问题，而是任务在 worker 侧连续失败后进入终态。
需要到任务中心详情和 `circuit-worker` 日志里继续定位真实错误原因。

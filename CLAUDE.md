# Global Agent Rules

## 核心开发守则：量子计算云平台（Production-Ready Guidelines）

> 适用范围：以下规则默认约束 **新增/修改代码**；历史遗留代码按任务范围逐步整改。

### 1) 跨平台与配置隔离（Cross-Platform & Config）
- **禁止硬编码路径**：必须使用 `pathlib` / 平台无关路径处理，避免手写分隔符。
- **配置外置**：端口、IP、凭据、镜像、超时等可变项必须通过 `pydantic-settings` 或环境变量注入。
- **生产配置显式化**：生产/预发环境不得依赖开发默认值（如本地 SQLite、localhost Redis、开发镜像）。

### 2) 数据库无关性（Database Agnosticism）
- 当前默认 SQLite，未来可迁移 PostgreSQL/MySQL。
- **禁止数据库方言原生 SQL 作为常规路径**；优先 SQLModel / SQLAlchemy ORM。

### 3) 无状态执行与存储抽象（Statelessness & Storage）
- **RQ Worker 必须无状态**：任务结果应回传/落库，不得依赖 Worker 本地磁盘保存业务状态。
- 涉及用户代码、结果文件等持久化能力时，需通过统一存储抽象（`StorageService`）接入；禁止在业务层散落本地文件实现。

### 4) 容器化优先（Docker-Ready Architecture）
- 默认假设前后端、Redis、Worker、执行引擎运行于独立容器。
- 组件通信仅通过网络/API/消息队列，不假设共享内存或共享磁盘。

### 5) 企业级代码规范（Enterprise Code Quality）
- 遵循 PEP 8。
- 新增/修改 Python 代码必须包含必要 Type Hints。
- 新增/修改的主要类、函数、API 路由应补充 Docstring（Google/Sphinx 风格均可）。
- 异常处理必须可解释、可观测：
  - 禁止裸 `except:`；
  - 核心业务链路避免无边界 `except Exception`；
  - 边界兜底场景需记录结构化日志并保留明确错误语义。

---

## 项目运行（Project Run）

### 启动开发环境

```powershell
# 需要 Redis 运行在 127.0.0.1:6379
.\scripts\start-dev.ps1
```

脚本会自动：
1. 检查 Redis 连接（若无则尝试启动）
2. 验证 Python 3.11 环境
3. 检查后端/前端依赖
4. 启动后端 API（端口 8000）
5. 启动 RQ Worker
6. 启动前端开发服务器（端口 5173）

### 常用命令

| 命令 | 说明 |
|------|------|
| `cd backend; pytest` | 后端单元测试 |
| `cd frontend; npm test` | 前端测试（vitest） |
| `cd frontend; npm run build` | 前端生产构建 |
| `cd backend; uv run uvicorn app.main:app --reload --port 8000` | 单独启动后端 |

### 环境要求

- **Python**: 3.11
- **Node.js**: 18+
- **Redis**: 127.0.0.1:6379
- **包管理器**: uv（Python）, npm（Node）

---

## 目录结构（Directory Layout）

```text
mvp_qcp/
├─ backend/                    # FastAPI 后端
│  ├─ app/
│  │  ├─ api/                 # REST API 路由（auth, tasks, projects）
│  │  ├─ core/                # 配置、日志
│  │  ├─ db/                  # SQLModel 数据库会话
│  │  ├─ models/              # 数据模型
│  │  ├─ schemas/             # Pydantic 模型
│  │  ├─ services/            # 业务逻辑（鉴权、沙箱、执行器）
│  │  └─ worker/              # RQ Worker
│  └─ tests/                  # 后端测试
├─ frontend/                  # React + TypeScript 前端
│  ├─ src/
│  │  ├─ api/                 # API 客户端
│  │  ├─ auth/                # Token 管理
│  │  ├─ components/          # 通用组件
│  │  ├─ pages/               # 页面组件
│  │  └─ features/            # 功能模块
│  └─ tests/                  # 前端测试
├─ scripts/                   # 开发脚本
│  └─ start-dev.ps1          # 开发环境启动脚本
└─ docs/                      # 文档
```

---

## 验证标准（按影响范围执行）

- **仅后端改动**：至少执行后端相关测试（`cd backend; pytest` 或目标测试集）。
- **仅前端改动**：至少执行前端测试/构建（`npm test` / `npm run build`）。
- **跨端或接口契约改动**：后端测试 + 前端构建均需通过。
- **无法执行某项验证**：必须在交付说明中写明原因、风险和替代验证方式。

---

## 项目约束（Project Constraints）

- **数据库**：SQLite（默认位于 `backend/app.db`）
- **任务队列**：Redis + RQ，超时配置见环境变量（`RQ_JOB_TIMEOUT_SECONDS`, `QIBO_EXEC_TIMEOUT_SECONDS`）
- **前端状态**：React Context（无额外状态管理库）
- **禁止**：绕过 `app/services/` 在 API 层直接编排业务逻辑

---

## 协作约定（精简）

- 先分析依赖与风险，再执行修改。
- 并行优先，但同一文件默认串行修改，避免冲突。
- 高风险操作（删文件、改权限、改数据库结构等）需先确认。
- 输出要求简洁、可追溯，关键定位使用 `file:line`。

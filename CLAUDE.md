# Global Agent Rules

## 核心开发守则：量子计算云平台（Production-Ready Guidelines）

> 适用范围：以下规则默认约束 **新增/修改代码**；历史遗留代码按任务范围逐步整改。

### 1) 绝对跨平台与配置隔离（Cross-Platform & Config Isolation）
- **禁止硬编码路径**。
- Python 路径处理必须统一使用 `pathlib.Path`（禁止手写路径分隔符）。
- 端口、IP、凭据、镜像、超时等可变项必须通过 `pydantic-settings` 或环境变量注入。
- 生产/预发环境不得依赖开发默认值（如本地 SQLite、localhost Redis、开发镜像）。

### 2) 数据库无关性（Database Agnosticism）
- MVP 阶段允许使用 SQLite。
- 所有数据库访问必须通过 SQLAlchemy / SQLModel ORM 完成。
- 严禁编写依赖特定数据库方言的原生 SQL 作为常规路径。
- 数据模型与访问层设计必须以前向兼容 PostgreSQL/MySQL 平滑迁移为前提。

### 3) 无状态架构与存储抽象（Statelessness & Storage Abstraction）
- Worker 必须无状态；业务结果必须写回数据库、消息系统或统一存储服务。
- 涉及文件持久化（用户代码、结果文件、工件）必须通过 `StorageService` 抽象访问。
- `StorageService` 接口必须保留未来切换 OSS / S3 的扩展能力。

### 4) 容器化优先（Container-First Architecture）
- 默认假设前后端、Redis、Worker、执行引擎运行于独立 Docker 容器。
- 组件间仅通过网络 API 或消息队列通信。
- 严禁依赖共享本地磁盘、共享内存或进程内单例跨服务传递状态。

### 5) 企业级代码质量（Enterprise Code Quality）
- Python 代码严格遵守 PEP 8。
- 新增/修改 Python 代码强制完整 Type Hints。
- 新增/修改的主要类、函数、API 路由必须补充规范 Docstring（Google/Sphinx 风格均可）。
- 关键业务链路必须具备结构化日志。
- 异常处理必须可解释、可观测：
  - 禁止裸 `except:`；
  - 核心业务链路避免无边界 `except Exception`；
  - 边界兜底场景需保留明确错误语义。

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

- **数据库**：MVP 当前默认 SQLite（开发环境默认路径 `backend/app.db`），但不得将其设计为唯一目标数据库。
- **数据库访问**：统一通过 SQLAlchemy / SQLModel ORM，避免方言耦合，确保可迁移 PostgreSQL/MySQL。
- **任务队列**：当前默认 Redis + RQ（超时配置见 `RQ_JOB_TIMEOUT_SECONDS`, `QIBO_EXEC_TIMEOUT_SECONDS`），业务层不得与单一队列实现强绑定。
- **Worker 状态**：禁止依赖 Worker 本地磁盘保存业务状态。
- **服务通信**：禁止默认假设服务共享宿主机文件系统。
- **代码规范**：禁止以任何理由省略必要 Type Hints、Docstring、结构化日志。
- **分层约束**：禁止绕过 `app/services/` 在 API 层直接编排业务逻辑。

---

## 协作约定（精简）

- 先分析依赖与风险，再执行修改。
- 并行优先，但同一文件默认串行修改，避免冲突。
- 高风险操作（删文件、改权限、改数据库结构等）需先确认。
- 输出要求简洁、可追溯，关键定位使用 `file:line`。

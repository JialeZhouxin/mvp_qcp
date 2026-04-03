# 中国部署与网络受限环境 Playbook

## 目标

本文档面向两类场景：

- 开发/联调阶段：`docker compose up --build` 在中国网络环境超时、拉取失败。
- 上线阶段：生产环境要求尽量零公网出网，镜像与依赖必须可控、可审计。

## 1. 先解决 Docker 拉起网络问题（短期）

### 1.1 使用可配置构建源（仓库已支持）

本仓库已支持以下构建参数（通过 `.env` 注入）：

- 后端镜像构建：`APT_MIRROR_URL`、`PIP_INDEX_URL`、`PIP_EXTRA_INDEX_URL`、`PIP_TRUSTED_HOST`
- 前端镜像构建：`NPM_REGISTRY`、`NPM_FETCH_RETRIES` 等重试参数
- 基础服务镜像替换：`POSTGRES_IMAGE`、`REDIS_IMAGE`
- 业务镜像替换：`BACKEND_IMAGE`、`FRONTEND_IMAGE`

建议流程：

```powershell
cd "E:/02_Projects/quantuncloudplatform/mvp_qcp"
Copy-Item ".env.cn.example" ".env.cn"
docker compose --env-file ".env.cn" build --pull backend worker circuit-worker execution-service frontend
docker compose --env-file ".env.cn" up -d
```

### 1.2 Docker Daemon 镜像加速（开发机/构建机）

镜像加速可提升拉取稳定性，但不应作为生产长期依赖。

官方参考：

- Docker Hub mirror 机制：https://docs.docker.com/docker-hub/image-library/mirror/
- 阿里云加速器说明：https://help.aliyun.com/zh/acr/user-guide/accelerate-the-pulls-of-docker-official-images

## 2. “镜像源里没有包”怎么办（中长期）

### 2.1 容器镜像

- 不依赖公网临时拉取；改为“外网同步 -> 内网私有仓库 -> 集群部署”。
- 生产部署按镜像 digest 固定版本，避免 tag 漂移。

### 2.2 Python 依赖

- 在 CI 预下载 wheel 并写入私有制品仓库（或私有 PyPI 代理）。
- 生产构建只允许访问私有仓库，不直接访问 `pypi.org`。
- `PIP_EXTRA_INDEX_URL` 仅在明确评审后使用，避免供应链混淆风险。

### 2.3 Node 依赖

- 统一 `npm ci` + `package-lock.json`，确保可复现构建。
- 使用私有 npm 代理仓库；线上构建仅访问内网 registry。

## 3. 生产上线必须补齐的事项

### 3.1 供应链与网络

- 镜像仓库、npm、PyPI 全部内网化。
- 生产环境默认禁止公网 egress，仅放行必要内部服务。
- 构建节点与运行节点分离，运行节点只拉取已审计镜像。

### 3.2 安全与合规

- 资质：按业务确认 ICP 备案/许可路径。
- 数据：按《个人信息保护法》《数据安全法》做数据分级、最小化采集、留存与审计。
- 网络安全：按等保 2.0 落地基础控制项（身份、边界、日志、漏洞）。

## 4. 验证与审计

### 4.1 依赖来源审计（新增脚本）

```powershell
cd "E:/02_Projects/quantuncloudplatform/mvp_qcp"
powershell -ExecutionPolicy Bypass -File "scripts/cn-supply-chain-audit.ps1"
```

严格模式（示例）：

```powershell
powershell -ExecutionPolicy Bypass -File "scripts/cn-supply-chain-audit.ps1" `
  -AllowedImageRegistries "registry.example.com" `
  -AllowedNpmHosts "npm.example.com" `
  -FailOnUnknownImageRegistries `
  -FailOnUnknownNpmHosts
```

### 4.2 运行态健康检查

```powershell
powershell -ExecutionPolicy Bypass -File "scripts/dev-health-check.ps1" -Docker -Deep
```

## 5. 当前仓库边界说明

- 当前 `docker-compose.yml` 仍是开发/演示栈，不是生产加固编排。
- 本文档给出的策略可直接用于“生产化改造路线”，但正式上线仍需配套 K8s、私有仓库、网络策略和合规流程。

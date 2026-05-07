# Gatewarden

[English](README.md) | [简体中文](README.zh-CN.md)

[![GitHub release](https://img.shields.io/github/v/release/limitcool/gatewarden)](https://github.com/limitcool/gatewarden/releases)
[![Docker pulls](https://img.shields.io/badge/ghcr-gatewarden-black)](https://github.com/limitcool/gatewarden/pkgs/container/gatewarden)
[![Crates.io](https://img.shields.io/crates/v/gwaf)](https://crates.io/crates/gwaf)
[![License](https://img.shields.io/github/license/limitcool/gatewarden)](LICENSE)
[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/limitcool/gatewarden)

<p align="center">
  <img src="docs/assets/gatewarden-mark.svg" alt="Gatewarden logo" width="92" height="92" />
</p>

<p align="center">
  面向自托管应用的开源 AI WAF
</p>

<p align="center">
  <img src="docs/assets/dashboard-overview.png" alt="Gatewarden dashboard overview" width="100%" />
</p>

## 项目简介

Gatewarden 是一个面向自托管应用的开源 AI WAF。

它部署在你的服务前面，接收来自认证层的可信身份头，执行确定性安全策略，并把 AI 放在可审核的建议层，用于规则建议、事件分析和运维协作，而不是直接自动封禁。

## 能力概览

- 通过确定性策略保护管理面与登录面
- 作为 AI 辅助 WAF 保护自托管与内网应用
- 原生适配 `Caddy forward_auth`
- 复用 TinyAuth、oauth2-proxy 或其他 OIDC 前置认证层传来的身份上下文
- 使用 SQLite 或 PostgreSQL 持久化事件、规则、审批和设置
- 提供事件、规则、审批、设置、状态码与响应时间的控制台界面
- 保持 AI 只在建议层工作，而不是直接自动阻断请求

## 为什么做 Gatewarden

大多数自托管团队通常已经有：

- 一个反向代理
- 一层身份认证
- 一些脆弱的路径规则
- 分散的访问日志

Gatewarden 的目标是把这些团队需要的关键能力收拢到一个地方：

- 执行基础安全决策
- 回看真实发生了什么
- 审核规则变更
- 在不放弃确定性控制的前提下引入 AI 辅助分析

## 界面截图

### 概览页

![Gatewarden Dashboard](docs/assets/dashboard-overview.png)

### 事件页

![Gatewarden Events](docs/assets/dashboard-events.png)

### 规则页

![Gatewarden Rules](docs/assets/dashboard-rules.png)

## 当前状态

Gatewarden 目前仍处于早期阶段，但已经可以作为本地或单节点的 OSS AI WAF 部署使用。

当前 OSS 范围包括：

- Caddy-first 接入链路
- Trusted header 身份映射
- 基础登录限流
- 管理路径保护
- AI 辅助规则建议与人工审核流
- 概览、事件、规则、建议、审批、设置等控制台页面
- 基于 Caddy access log 的状态码与响应时间观测
- SQLite 轻量部署与 PostgreSQL 正式持久化支持

当前仍未完成的部分：

- 控制台完整 OIDC 登录
- 多节点同步
- 更完整的企业级审计与协作流程
- 更丰富的 AI 规则建议管道

## 架构结构

主要目录：

- `app/`：Rust HTTP 服务，提供 `forward_auth`、控制台 API、策略执行与日志摄取
- `crates/`：共享 core、网关、策略、限流、Caddy 适配等内部模块
- `web/`：Next.js 控制台前端
- `gatewarden.yaml`：统一运行配置

## 快速开始

### Docker Compose SOP

1. 准备一个工作目录，并放入这两个文件：

- `docker-compose.yaml`
- `gatewarden.yaml`

2. 启动 Gatewarden：

```bash
docker compose up -d
```

3. 浏览器打开控制台：

```text
http://127.0.0.1:3000
```

4. 在 Caddy 里把 `forward_auth` 指向：

```text
http://127.0.0.1:4000
```

端口职责：

- `3000`：给浏览器访问的控制台
- `4000`：给 Caddy 调用的 Gatewarden API / `forward_auth`

默认挂载：

- `./gatewarden.yaml` -> `/opt/gatewarden/gatewarden.yaml`
- `./docker-data` -> `/opt/gatewarden/app/data`

默认 compose 方案会：

- 直接拉取 `ghcr.io/limitcool/gatewarden:latest`
- 使用 `./docker-data` 里的 SQLite
- 不需要你额外设置 `CONSOLE_API_BASE_URL`

它会直接拉取发布好的镜像：

```text
ghcr.io/limitcool/gatewarden:latest
```

### 1. 启动后端

```powershell
cargo run -p gwaf
```

默认地址：

```text
127.0.0.1:4000
```

### 2. 启动前端控制台

```powershell
pnpm install
pnpm --dir web run dev
```

默认地址：

```text
http://127.0.0.1:3010
```

SQLite 仍然是默认的快速启动数据库：

```yaml
database:
  url: "sqlite://app/data/ingress.db?mode=rwc"
```

如果你要接正式数据库或外部持久化，改成 PostgreSQL：

```yaml
database:
  url: "postgres://gatewarden:change-me@127.0.0.1:5432/gatewarden"
```

### 3. 验证项目

```powershell
cargo check
cargo test
pnpm --dir web run check
pnpm --dir web run build
```

## Caddy 接入示例

Gatewarden 适合部署在真实认证层之后，作为一层 AI 辅助、但执行仍然确定性的 WAF。

如果你已经有 OIDC：

- 保留你现有的 OIDC 提供方或认证代理
- 先由那一层完成用户认证
- 让它继续输出可信身份头，比如 `Remote-User`、`Remote-Email`、`Remote-Groups`、`X-Auth-Provider`、`X-Authenticated`
- 再在 `gatewarden.yaml` 里把 `identity.trusted_headers.*` 映射到你的真实头名

这种模式下，Gatewarden 不需要替换你现有的 OIDC 登录流。它只消费认证完成后的可信身份上下文。

部署口径：

- 浏览器 -> `http://127.0.0.1:3000`
- Caddy `forward_auth` -> `http://127.0.0.1:4000/api/forward-auth`
- 你的业务应用仍然像以前一样挂在 Caddy 后面

这也是为什么这里会同时出现 `3000` 和 `4000`：

- `3000` 是面向用户的控制台
- `4000` 是给 Caddy 调用的内部 API 面

可复用的 `Caddyfile` 片段：

```caddy
(gatewarden_forward_auth) {
	forward_auth http://127.0.0.1:4000 {
		uri /api/forward-auth
		copy_headers Remote-User Remote-Email Remote-Groups X-Auth-Provider X-Authenticated X-Request-Id
	}
}
```

用于采集状态码、域名、请求 ID、User-Agent 与响应时间的结构化 access log 示例：

```caddy
{
	log {
		output file /var/log/caddy/access.jsonl
		format json
	}
}

app.example.com {
	log {
		output file /var/log/caddy/access.jsonl
		format json
	}

	import gatewarden_forward_auth

	reverse_proxy http://127.0.0.1:8080 {
		header_up X-Real-IP {remote_host}
		header_up X-Forwarded-For {remote_host}
		header_up X-Forwarded-Proto {scheme}
		header_up X-Forwarded-Host {host}
		header_up X-Forwarded-Uri {uri}
	}
}
```

然后在 `gatewarden.yaml` 里开启日志摄取，并把路径指向同一份 JSON 日志：

```yaml
observability:
  caddy_access_log:
    enabled: true
    path: "app/data/caddy-access.jsonl"
    poll_interval_ms: 1000
```

最小使用示例：

```caddy
app.example.com {
	import gatewarden_forward_auth

	reverse_proxy http://127.0.0.1:8080 {
		header_up X-Real-IP {remote_host}
		header_up X-Forwarded-For {remote_host}
		header_up X-Forwarded-Proto {scheme}
		header_up X-Forwarded-Host {host}
		header_up X-Forwarded-Uri {uri}
	}
}
```

带独立认证域名和两个受保护业务域名的示例：

```caddy
(gatewarden_forward_auth) {
	forward_auth http://127.0.0.1:4000 {
		uri /api/forward-auth
		copy_headers Remote-User Remote-Email Remote-Groups X-Auth-Provider X-Authenticated X-Request-Id
	}
}

auth.example.com {
	reverse_proxy http://127.0.0.1:9000
}

app.example.com {
	import gatewarden_forward_auth

	reverse_proxy http://127.0.0.1:8080 {
		header_up X-Real-IP {remote_host}
		header_up X-Forwarded-For {remote_host}
		header_up X-Forwarded-Proto {scheme}
		header_up X-Forwarded-Host {host}
		header_up X-Forwarded-Uri {uri}
	}
}

accounts.example.com {
	import gatewarden_forward_auth

	reverse_proxy http://127.0.0.1:8081 {
		header_up X-Real-IP {remote_host}
		header_up X-Forwarded-For {remote_host}
		header_up X-Forwarded-Proto {scheme}
		header_up X-Forwarded-Host {host}
		header_up X-Forwarded-Uri {uri}
	}
}
```

如果希望在控制台里看到状态码与响应时间，请开启结构化的 Caddy access log，并在 `gatewarden.yaml` 中把日志路径指给 Gatewarden。

## 配置项

项目使用 YAML 运行时配置：

```text
gatewarden.yaml
```

在修改配置前，先明确端口职责：

- 浏览器控制台：`http://127.0.0.1:3000`
- Gatewarden API 与 Caddy `forward_auth`：`http://127.0.0.1:4000`
- `gatewarden.yaml` 里的 `server.listen_addr` 指的是 `4000` 这个 Gatewarden API 监听地址，不是浏览器访问的控制台端口
- 如果你使用默认 Docker Compose，控制台端口由镜像和 compose 文件处理，不在 `gatewarden.yaml` 里配置

完整示例：

```yaml
server:
  listen_addr: "127.0.0.1:4000"

database:
  url: "sqlite://app/data/ingress.db?mode=rwc"
  # Production example:
  # url: "postgres://gatewarden:change-me@127.0.0.1:5432/gatewarden"

identity:
  mode: "trusted_header"
  provider_hint: "external-oidc"
  trusted_headers:
    authenticated: "X-Authenticated"
    subject: "Remote-User"
    email: "Remote-Email"
    groups: "Remote-Groups"
    provider: "X-Auth-Provider"

security:
  admin_shadow_prefixes:
    - "/admin"
  login_ip_limit:
    rule_id: "protect-login-ip"
    path_prefix: "/api/login"
    rps: 5
    burst: 10
  login_user_limit:
    rule_id: "protect-login-user"
    path_prefix: "/api/login"
    rps: 3
    burst: 6
  console_admin_groups:
    - "admin"
  protected_hosts:
    - "app.example.com"
    - "accounts.example.com"

ai:
  enabled: false
  provider: "openai"
  model: "gpt-4.1-mini"
  api_key_env: "GATEWARDEN_AI_API_KEY"
  # 如果你要接 OpenAI-compatible 网关，可以配置 base_url:
  # base_url: "https://api.openai.com/v1"
  timeout_ms: 15000
  system_prompt: "You are Gatewarden, an AI security analyst. Produce concise, evidence-based, operator-reviewable guidance."

observability:
  caddy_access_log:
    enabled: true
    path: "app/data/caddy-access.jsonl"
    poll_interval_ms: 1000
  geoip:
    enabled: false
    database_path: "app/data/GeoLite2-City.mmdb"
```

关键字段：

- `server.listen_addr`
- `database.url`
- `identity.trusted_headers.*`
- `security.admin_shadow_prefixes`
- `security.login_ip_limit.*`
- `security.login_user_limit.*`
- `security.console_admin_groups`
- `ai.enabled`
- `ai.provider`
- `ai.model`
- `ai.api_key_env`
- `ai.base_url`
- `ai.timeout_ms`
- `observability.caddy_access_log.*`
- `observability.geoip.*`

## AI 配置

Gatewarden 现在已经支持真实模型参与建议层工作，主要用于：

- 异步生成 AI 规则建议
- 在事件页里对单次请求做 AI 解释

当前支持的 provider 值：

- `openai`
- `anthropic`
- `gemini`
- `groq`
- `deepseek`
- `xai`
- `ollama`

默认建议配置：

- `provider: "openai"`
- `model: "gpt-4.1-mini"`
- `api_key_env: "GATEWARDEN_AI_API_KEY"`

如果你要直连官方 OpenAI：

```yaml
ai:
  enabled: true
  provider: "openai"
  model: "gpt-4.1-mini"
  api_key_env: "GATEWARDEN_AI_API_KEY"
  base_url: "https://api.openai.com/v1"
  timeout_ms: 15000
```

如果你要接 OpenAI-compatible 网关，比如 OpenRouter、中转层或自建代理：

```yaml
ai:
  enabled: true
  provider: "openai"
  model: "gpt-4.1-mini"
  api_key_env: "GATEWARDEN_AI_API_KEY"
  base_url: "https://your-openai-compatible-endpoint/v1"
  timeout_ms: 15000
```

环境变量示例：

```powershell
$env:GATEWARDEN_AI_API_KEY="your-api-key"
```

需要明确的一点：

- AI 仍然只在建议层工作
- 发布真实策略仍然需要人工审批
- 实时阻断与限流仍然保持确定性执行

## AI WAF 模型

Gatewarden 坚持以下几个原则：

- `Caddy-first`
- `deterministic enforcement`
- `trusted identity headers`
- `AI advisory only`

这意味着：

- 身份上下文应来自可信的上游认证层
- 阻断与限流保持确定性且可审计
- AI 建议必须先可审核，才能进入生效策略

## 开源与商业授权

这个仓库是 Gatewarden 的 OSS 主线仓库。

- 许可证：`AGPL-3.0-only`
- 开源仓库：`gatewarden`
- 商业增强：private `gatewarden-enterprise`

如果你需要闭源部署、OEM/白标、商业支持或企业专属功能，请查看 [COMMERCIAL.md](COMMERCIAL.md)。

## 相关文档

- [README.md](README.md)
- [CONTRIBUTING.md](CONTRIBUTING.md)
- [SECURITY.md](SECURITY.md)
- [COMMERCIAL.md](COMMERCIAL.md)

## 品牌资源

仓库内包含：

- 可复用的项目 logo，可用于 GitHub、文档和产品界面
- 用于前端控制台的应用图标
- 当前 OSS 控制台的真实截图

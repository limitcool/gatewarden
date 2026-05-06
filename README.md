# Gatewarden

[English](README.md) | [简体中文](README.zh-CN.md)

<p align="center">
  <img src="docs/assets/gatewarden-mark.svg" alt="Gatewarden logo" width="92" height="92" />
</p>

<p align="center">
  Open-source AI WAF for self-hosted apps
</p>

<p align="center">
  <img src="docs/assets/dashboard-overview.png" alt="Gatewarden dashboard overview" width="100%" />
</p>

## Overview

Gatewarden is an open-source AI WAF for self-hosted apps.

It sits in front of your services, consumes trusted identity headers from your auth layer, applies deterministic enforcement, and uses AI in a reviewable advisory lane for rule suggestions, event analysis, and operator workflows.

## What This AI WAF Does

- Protects admin and login surfaces with deterministic checks
- Acts as an AI-assisted WAF for self-hosted and internal applications
- Works well with `Caddy forward_auth`
- Reuses identity context from TinyAuth, oauth2-proxy, or other OIDC-aware front layers
- Stores events, rules, approvals, and settings in SQLite
- Exposes a web console for events, rules, approvals, settings, status codes, and latency
- Keeps AI in an advisory role instead of letting it block requests directly

## Why Gatewarden

Most self-hosted teams already have:

- a reverse proxy
- an identity layer
- a few fragile path rules
- scattered logs

Gatewarden gives those teams one place to:

- enforce basic security decisions
- inspect what happened
- review rule changes
- add AI-assisted analysis without giving up deterministic control

## Screenshots

### Dashboard

![Gatewarden Dashboard](docs/assets/dashboard-overview.png)

### Events

![Gatewarden Events](docs/assets/dashboard-events.png)

### Rules

![Gatewarden Rules](docs/assets/dashboard-rules.png)

## Project Status

Gatewarden is early, but already usable as a local or single-node OSS AI WAF deployment.

Current OSS scope:

- Caddy-first integration
- trusted-header identity mapping
- basic login rate limiting
- admin-path protection
- AI-assisted rule suggestions and operator review flows
- console pages for dashboard, events, rules, suggestions, approvals, and settings
- structured observability for status codes and response time from Caddy access logs

Not finished yet:

- full OIDC relying-party login for the console
- multi-node sync
- advanced enterprise audit and collaboration workflows
- richer AI rule generation pipeline

## Architecture

Main directories:

- `app/` - Rust HTTP service with `forward_auth`, console API, policy evaluation, and log ingest
- `crates/` - shared core, gateway, policy, rate-limit, and Caddy integration crates
- `web/` - Next.js admin console
- `gatewarden.yaml` - runtime configuration

## Quick Start

### 1. Start the backend

```powershell
cargo run -p gatewarden
```

Default address:

```text
127.0.0.1:4000
```

### 2. Start the web console

```powershell
pnpm install
pnpm --dir web run dev
```

Default address:

```text
http://127.0.0.1:3010
```

### 3. Validate the project

```powershell
cargo check
cargo test
pnpm --dir web run check
pnpm --dir web run build
```

## Caddy Integration

Gatewarden is designed to work behind a real auth layer as an AI-assisted WAF with deterministic enforcement.

```caddy
app.example.com {
	forward_auth http://127.0.0.1:4000 {
		uri /api/forward-auth
		copy_headers Remote-User Remote-Email Remote-Groups X-Auth-Provider X-Authenticated X-Request-Id
	}

	reverse_proxy http://127.0.0.1:8080 {
		header_up X-Real-IP {remote_host}
		header_up X-Forwarded-For {remote_host}
		header_up X-Forwarded-Proto {scheme}
		header_up X-Forwarded-Host {host}
		header_up X-Forwarded-Uri {uri}
	}
}
```

To expose status code and latency metrics, enable structured Caddy access logs and point Gatewarden at that file in `gatewarden.yaml`.

## Configuration

The project uses:

```text
gatewarden.yaml
```

Important sections:

- `server.listen_addr`
- `database.url`
- `identity.trusted_headers.*`
- `security.admin_shadow_prefixes`
- `security.login_ip_limit.*`
- `security.login_user_limit.*`
- `security.console_admin_groups`
- `observability.caddy_access_log.*`

## AI WAF Model

Gatewarden follows a few explicit rules:

- `Caddy-first`
- `deterministic enforcement`
- `trusted identity headers`
- `AI advisory only`

That means:

- identity should come from a trusted upstream auth layer
- blocking and rate limiting remain deterministic and auditable
- AI suggestions stay reviewable before becoming active policy

## Open Source and Commercial

This repository is the OSS mainline.

- License: `AGPL-3.0-only`
- OSS repository: `gatewarden`
- Commercial add-ons: private `gatewarden-enterprise`

If you need closed-source deployment, OEM/white-label rights, commercial support, or enterprise-only features, see [COMMERCIAL.md](COMMERCIAL.md).

## Documentation

- [README.zh-CN.md](README.zh-CN.md)
- [CONTRIBUTING.md](CONTRIBUTING.md)
- [SECURITY.md](SECURITY.md)
- [COMMERCIAL.md](COMMERCIAL.md)

## Branding Assets

The repository includes:

- a reusable project mark for GitHub, docs, and product UI
- an application icon for the web console
- live screenshots from the current OSS dashboard

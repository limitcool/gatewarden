# Gatewarden

Open-source AI WAF for self-hosted apps.

Gatewarden sits in front of your services, consumes trusted identity headers from your auth layer, applies deterministic enforcement, and keeps AI in a reviewable advisory lane for rule suggestions, event analysis, and operator workflows.

Project repository:

- https://github.com/limitcool/gatewarden

Documentation:

- README: https://github.com/limitcool/gatewarden#readme
- Chinese README: https://github.com/limitcool/gatewarden/blob/main/README.zh-CN.md
- Commercial notes: https://github.com/limitcool/gatewarden/blob/main/COMMERCIAL.md

Core capabilities:

- AI-assisted WAF for self-hosted and internal applications
- Deterministic protection for admin and login surfaces
- Trusted-header identity model
- Caddy-first integration with `forward_auth`
- SQLite-backed events, rules, approvals, and settings
- Web console for events, rules, approvals, settings, status codes, and latency
- Structured observability from Caddy access logs

Workspace crates:

- `gwaf`: main application crate
- `ingress-core`: shared request, identity, and event types
- `ingress-gateway`: gateway abstractions and adapters
- `ingress-api`: console API DTOs
- `ingress-policy`: deterministic policy primitives
- `ingress-rate-limit`: rate limiting primitives
- `ingress-caddy`: Caddy integration helpers

Quick start:

```powershell
cargo run -p gwaf
```

The runtime binary name remains:

```text
gatewarden
```

If you want the full product overview, screenshots, and deployment notes, use the GitHub repository README:

- https://github.com/limitcool/gatewarden

# Architecture

Gatewarden is designed as a security layer that sits between a reverse proxy and an upstream application.

The current default path is:

```text
Client -> Caddy -> upstream auth layer -> Gatewarden -> application
```

## Main components

### `app/`

The Rust service provides:

- `forward_auth` evaluation
- console API routes
- event persistence
- rule and approval storage
- structured log ingest for observability

### `crates/`

Shared internal crates keep the project modular:

- `ingress-core` - shared request and decision types
- `ingress-gateway` - gateway abstraction
- `ingress-caddy` - Caddy adapter
- `ingress-policy` - deterministic policy evaluation
- `ingress-rate-limit` - basic rate limiting
- `ingress-api` - DTOs and API contracts
- `ingress-ai` - advisory-only AI boundaries
- `ingress-ingest` - ingest-related primitives

### `web/`

The web console provides:

- dashboard metrics
- event stream
- rule inventory
- suggestions
- approvals
- settings

## Design goals

- keep enforcement deterministic
- accept trusted identity context from an upstream auth layer
- separate product UI from enforcement logic
- keep AI recommendations reviewable before activation
- avoid maintaining a split OSS vs enterprise core

# Security Policy

## Supported scope

Gatewarden is currently best treated as an early-stage OSS project for local, lab, and single-node deployments.

The supported scope is:

- the latest code on the main branch
- the documented local deployment model in `README.md`

## Reporting a vulnerability

Please do not publish exploit details in a public issue.

When reporting a security issue, include:

- affected component or route
- reproduction steps
- expected behavior vs actual behavior
- impact level
- minimal proof of concept if needed

## Current security model

Gatewarden is built around:

- `Caddy-first`
- trusted upstream identity headers
- deterministic enforcement
- `AI advisory only`

In practice, that means:

- AI should not directly enforce blocking decisions
- reviewed policy should remain explainable and auditable
- auth, rate limiting, and core policy decisions should stay deterministic

## License note

The OSS edition is licensed under `AGPL-3.0-only`.

If you deploy a modified network-facing version, you are responsible for meeting the license obligations for corresponding source availability.

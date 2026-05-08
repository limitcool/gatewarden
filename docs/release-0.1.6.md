# Gatewarden 0.1.6

Gatewarden `0.1.6` stabilizes OSS deployment basics and closes a few rollout blockers in the console.

## Highlights

- Structured settings can write back to a real writable config path again
- Docker and compose defaults now align on `/config/gatewarden.yaml`
- Protected hosts recover response time and status data more reliably from Caddy observations
- Fake filter actions were removed from pages that did not actually support advanced filtering

## What changed

### Writable config path

Gatewarden now reads and writes runtime configuration through `GATEWARDEN_CONFIG_PATH`.

- the default container path is `/config/gatewarden.yaml`
- compose mounts are now writable by default
- the entrypoint seeds the runtime config file automatically on first boot

This fixes the broken flow where the settings UI could appear to save while the mounted config file was still read-only or mounted at the wrong path.

### Better event correlation

Protected traffic no longer depends only on exact `request_id` alignment to recover response metadata.

The console now falls back to a scored match using:

- host
- method
- normalized path
- timestamp proximity
- user agent
- client IP when available

This makes response time and status correlation more reliable for traffic that went through `forward_auth` and structured Caddy access logging but did not preserve a perfectly aligned request ID across both surfaces.

### UI cleanup

This release also removes misleading controls:

- approvals no longer show a fake extra-filter action
- suggestions no longer show a fake extra-filter action
- settings no longer show a fake extra-filter action
- rules keep the extra filter affordance because it maps to a real operator hint

## Upgrade note

If your existing deployment still mounts:

```text
/opt/gatewarden/gatewarden.yaml
```

switch it to:

```text
/config/gatewarden.yaml
```

and make sure the mount is writable, otherwise the structured settings UI will not persist changes back to disk.

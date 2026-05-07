# Gatewarden 0.1.5

Gatewarden `0.1.5` completes the shift from config-shaped demos to a real OSS operations console.

## Highlights

- Policy rules now live in PostgreSQL-backed inventory instead of YAML-only injection
- The runtime enforcement path now evaluates active persisted rules directly
- The rules page can create, edit, and delete real structured rules
- Host coverage now reflects real Gatewarden decision traffic instead of manual host lists
- Rules can target a specific host, making multi-domain rollout clearer and safer
- Settings UI now fails clearly when the connected backend does not return structured config

## What changed

### Real policy inventory

Gatewarden now stores structured policy fields for:

- `admin-protect`
- `rate-limit-ip`
- `rate-limit-user`

Each rule can carry:

- `kind`
- `host`
- `path_prefix`
- `rps`
- `burst`
- `admin_prefixes`
- `mode`
- `status`

This means approval state and active state now affect real runtime behavior rather than display-only UI.

### Runtime behavior

Forward-auth decisions now load active rules from the database at evaluation time.

- Admin protection can match by host and admin path prefixes
- IP limiters can match by host and login path
- Subject limiters can match by host and login path
- Shadow versus enforce now comes from persisted rule mode plus global shadow state

### Console UX

The OSS console now exposes a clearer operator workflow:

- see which hosts are actually connected
- create a real protection rule for that host
- review the structured fields before saving
- inspect rule type, host, path, thresholds, and source in the inventory

The settings page also no longer hangs forever when connected to an older backend that omits `config`.

## Important boundary

Gatewarden is still deterministic-first.

- AI remains advisory
- enforcement still comes from explicit rules
- approvals remain visible and reviewable

## Upgrade note

If the settings page shows that structured config is unavailable, your frontend is likely pointed at an older Gatewarden backend or proxy target. Update the backend first, then reload the console.

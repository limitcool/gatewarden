# Changelog

## 0.1.6

### Fixed

- Restored writable structured config persistence by moving runtime config I/O to `GATEWARDEN_CONFIG_PATH`
- Updated container and compose defaults to use writable `/config/gatewarden.yaml` mounts
- Removed fake filter actions from approvals, suggestions, and settings pages
- Improved event-to-observation correlation so protected hosts can recover status code and response time even when exact request IDs do not align

### Improved

- Added a regression test for fallback observation correlation
- Updated README and Docker examples to reflect the new config mount path
- Kept the real advanced filter affordance only on the rules page where it maps to an actual action

## 0.1.4

### Added

- Added real AI-backed advisory workflows with a provider abstraction based on `genai`
- Added asynchronous AI suggestion generation for the suggestions console page
- Added per-request AI explanation for event stream entries
- Added provider-aware AI runtime config with `enabled`, `provider`, `model`, `api_key_env`, `base_url`, `timeout_ms`, and `system_prompt`
- Added support for OpenAI-compatible endpoints through configurable `base_url`
- Added persistence for generated AI suggestions and cached event explanations

### Improved

- Expanded suggestions UI to show confidence, evidence, proposed rule drafts, model source, and generation time
- Documented AI configuration in `gatewarden.yaml`, `README.md`, and `README.zh-CN.md`
- Kept AI strictly inside the advisory lane while preserving deterministic enforcement and human approval

### Verified

- `cargo check -p gwaf`
- `cargo test -p gwaf --bin gatewarden`
- `pnpm --dir web run check`

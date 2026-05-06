# Changelog

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

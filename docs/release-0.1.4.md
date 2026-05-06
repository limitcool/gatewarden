# Gatewarden 0.1.4

Gatewarden `0.1.4` adds the first real AI-backed advisory lane to the OSS release.

## Highlights

- Real AI suggestions in the suggestions page
- Per-request AI explanation in the events page
- Multi-provider AI runtime support via `genai`
- OpenAI-compatible `base_url` support
- Persisted AI suggestions and cached AI event explanations
- Expanded YAML and README documentation for AI setup

## Important boundary

AI is still advisory-only.

- Realtime enforcement remains deterministic
- Blocking and rate limiting do not depend on LLM availability
- Publishing policy still requires explicit human approval

## Runtime config

Use the new `ai:` block in `gatewarden.yaml`:

```yaml
ai:
  enabled: true
  provider: "openai"
  model: "gpt-4.1-mini"
  api_key_env: "GATEWARDEN_AI_API_KEY"
  base_url: "https://api.openai.com/v1"
  timeout_ms: 15000
```

For OpenAI-compatible gateways, replace `base_url` with your endpoint.

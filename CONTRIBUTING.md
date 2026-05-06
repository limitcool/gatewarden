# Contributing to Gatewarden

Thanks for helping improve Gatewarden.

## Before you open a PR

- keep changes focused and minimal
- preserve the `Caddy-first` and `deterministic enforcement` direction
- keep AI features in an advisory lane unless there is an explicit reviewed enforcement path
- avoid adding enterprise-only behavior directly into the OSS core

## Local development

### Backend

```powershell
cargo check
cargo test
```

### Web

```powershell
pnpm install
pnpm --dir web run check
pnpm --dir web run build
```

### Run locally

Start the backend:

```powershell
cargo run -p gatewarden
```

Start the web console:

```powershell
pnpm --dir web run dev
```

## Contribution guidelines

- explain the problem and why the change is needed
- update docs when changing config, behavior, APIs, or deployment steps
- prefer existing project patterns over introducing a second approach
- keep new dependencies justified and small

## Pull request checklist

- clear summary
- validation steps and results
- config or deployment impact
- any OSS vs enterprise boundary implications

## License

By contributing to this repository, you agree that your contribution may be distributed under `AGPL-3.0-only`.

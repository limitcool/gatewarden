# GitHub Actions and Packages

This repository includes a public release pipeline for GitHub and GHCR.

## Workflows

### `ci.yml`

Runs on pushes to `main` and pull requests.

It performs:

- `cargo check`
- `cargo test -p gwaf`
- `pnpm --dir web run check`
- `pnpm --dir web run build`
- `docker build -t gatewarden:ci .`

### `release.yml`

Runs on `main`, version tags like `v0.1.0`, and manual dispatches.

It produces:

- release binaries for Linux, macOS, and Windows when triggered by a version tag
- GitHub Release attachments
- multi-arch Docker images pushed to `ghcr.io`
- a `latest` image for the default branch and versioned images for tags
- release notes that merge `docs/release-<version>.md` with GitHub-generated change summaries

## GHCR image

The workflow publishes Docker images to:

```text
ghcr.io/<owner>/<repo>
```

For this repository, the expected image path is:

```text
ghcr.io/limitcool/gatewarden
```

The published container is a single image that starts:

- the Gatewarden Rust API on `127.0.0.1:4000`
- the Next.js dashboard on `0.0.0.0:3000`

The dashboard proxies console API requests to the local Gatewarden process inside the same container.

## Recommended tag flow

Create and push a version tag:

```powershell
git tag v0.1.0
git push origin v0.1.0
```

That will trigger the release workflow.

If you want a curated release body, add:

```text
docs/release-<version>.md
```

Example:

```text
docs/release-0.1.5.md
```

The workflow will prepend that document and then append GitHub-generated notes for the tag.

Pushes to `main` will also refresh the `ghcr.io/<owner>/<repo>:latest` image.

## Notes

- `GITHUB_TOKEN` is enough for GitHub Releases and GHCR in standard repository settings.
- If package visibility or permissions are restricted, review repository package settings in GitHub.

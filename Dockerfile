FROM node:22-bookworm-slim AS web-build
WORKDIR /workspace
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY web/package.json web/package.json
RUN corepack enable && pnpm install --frozen-lockfile
COPY web ./web
RUN pnpm --dir web run build

FROM rust:1.88-bookworm AS rust-build
WORKDIR /workspace
COPY Cargo.toml Cargo.lock ./
COPY app ./app
COPY crates ./crates
RUN cargo build --release -p gwaf

FROM node:22-bookworm-slim
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates gosu tini wget \
  && useradd --system --create-home --home-dir /opt/gatewarden --shell /usr/sbin/nologin gatewarden \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /opt/gatewarden

COPY --from=rust-build /workspace/target/release/gatewarden /usr/local/bin/gatewarden
COPY --from=web-build /workspace/web/.next/standalone ./
COPY --from=web-build /workspace/web/.next/static ./web/.next/static
COPY --from=web-build /workspace/web/public ./web/public
COPY gatewarden.yaml ./gatewarden.yaml
COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh

RUN chmod +x /usr/local/bin/entrypoint.sh \
  && mkdir -p /opt/gatewarden/app/data \
  && chown -R gatewarden:gatewarden /opt/gatewarden

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV CONSOLE_API_BASE_URL=http://127.0.0.1:4000

EXPOSE 3000

ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["/usr/local/bin/entrypoint.sh"]

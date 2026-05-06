#!/bin/sh
set -eu

gatewarden &
backend_pid=$!

cleanup() {
  kill -TERM "$backend_pid" 2>/dev/null || true
}

trap cleanup INT TERM

cd /opt/gatewarden/web
exec node server.js

#!/bin/sh
set -eu

mkdir -p /opt/gatewarden/app/data
chown -R gatewarden:gatewarden /opt/gatewarden/app/data

gosu gatewarden gatewarden &
backend_pid=$!

cleanup() {
  kill -TERM "$backend_pid" 2>/dev/null || true
}

trap cleanup INT TERM

cd /opt/gatewarden/web
exec gosu gatewarden node server.js

#!/usr/bin/env bash
# dev.sh — Start Vite dev server and restart it when jetlag.config.yaml changes.
# Usage: bash dev.sh
#
# Note: the Vite plugin already hot-reloads the browser when the config changes.
# Use this script only if you need a full server restart (e.g. after editing
# vite-plugin-yaml.js or vite.config.js, which are not hot-reloadable).

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG="$SCRIPT_DIR/jetlag.config.yaml"
SERVER_PID=""

start_server() {
  npm --prefix "$SCRIPT_DIR" run dev &
  SERVER_PID=$!
  echo "▶ Dev server started (PID $SERVER_PID)"
}

stop_server() {
  if [[ -n "$SERVER_PID" ]]; then
    kill "$SERVER_PID" 2>/dev/null || true
    wait "$SERVER_PID" 2>/dev/null || true
    SERVER_PID=""
  fi
}

get_mtime() {
  stat -f "%m" "$CONFIG"
}

trap stop_server EXIT INT TERM

start_server
LAST_MTIME=$(get_mtime)
echo "👁  Watching $(basename "$CONFIG") for changes…"

while true; do
  sleep 1
  CURRENT_MTIME=$(get_mtime)
  if [[ "$CURRENT_MTIME" != "$LAST_MTIME" ]]; then
    echo "⟳  Config changed — restarting dev server…"
    stop_server
    sleep 0.5  # let the port clear
    LAST_MTIME=$CURRENT_MTIME
    start_server
  fi
done

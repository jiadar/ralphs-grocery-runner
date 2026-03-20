#!/bin/bash
# deploy.sh — Build and deploy sea-schedule to corp.javin.io
# Usage: ./deploy.sh
# Optional: ./deploy.sh --app-name my-app  (override app name)

set -e  # Exit immediately on error

# ── Config ────────────────────────────────────────────────────────────────────
APP_NAME="sea-schedule"
REMOTE_USER="$(whoami)"
REMOTE_HOST="corp.javin.io"
REMOTE_DIR="/var/www/${APP_NAME}"

# Allow overriding app name via flag
while [[ "$#" -gt 0 ]]; do
  case $1 in
    --app-name) APP_NAME="$2"; REMOTE_DIR="/var/www/${APP_NAME}"; shift ;;
    *) echo "Unknown flag: $1"; exit 1 ;;
  esac
  shift
done

# ── Colors ────────────────────────────────────────────────────────────────────
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${YELLOW}▶ Deploying /${APP_NAME} → ${REMOTE_HOST}${NC}"

# ── Step 1: Patch vite.config.js base path ───────────────────────────────────
echo -e "${YELLOW}  [1/4] Setting vite base to /${APP_NAME}/${NC}"

if [ ! -f "vite.config.js" ] && [ ! -f "vite.config.ts" ]; then
  echo -e "${RED}  ✗ No vite.config.js found. Are you in the project root?${NC}"
  exit 1
fi

CONFIG_FILE="vite.config.js"
[ -f "vite.config.ts" ] && CONFIG_FILE="vite.config.ts"

# Patch base if it exists, otherwise insert after defineConfig({
if grep -q "base:" "$CONFIG_FILE"; then
  sed -i.bak "s|base:.*|base: '/${APP_NAME}/',|" "$CONFIG_FILE"
else
  sed -i.bak "s|defineConfig({|defineConfig({\n  base: '/${APP_NAME}/',|" "$CONFIG_FILE"
fi

echo -e "${GREEN}  ✓ vite config patched${NC}"

# ── Step 2: Install deps if node_modules missing ──────────────────────────────
if [ ! -d "node_modules" ]; then
  echo -e "${YELLOW}  [2/4] node_modules missing — running npm install${NC}"
  npm install
else
  echo -e "${GREEN}  [2/4] node_modules present — skipping install${NC}"
fi

# ── Step 3: Build ─────────────────────────────────────────────────────────────
echo -e "${YELLOW}  [3/4] Building...${NC}"
npm run build
echo -e "${GREEN}  ✓ Build complete → ./dist${NC}"

# ── Step 4: Sync to server ────────────────────────────────────────────────────
echo -e "${YELLOW}  [4/4] Syncing to ${REMOTE_HOST}:${REMOTE_DIR}${NC}"

ssh "${REMOTE_USER}@${REMOTE_HOST}" "sudo mkdir -p ${REMOTE_DIR} && sudo chown -R \${USER}:\${USER} ${REMOTE_DIR}"

rsync -avz --delete \
  --exclude='.DS_Store' \
  --rsync-path="sudo rsync" \
  dist/ "${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_DIR}/"

echo -e "${GREEN}  ✓ Files synced${NC}"

# ── Done ──────────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}✅ Deployed successfully!${NC}"
echo -e "   https://${REMOTE_HOST}/${APP_NAME}/"
echo ""
echo -e "${YELLOW}Reminder: nginx location block must exist for /${APP_NAME}/${NC}"
echo -e "  If this is a new app, add to /etc/nginx/sites-available/corp.javin.io:"
echo ""
echo "    location /${APP_NAME}/ {"
echo "        alias /var/www/${APP_NAME}/;"
echo "        index index.html;"
echo "        try_files \$uri \$uri/ /${APP_NAME}/index.html;"
echo "    }"
echo ""

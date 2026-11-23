#!/usr/bin/env bash
# Deploy ke garap.net lewat SSH (host "garap-remote" di ~/.ssh/config).
# Usage: ./deploy-garap.sh [web|api|all]   (default: all)
set -euo pipefail

TARGET="${1:-all}"
REMOTE="garap-remote"
ROOT="$(cd "$(dirname "$0")" && pwd)"
# backend-nodejs di-gitignore: ada di checkout utama, bukan di worktree
API_SRC="${API_SRC:-$HOME/Project/Vertoniksmartfarm/backend-nodejs}"

deploy_web() {
  echo "==> Build web"
  (cd "$ROOT/react-web-app" && npm run build)
  echo "==> Backup + upload web -> /var/www/vertonik"
  ssh "$REMOTE" 'sudo cp -a /var/www/vertonik "/var/www/vertonik.bak-$(date +%Y%m%d-%H%M%S)"'
  rsync -az --rsync-path="sudo -u www-data rsync" "$ROOT/react-web-app/dist/" "$REMOTE:/var/www/vertonik/"
}

deploy_api() {
  echo "==> Upload backend -> /opt/vertonik/backend (.env & node_modules dilewati)"
  rsync -az --exclude node_modules --exclude .env --exclude '.git' --exclude '*.log' \
    --rsync-path="sudo -u vertonik rsync" "$API_SRC/" "$REMOTE:/opt/vertonik/backend/"
  ssh "$REMOTE" 'cd /opt/vertonik/backend && sudo -u vertonik npm install --omit=dev --no-audit --no-fund --silent && sudo systemctl restart vertonik-api'
  ssh "$REMOTE" 'sleep 2; curl -s -o /dev/null -w "API: %{http_code}\n" http://127.0.0.1:8000/login'
}

case "$TARGET" in
  web) deploy_web ;;
  api) deploy_api ;;
  all) deploy_web; deploy_api ;;
  *) echo "Pakai: $0 [web|api|all]"; exit 1 ;;
esac
echo "Selesai."

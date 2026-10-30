#!/usr/bin/env bash
# Jalankan seluruh stack GARAP secara lokal (macOS).
# Usage: ./jalankan-local.sh
set -euo pipefail

P1_PG="127.0.0.1:5432"
P1_LARAVEL="127.0.0.1:8000"
P1_REACT="127.0.0.1:5173"

up() { curl -s -o /dev/null --max-time 2 "$2" 2>/dev/null; }

echo "==> [1/3] PostgreSQL 17"
if ! pgrep -f 'postgres -D /opt/homebrew/var/postgresql@17' >/dev/null; then
  brew services start postgresql@17
fi
/opt/homebrew/opt/postgresql@17/bin/pg_isready -h 127.0.0.1 -p 5432

echo "==> [2/3] Backend Node.js (:8000)"
if ! up laravel "http://$P1_LARAVEL/login"; then
  ( cd "$HOME/Project/Vertoniksmartfarm/backend-nodejs" && nohup node src/index.js >/tmp/vsf-backend.log 2>&1 & )
  for i in $(seq 1 15); do up laravel "http://$P1_LARAVEL/login" && break; sleep 1; done
fi
echo "    $(curl -s -o /dev/null -w '%{http_code}' --max-time 3 http://$P1_LARAVEL/login) http://$P1_LARAVEL/login"

echo "==> [3/3] React SPA (:5173)"
if ! up react "http://$P1_REACT/"; then
  ( cd "$HOME/Project/Vertoniksmartfarm/react-web-app" && nohup npm run dev -- --host 127.0.0.1 --port=5173 >/tmp/vsf-react.log 2>&1 & )
  for i in $(seq 1 20); do up react "http://$P1_REACT/" && break; sleep 1; done
fi
echo "    $(curl -s -o /dev/null -w '%{http_code}' --max-time 3 http://$P1_REACT/) http://$P1_REACT/ (buka /dashboard)"

echo
echo "Semua jalan. Login web: admin — password lihat backend-nodejs/.env (kunci ADMIN_PASSWORD)"
echo "  Backend : http://$P1_LARAVEL"
echo "  Web SPA : http://$P1_REACT/dashboard"

#!/usr/bin/env bash
#
# Production deploy: pull latest code, rebuild, restart the Node process.
#
# Prerequisites on the VPS:
#   - .env with VITE_API_URL=https://api.devl0pr.com (needed at build time)
#   - Node.js + npm installed
#   - A process manager serving adapter-node on :3000, e.g.:
#       sudo systemctl enable --now runbook-front
#     Unit ExecStart: /usr/bin/node /var/www/runbook_front/build
#     Environment: PORT=3000 HOST=127.0.0.1
#
# Usage:  ./bin/deploy.sh
#
set -euo pipefail
cd "$(dirname "$0")/.."

if [ ! -f .env ]; then
	echo "Missing .env — create it with VITE_API_URL before deploying." >&2
	exit 1
fi

echo "==> Pulling latest changes"
git pull --ff-only

echo "==> Installing dependencies"
npm ci

echo "==> Building"
npm run build

SERVICE_NAME="${RUNBOOK_FRONT_SERVICE:-runbook-front}"

echo "==> Restarting app"
if systemctl cat "${SERVICE_NAME}.service" >/dev/null 2>&1; then
	sudo systemctl restart "${SERVICE_NAME}"
elif command -v pm2 >/dev/null 2>&1 && pm2 describe "${SERVICE_NAME}" >/dev/null 2>&1; then
	pm2 restart "${SERVICE_NAME}"
else
	echo "Build finished, but no systemd unit or pm2 app named '${SERVICE_NAME}' was found." >&2
	echo "Start the app once (PORT=3000 node build) and wire systemd/pm2, then redeploy." >&2
	exit 1
fi

cat <<EOF

==> Deploy complete.
   Front: http://localhost:3000  (Caddy should reverse-proxy to this)
EOF

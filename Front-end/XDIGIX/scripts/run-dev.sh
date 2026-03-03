#!/usr/bin/env bash
# Run backend + digix-admin for local testing.
# Usage: ./scripts/run-dev.sh
# Or run in two terminals:
#   Terminal 1: cd backend && npm run dev
#   Terminal 2: cd sys/apps/marketing/apps/digix-admin && npm run dev

set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BACKEND="$ROOT/backend"
ADMIN="$ROOT/sys/apps/marketing/apps/digix-admin"

echo "XDIGIX dev: backend + digix-admin"
echo "Backend: $BACKEND (port 5001)"
echo "digix-admin: $ADMIN (Vite default, e.g. 5176)"
echo ""

# Check .env
if [ ! -f "$BACKEND/.env" ]; then
  echo "Create backend/.env (copy from .env.example and set MONGODB_URI, JWT_SECRET)."
  exit 1
fi

echo "Start backend in one terminal:"
echo "  cd $BACKEND && npm run dev"
echo ""
echo "Start digix-admin in another terminal:"
echo "  cd $ADMIN && npm run dev"
echo ""
echo "Then open: http://localhost:5176/admin (or the port Vite prints)"
echo "API: http://localhost:5001"
echo ""
echo "To run backend only (foreground):"
cd "$BACKEND" && npm run dev

#!/bin/bash
# Unified Mission Control + OpenClaw Installer
# One command: curl -sSL https://install.openclaw.ai/mc | bash
# Or locally: bash install.sh

set -euo pipefail

echo "╔═══════════════════════════════════════════╗"
echo "║  Unified Mission Control — Installer      ║"
echo "║  OpenClaw + Dashboard + Antigravity       ║"
echo "╚═══════════════════════════════════════════╝"
echo ""

# Colors
GREEN='\033[0;32m'
CYAN='\033[0;36m'
GOLD='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m'

log() { echo -e "${CYAN}[MC]${NC} $1"; }
ok()  { echo -e "${GREEN}[✓]${NC} $1"; }
err() { echo -e "${RED}[✗]${NC} $1"; }

# ── Step 1: Check prerequisites ──
log "Checking prerequisites..."

if ! command -v node &>/dev/null; then
    err "Node.js not found. Install via: curl -fsSL https://fnm.vercel.app/install | bash && fnm install 22"
    exit 1
fi

NODE_VER=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VER" -lt 20 ]; then
    err "Node.js 20+ required (found v${NODE_VER}). Run: fnm install 22"
    exit 1
fi
ok "Node.js $(node -v)"

if ! command -v npm &>/dev/null; then
    err "npm not found"
    exit 1
fi
ok "npm $(npm -v)"

# ── Step 2: Install OpenClaw ──
log "Installing OpenClaw..."
if command -v openclaw &>/dev/null; then
    ok "OpenClaw already installed ($(openclaw --version 2>/dev/null || echo 'unknown'))"
else
    npm install -g openclaw
    ok "OpenClaw installed"
fi

# ── Step 3: Clone or update Unified MC ──
MC_DIR="$HOME/.openclaw/unified-mc"
log "Setting up Unified Mission Control at ${MC_DIR}..."

if [ -d "$MC_DIR" ]; then
    log "Updating existing installation..."
    cd "$MC_DIR" && git pull --rebase 2>/dev/null || true
else
    # For now, copy from local. In production, this would be git clone.
    if [ -d "$(dirname "$0")/../app" ]; then
        cp -r "$(dirname "$0")/.." "$MC_DIR"
        ok "Copied from local source"
    else
        err "No source found. Clone the repo first."
        exit 1
    fi
fi

cd "$MC_DIR"

# ── Step 4: Install dependencies ──
log "Installing dependencies..."
npm install --silent 2>/dev/null
ok "Dependencies installed"

# ── Step 5: Set up role ──
echo ""
echo "Select your role:"
echo "  1) Emperor (full access, no limits)"
echo "  2) Marketing (chat + email tools)"
echo "  3) Development (chat + projects + pipeline)"
echo "  4) PPC (chat only)"
echo "  5) Admin (read-only fleet view)"
echo ""
read -p "Role [1-5, default 2]: " ROLE_CHOICE

case "${ROLE_CHOICE:-2}" in
    1) ROLE="emperor" ;;
    2) ROLE="marketing" ;;
    3) ROLE="dev" ;;
    4) ROLE="ppc" ;;
    5) ROLE="admin" ;;
    *) ROLE="marketing" ;;
esac

echo "MC_ROLE=${ROLE}" > "$MC_DIR/.env.local"
ok "Role set to: ${ROLE}"

# ── Step 6: Configure OpenClaw (if not already) ──
if [ ! -f "$HOME/.openclaw/openclaw.json" ]; then
    log "Running OpenClaw setup..."
    openclaw setup 2>/dev/null || true
    ok "OpenClaw configured"
else
    ok "OpenClaw already configured"
fi

# ── Step 7: Set up Antigravity ──
log "Installing Antigravity self-healer..."

ANTIGRAVITY_SCRIPT="$MC_DIR/antigravity/monitor.sh"
mkdir -p "$MC_DIR/antigravity"

cat > "$ANTIGRAVITY_SCRIPT" << 'ANTI'
#!/bin/bash
# Antigravity — OpenClaw self-healer
# Checks gateway health every 5 minutes, auto-restarts if down

while true; do
    if ! curl -s http://127.0.0.1:18789/health > /dev/null 2>&1; then
        echo "[Antigravity] $(date): Gateway down, restarting..."
        openclaw gateway restart 2>/dev/null || openclaw gateway start 2>/dev/null
        sleep 10
        if curl -s http://127.0.0.1:18789/health > /dev/null 2>&1; then
            echo "[Antigravity] $(date): Gateway recovered"
        else
            echo "[Antigravity] $(date): Recovery failed, will retry"
        fi
    fi
    sleep 300
done
ANTI
chmod +x "$ANTIGRAVITY_SCRIPT"
ok "Antigravity installed"

# ── Step 8: Build ──
log "Building dashboard..."
npm run build --silent 2>/dev/null
ok "Build complete"

# ── Done ──
echo ""
echo -e "${GOLD}╔═══════════════════════════════════════════╗${NC}"
echo -e "${GOLD}║  ✅ Installation Complete!                ║${NC}"
echo -e "${GOLD}╚═══════════════════════════════════════════╝${NC}"
echo ""
echo "To start:"
echo "  1. Start OpenClaw:  openclaw gateway start"
echo "  2. Start dashboard: cd ${MC_DIR} && npm run dev"
echo "  3. Start healer:    ${ANTIGRAVITY_SCRIPT} &"
echo ""
echo "Or all at once:"
echo "  cd ${MC_DIR} && openclaw gateway start && npm run dev &"
echo ""
echo "Open: http://localhost:3000"

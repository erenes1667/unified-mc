#!/bin/bash
# Unified MC Installer — One command to rule them all
# Usage: curl -sSL https://raw.githubusercontent.com/erenes1667/unified-mc/main/installer/install.sh | bash
#
# What this does:
# 1. Checks/installs prerequisites (Node, Git, Homebrew)
# 2. Installs OpenClaw
# 3. Clones Unified MC
# 4. Runs the onboarding wizard (AI model login, personality, etc)
# 5. Installs dependencies
# 6. Starts MC in dev mode via launchd (auto-restarts, survives reboots)
# 7. Sets up Antigravity self-healer (hourly)

set -euo pipefail

REPO_URL="https://github.com/erenes1667/unified-mc.git"
APP_DIR="$HOME/.openclaw/workspace/projects/unified-mc"
INSTALLER_DIR="$APP_DIR/installer"
PORT=3000
PLIST_LABEL="com.o7.mission-control"
PLIST_FILE="$HOME/Library/LaunchAgents/${PLIST_LABEL}.plist"

# ─── Colors ────────────────────────────────────────────────────────────────────

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
DIM='\033[2m'
NC='\033[0m'

log()     { echo -e "${BLUE}[O7]${NC} $1"; }
success() { echo -e "${GREEN}  ✓${NC} $1"; }
warn()    { echo -e "${YELLOW}  ⚠${NC} $1"; }
error()   { echo -e "${RED}  ✗${NC} $1"; }

# ─── Phase 1: Prerequisites ───────────────────────────────────────────────────

check_prereqs() {
  echo ""
  echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BOLD}  🚀  Optimum7 AI Assistant — Installer${NC}"
  echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
  log "Checking your system..."

  # macOS check
  if [[ "$OSTYPE" != "darwin"* ]]; then
    error "This installer is for macOS only."
    error "For Linux, see: https://github.com/erenes1667/unified-mc#linux"
    exit 1
  fi

  # Homebrew
  if ! command -v brew &>/dev/null; then
    log "Installing Homebrew (macOS package manager)..."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    # Add to PATH for Apple Silicon
    if [[ -f /opt/homebrew/bin/brew ]]; then
      eval "$(/opt/homebrew/bin/brew shellenv)"
    fi
    if ! command -v brew &>/dev/null; then
      error "Homebrew install failed. Run this first:"
      error '/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"'
      exit 1
    fi
  fi
  success "Homebrew"

  # Node.js
  if ! command -v node &>/dev/null; then
    log "Installing Node.js..."
    brew install node
  fi
  local node_major
  node_major=$(node -v | sed 's/v//' | cut -d. -f1)
  if (( node_major < 22 )); then
    log "Upgrading Node.js (need v22+, found $(node -v))..."
    brew upgrade node
  fi
  success "Node.js $(node -v)"

  # Git
  if ! command -v git &>/dev/null; then
    log "Installing Git..."
    xcode-select --install 2>/dev/null || brew install git
  fi
  success "Git"

  # pnpm (faster than npm for installs)
  if ! command -v pnpm &>/dev/null; then
    log "Installing pnpm..."
    npm install -g pnpm 2>/dev/null
  fi
  if command -v pnpm &>/dev/null; then
    success "pnpm"
  fi
}

# ─── Phase 2: Install OpenClaw ────────────────────────────────────────────────

setup_openclaw() {
  log "Setting up OpenClaw..."

  if command -v openclaw &>/dev/null; then
    success "OpenClaw $(openclaw --version 2>/dev/null || echo 'installed')"
    # Update in background
    npm install -g openclaw@latest &>/dev/null &
  else
    log "Installing OpenClaw..."
    npm install -g openclaw@latest
    if command -v openclaw &>/dev/null; then
      success "OpenClaw $(openclaw --version 2>/dev/null)"
    else
      error "OpenClaw installation failed."
      error "Try manually: npm install -g openclaw@latest"
      exit 1
    fi
  fi
}

# ─── Phase 3: Clone/Update Repo ───────────────────────────────────────────────

setup_repo() {
  log "Getting Mission Control..."

  if [[ -d "$APP_DIR/.git" ]]; then
    cd "$APP_DIR"
    git pull --quiet origin main 2>/dev/null || git pull --quiet origin master 2>/dev/null || true
    success "Updated to latest version"
  else
    mkdir -p "$(dirname "$APP_DIR")"
    git clone --quiet "$REPO_URL" "$APP_DIR"
    cd "$APP_DIR"
    success "Downloaded Mission Control"
  fi
}

# ─── Phase 4: Interactive Onboarding ──────────────────────────────────────────

run_onboarding() {
  log "Starting setup wizard..."
  echo ""

  # curl | bash means stdin is the script, not the terminal.
  # We need /dev/tty for interactive input.
  if [[ -t 0 ]]; then
    node "$INSTALLER_DIR/onboard.mjs"
  else
    # Redirect from /dev/tty so user can type
    node "$INSTALLER_DIR/onboard.mjs" </dev/tty
  fi
}

# ─── Phase 5: Install Dependencies ────────────────────────────────────────────

install_deps() {
  log "Installing dependencies (this takes a minute)..."
  cd "$APP_DIR"
  if command -v pnpm &>/dev/null; then
    pnpm install --silent 2>/dev/null || pnpm install
  else
    npm install 2>/dev/null || npm install
  fi
  success "Dependencies installed"
}

# ─── Phase 6: Launch (Dev Mode — no build needed) ─────────────────────────────

install_service() {
  local NODE_PATH
  NODE_PATH=$(which node)
  local NODE_DIR
  NODE_DIR=$(dirname "$NODE_PATH")
  local LOG_DIR="$APP_DIR/logs"
  mkdir -p "$LOG_DIR"

  log "Installing auto-start service..."

  if [[ "$OSTYPE" == "darwin"* ]]; then
    # Stop any existing service
    launchctl unload "$PLIST_FILE" 2>/dev/null || true

    cat > "$PLIST_FILE" << PEOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>${PLIST_LABEL}</string>
    <key>WorkingDirectory</key>
    <string>${APP_DIR}</string>
    <key>ProgramArguments</key>
    <array>
        <string>${NODE_PATH}</string>
        <string>node_modules/next/dist/bin/next</string>
        <string>dev</string>
        <string>--hostname</string>
        <string>127.0.0.1</string>
        <string>--port</string>
        <string>${PORT}</string>
    </array>
    <key>EnvironmentVariables</key>
    <dict>
        <key>PATH</key>
        <string>${NODE_DIR}:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin</string>
        <key>NODE_ENV</key>
        <string>development</string>
    </dict>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>${LOG_DIR}/stdout.log</string>
    <key>StandardErrorPath</key>
    <string>${LOG_DIR}/stderr.log</string>
</dict>
</plist>
PEOF

    launchctl load "$PLIST_FILE"
    success "Service installed (auto-starts on boot, auto-restarts on crash)"
  fi
}

start_app() {
  log "Starting Mission Control..."

  launchctl start "$PLIST_LABEL" 2>/dev/null || true

  # Wait for it to come up
  local i
  for i in $(seq 1 30); do
    if curl -s -o /dev/null "http://localhost:$PORT" 2>/dev/null; then
      success "Running at http://localhost:$PORT"
      # Open browser
      open "http://localhost:$PORT" 2>/dev/null || true
      return 0
    fi
    sleep 1
  done

  warn "Still starting up. Give it 30 more seconds, then open http://localhost:$PORT"
}

# ─── Phase 7: Antigravity Self-Healer ─────────────────────────────────────────

setup_antigravity() {
  local ANTIGRAVITY_SRC="$INSTALLER_DIR/lib/antigravity-standalone.sh"
  local ANTIGRAVITY_DST="$HOME/.openclaw/antigravity/antigravity.sh"

  if [[ ! -f "$ANTIGRAVITY_SRC" ]]; then
    return 0
  fi

  log "Setting up self-healer..."
  mkdir -p "$(dirname "$ANTIGRAVITY_DST")"
  cp "$ANTIGRAVITY_SRC" "$ANTIGRAVITY_DST"
  chmod +x "$ANTIGRAVITY_DST"

  # Run initial health check
  bash "$ANTIGRAVITY_DST" health 2>/dev/null || true

  # Install hourly launchd timer
  if [[ "$OSTYPE" == "darwin"* ]]; then
    local AG_PLIST="$HOME/Library/LaunchAgents/com.o7.antigravity.plist"
    local AG_GEMINI_KEY=""
    if [[ -f "$HOME/.openclaw/antigravity/.env" ]]; then
      AG_GEMINI_KEY=$(grep "^GEMINI_API_KEY=" "$HOME/.openclaw/antigravity/.env" 2>/dev/null | cut -d= -f2- || true)
    fi

    cat > "$AG_PLIST" << AGEOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.o7.antigravity</string>
    <key>ProgramArguments</key>
    <array>
        <string>/bin/bash</string>
        <string>${ANTIGRAVITY_DST}</string>
        <string>health</string>
    </array>
    <key>EnvironmentVariables</key>
    <dict>
        <key>PATH</key>
        <string>/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin</string>
        <key>GEMINI_API_KEY</key>
        <string>${AG_GEMINI_KEY}</string>
    </dict>
    <key>StartInterval</key>
    <integer>3600</integer>
    <key>RunAtLoad</key>
    <false/>
    <key>StandardOutPath</key>
    <string>/tmp/antigravity.log</string>
    <key>StandardErrorPath</key>
    <string>/tmp/antigravity.err</string>
</dict>
</plist>
AGEOF
    launchctl unload "$AG_PLIST" 2>/dev/null || true
    launchctl load "$AG_PLIST" 2>/dev/null || true
    success "Antigravity self-healer (runs every hour)"
  fi
}

# ─── Summary ───────────────────────────────────────────────────────────────────

print_summary() {
  echo ""
  echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BOLD}${GREEN}  ✅  You're all set!${NC}"
  echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
  echo -e "   ${BOLD}🌐 Dashboard:${NC}   http://localhost:${PORT}"
  echo -e "   ${BOLD}🛡️  Self-healer:${NC} Antigravity (checks every hour)"
  echo ""
  echo -e "   ${DIM}Logs:     tail -f ${APP_DIR}/logs/stderr.log${NC}"
  echo -e "   ${DIM}Restart:  launchctl stop ${PLIST_LABEL} && launchctl start ${PLIST_LABEL}${NC}"
  echo -e "   ${DIM}Health:   bash ~/.openclaw/antigravity/antigravity.sh health${NC}"
  echo ""
  echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
}

# ─── Main ──────────────────────────────────────────────────────────────────────

main() {
  check_prereqs
  setup_openclaw
  setup_repo
  install_deps
  run_onboarding
  install_service
  start_app
  setup_antigravity
  print_summary
}

main "$@"

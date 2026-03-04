#!/bin/bash
# Unified MC Installer — One command to rule them all
# Usage: curl -sSL https://raw.githubusercontent.com/erenes1667/unified-mc/main/installer/install.sh | bash

set -e

REPO_URL="https://github.com/erenes1667/unified-mc.git"
APP_DIR="$HOME/.openclaw/workspace/projects/unified-mc"
INSTALLER_DIR="$APP_DIR/installer"
PORT=5173
PLIST_LABEL="com.unified-mc"
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

log()     { echo -e "${BLUE}[Unified MC]${NC} $1"; }
success() { echo -e "${GREEN}   ✓${NC} $1"; }
warn()    { echo -e "${YELLOW}   ⚠ ${NC} $1"; }
error()   { echo -e "${RED}   ✗${NC} $1"; }

# ─── Phase 1: Prerequisites ───────────────────────────────────────────────────

check_prereqs() {
  echo ""
  echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BOLD}  🚀  Unified Mission Control Installer${NC}"
  echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
  log "Checking prerequisites..."

  # Node.js
  if ! command -v node &> /dev/null; then
    warn "Node.js not found."
    if command -v brew &> /dev/null; then
      log "Installing Node.js via Homebrew..."
      brew install node
    else
      error "Node.js is required. Install it from https://nodejs.org"
      error "Or install Homebrew first: /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
      exit 1
    fi
  fi

  NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
  if [ "$NODE_VERSION" -lt 18 ]; then
    error "Node.js 18+ required. Found: $(node -v)"
    error "Update with: brew upgrade node  (or visit https://nodejs.org)"
    exit 1
  fi
  success "Node.js $(node -v)"

  # Git
  if ! command -v git &> /dev/null; then
    warn "Git not found."
    if command -v brew &> /dev/null; then
      log "Installing Git via Homebrew..."
      brew install git
    else
      error "Git is required. Install Xcode Command Line Tools: xcode-select --install"
      exit 1
    fi
  fi
  success "Git available"
}

# ─── Phase 2: Install OpenClaw ────────────────────────────────────────────────

setup_openclaw() {
  log "Checking OpenClaw..."

  if command -v openclaw &> /dev/null; then
    success "OpenClaw already installed"
  else
    log "Installing OpenClaw globally..."
    npm install -g openclaw 2>/dev/null || warn "OpenClaw not available via npm (skipping)"
  fi
}

# ─── Phase 3: Clone/Update Repo ───────────────────────────────────────────────

setup_repo() {
  log "Setting up repository..."

  if [ -d "$APP_DIR/.git" ]; then
    log "Existing repo found, pulling updates..."
    cd "$APP_DIR"
    git pull origin main 2>/dev/null || git pull origin master 2>/dev/null || warn "Could not pull updates (continuing with existing)"
  else
    log "Cloning fresh repo..."
    mkdir -p "$(dirname "$APP_DIR")"
    git clone "$REPO_URL" "$APP_DIR"
    cd "$APP_DIR"
  fi
  success "Repository ready at $APP_DIR"
}

# ─── Phase 4: Interactive Onboarding ──────────────────────────────────────────

run_onboarding() {
  log "Starting onboarding wizard..."
  echo ""

  if [ -t 0 ]; then
    # Interactive terminal — run the wizard
    node "$INSTALLER_DIR/onboard.mjs"
  else
    # Piped input (curl | bash) — still try interactive via /dev/tty
    node "$INSTALLER_DIR/onboard.mjs" < /dev/tty
  fi
}

# ─── Phase 5: Build & Launch ──────────────────────────────────────────────────

install_deps() {
  log "Installing dependencies..."
  cd "$APP_DIR"
  npm install --production=false 2>&1 | tail -1
  success "Dependencies installed"
}

build_app() {
  log "Building application..."
  cd "$APP_DIR"
  npm run build 2>&1 | tail -3
  success "Build complete"
}

install_service() {
  if [[ "$OSTYPE" != "darwin"* ]]; then
    warn "Auto-start is only supported on macOS for now."
    warn "Start manually with: cd $APP_DIR && npm start"
    return
  fi

  log "Installing auto-start service..."

  NODE_PATH=$(which node)
  SERVER_JS="$APP_DIR/.next/server/server.js"
  LOG_DIR="$APP_DIR/logs"
  mkdir -p "$LOG_DIR"

  # Generate plist from template
  sed \
    -e "s|{{NODE_PATH}}|${NODE_PATH}|g" \
    -e "s|{{SERVER_JS}}|${SERVER_JS}|g" \
    -e "s|{{APP_DIR}}|${APP_DIR}|g" \
    -e "s|{{PORT}}|${PORT}|g" \
    -e "s|{{LOG_DIR}}|${LOG_DIR}|g" \
    -e "s|{{PLIST_LABEL}}|${PLIST_LABEL}|g" \
    "$INSTALLER_DIR/com.unified-mc.plist.tmpl" > "$PLIST_FILE"

  launchctl unload "$PLIST_FILE" 2>/dev/null || true
  launchctl load "$PLIST_FILE"

  success "LaunchAgent installed — auto-starts on boot"
}

start_app() {
  log "Starting application..."

  if [[ "$OSTYPE" == "darwin"* ]]; then
    launchctl start "$PLIST_LABEL" 2>/dev/null || true
  fi

  log "Waiting for server..."
  for i in {1..30}; do
    if curl -s "http://localhost:$PORT" > /dev/null 2>&1; then
      success "Server running at http://localhost:$PORT"
      return 0
    fi
    sleep 1
  done

  warn "Server didn't respond in 30s. It may still be starting."
  warn "Check manually: curl http://localhost:$PORT"
}

# ─── Final Summary ────────────────────────────────────────────────────────────

print_summary() {
  echo ""
  echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BOLD}${GREEN}  ✅  Installation Complete!${NC}"
  echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
  echo -e "   ${BOLD}🌐 Open:${NC}      http://localhost:$PORT"
  echo -e "   ${BOLD}📁 App:${NC}       $APP_DIR"
  echo -e "   ${BOLD}⚙️  Config:${NC}    ~/.openclaw/openclaw.json"
  echo ""
  echo -e "   ${DIM}View logs:  tail -f $APP_DIR/logs/stderr.log${NC}"
  echo -e "   ${DIM}Restart:    launchctl stop $PLIST_LABEL && launchctl start $PLIST_LABEL${NC}"
  echo ""
  echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
}

# ─── Main ──────────────────────────────────────────────────────────────────────

main() {
  check_prereqs
  setup_openclaw
  setup_repo
  run_onboarding
  install_deps
  build_app
  install_service
  start_app
  print_summary
}

main "$@"

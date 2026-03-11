#!/usr/bin/env bash
# ============================================================
# O7 OpenClaw macOS Installer
# One-click setup for the Optimum7 team
# Usage: bash install.sh
# ============================================================

set -euo pipefail
INSTALLER_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ── Profile isolation ────────────────────────────────────────
PROFILE="default"
while [[ $# -gt 0 ]]; do
  case "$1" in
    --profile) PROFILE="$2"; shift 2 ;;
    *) shift ;;
  esac
done
if [[ "$PROFILE" != "default" ]]; then
  export OPENCLAW_HOME="${HOME}/.openclaw-${PROFILE}"
  mkdir -p "$OPENCLAW_HOME"
fi

source "${INSTALLER_DIR}/lib/ui.sh"
source "${INSTALLER_DIR}/lib/checks.sh"
source "${INSTALLER_DIR}/lib/validate.sh"
source "${INSTALLER_DIR}/lib/auth.sh"
source "${INSTALLER_DIR}/lib/antigravity.sh"

# State file for resuming partial installs
STATE_FILE="${HOME}/.openclaw/.install-state"
mkdir -p "$(dirname "$STATE_FILE")"

state_done() { echo "$1" >> "$STATE_FILE"; }
state_check() { grep -q "^$1$" "$STATE_FILE" 2>/dev/null; }

# ── PHASE 1: Welcome ─────────────────────────────────────────
banner

echo -e "  This installer will set up ${BOLD}OpenClaw + Mission Control${RESET} on your Mac."
echo -e "  It handles everything: dependencies, AI model login, services, and health checks."
echo -e "  Takes about ${BOLD}5-10 minutes${RESET} on a good connection."
echo

if [[ -f "$STATE_FILE" ]]; then
  warn "Found a previous install attempt. Resuming from where it left off."
  info "Delete ${STATE_FILE} to start fresh."
  echo
fi

confirm "Ready to start?" || { echo "Aborted."; exit 0; }
log "=== INSTALL STARTED $(date) ==="

# ── Detect existing OpenClaw install ─────────────────────────
EXISTING_INSTALL=false
SKIP_AUTH=false
SKIP_GATEWAY=false
AUTH_RESULTS=()
if [[ -f "${HOME}/.openclaw/openclaw.json" ]] && command -v openclaw &>/dev/null; then
  EXISTING_INSTALL=true
  echo
  warn "Existing OpenClaw installation detected!"
  info "Config: ~/.openclaw/openclaw.json"
  info "Version: $(openclaw --version 2>/dev/null || echo 'unknown')"
  echo
  if confirm "  Skip auth & gateway setup to preserve your current config?"; then
    SKIP_AUTH=true
    SKIP_GATEWAY=true
    ok "Will preserve existing config. Only updating OpenClaw + Mission Control."
  else
    warn "Proceeding with full setup. Your existing config MAY be overwritten."
    if ! confirm "  Are you sure? This could reset your auth profiles and gateway config."; then
      echo "Aborted. Your config is safe."
      exit 0
    fi
  fi
  echo
fi

# ── PHASE 2: System Checks ───────────────────────────────────
if ! state_check "checks"; then
  run_all_checks || exit 1
  state_done "checks"
else
  ok "System checks already passed — skipping"
fi

# ── PHASE 3: Install OpenClaw ────────────────────────────────
section 2 "Install OpenClaw"

if ! state_check "openclaw"; then
  if command -v openclaw &>/dev/null; then
    local_ver=$(openclaw --version 2>/dev/null | awk '{print $1}')
    ok "OpenClaw already installed (${local_ver})"
    if confirm "  Check for updates?"; then
      npm install -g openclaw@latest &>/dev/null &
      spin $! "Updating OpenClaw..."
      wait $!
    else
      info "Skipping update check."
    fi
  else
    info "Installing OpenClaw..."
    npm install -g openclaw@latest &
    spin $! "Installing OpenClaw (this may take a minute)..."
    wait $!
    if ! command -v openclaw &>/dev/null; then
      fail "OpenClaw install failed."
      heal_install_error "npm install -g openclaw@latest failed"
      exit 1
    fi
  fi
  ok "OpenClaw $(openclaw --version 2>/dev/null)"
  log "OK: OpenClaw installed"
  state_done "openclaw"
else
  ok "OpenClaw already installed — skipping"
fi

# ── PHASE 4: AI Model Auth ───────────────────────────────────
if [[ "$SKIP_AUTH" == "true" ]]; then
  ok "Auth setup skipped — preserving existing config"
elif ! state_check "auth"; then
  run_auth_setup || exit 1
  state_done "auth"
else
  ok "Auth already configured — skipping"
fi

# ── PHASE 5: Role Selection ──────────────────────────────────
section 4 "Your Role"
echo
echo -e "  ${BOLD}What's your role at Optimum7?${RESET}"
echo -e "  ${DIM}This pre-configures the right tools for you.${RESET}"
echo

echo -en "${BOLD}  Type your role: ${RESET}"
read -r SELECTED_ROLE
SELECTED_ROLE="${SELECTED_ROLE:-general}"
ok "Role set: ${SELECTED_ROLE}"
log "ROLE: ${SELECTED_ROLE}"

# ── PHASE 6: OpenClaw Gateway Daemon ─────────────────────────
section 5 "OpenClaw Gateway"

if [[ "$SKIP_GATEWAY" == "true" ]]; then
  ok "Gateway setup skipped — preserving existing config"
elif ! state_check "gateway"; then
  info "Setting up OpenClaw gateway service (auto-starts on boot)..."

  GATEWAY_TOKEN=$(openssl rand -base64 32 | tr -d /=+ | head -c 40)
  GATEWAY_PORT=18789

  openclaw onboard \
    --non-interactive \
    --accept-risk \
    --install-daemon \
    --gateway-auth token \
    --gateway-token "$GATEWAY_TOKEN" \
    --gateway-port "$GATEWAY_PORT" \
    --gateway-bind loopback \
    --flow quickstart \
    2>&1 | while read -r line; do
      echo -e "  ${DIM}${line}${RESET}"
    done

  sleep 3

  if curl -s "http://localhost:${GATEWAY_PORT}/health" &>/dev/null; then
    ok "OpenClaw gateway running on port ${GATEWAY_PORT}"
    log "OK: Gateway started on ${GATEWAY_PORT}"
    state_done "gateway"
  else
    warn "Gateway may still be starting up..."
    heal_install_error "openclaw gateway not responding on port ${GATEWAY_PORT}"
  fi
else
  ok "Gateway already configured — skipping"
fi

# ── PHASE 7: Mission Control ──────────────────────────────────
section 6 "Mission Control Dashboard"

MC_DIR="${HOME}/projects/unified-mc"
MC_REPO="https://github.com/erenes1667/unified-mc.git"

if ! state_check "mc"; then
  if [[ -d "$MC_DIR/.git" ]]; then
    info "Mission Control already cloned. Pulling latest..."
    git -C "$MC_DIR" pull --rebase --quiet &
    spin $! "Updating Mission Control..."
    wait $!
  else
    info "Cloning Mission Control..."
    mkdir -p "$(dirname "$MC_DIR")"
    git clone --quiet "$MC_REPO" "$MC_DIR" &
    spin $! "Cloning Mission Control..."
    wait $!
  fi

  if [[ ! -d "$MC_DIR" ]]; then
    fail "Could not get Mission Control from ${MC_REPO}"
    info "Ask Enes to share access to the repo."
    log "FAIL: MC clone failed"
  else
    info "Installing dependencies..."
    cd "$MC_DIR"
    pnpm install --silent &
    spin $! "Installing dependencies..."
    wait $!

    ok "Mission Control ready"
    log "OK: Mission Control installed at ${MC_DIR}"
    state_done "mc"
  fi
else
  ok "Mission Control already set up — skipping"
fi

# ── PHASE 8: Mission Control launchd Service ──────────────────
section 7 "Mission Control Service"

if ! state_check "mc-daemon" && [[ -d "$MC_DIR" ]]; then
  MC_PLIST="${HOME}/Library/LaunchAgents/com.o7.mission-control.plist"
  NODE_BIN=$(which node)
  NODE_DIR=$(dirname "$NODE_BIN")

  cat > "$MC_PLIST" << PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.o7.mission-control</string>
    <key>WorkingDirectory</key>
    <string>${MC_DIR}</string>
    <key>ProgramArguments</key>
    <array>
        <string>${NODE_BIN}</string>
        <string>node_modules/next/dist/bin/next</string>
        <string>dev</string>
        <string>--hostname</string>
        <string>127.0.0.1</string>
    </array>
    <key>EnvironmentVariables</key>
    <dict>
        <key>PATH</key>
        <string>${NODE_DIR}:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin</string>
        <key>NODE_ENV</key>
        <string>development</string>
        <key>PORT</key>
        <string>18790</string>
    </dict>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>/tmp/mission-control.log</string>
    <key>StandardErrorPath</key>
    <string>/tmp/mission-control.err</string>
</dict>
</plist>
PLIST

  launchctl unload "$MC_PLIST" 2>/dev/null || true
  launchctl load "$MC_PLIST"

  sleep 5
  if curl -s -o /dev/null -w "%{http_code}" http://localhost:18790 --max-time 10 | grep -qE "200|307"; then
    ok "Mission Control running at http://localhost:18790"
    log "OK: Mission Control daemon installed"
    state_done "mc-daemon"
    open "http://localhost:18790" 2>/dev/null || true
  else
    warn "Mission Control is starting (can take 30s on first boot)"
    info "It will be available at http://localhost:18790 shortly"
    log "WARN: MC not yet responding, but daemon installed"
    state_done "mc-daemon"
  fi
else
  ok "Mission Control service already configured — skipping"
fi

# ── PHASE 9: Antigravity ──────────────────────────────────────
setup_antigravity

# ── PHASE 10: Summary ─────────────────────────────────────────
section 10 "Setup Complete"
echo
echo -e "${BOLD}${GREEN}  🎉 OpenClaw is installed and running!${RESET}"
echo
echo -e "${BOLD}  What's set up:${RESET}"

# Auth results
for result in "${AUTH_RESULTS[@]}"; do
  provider=$(echo "$result" | cut -d: -f1)
  status=$(echo "$result" | cut -d: -f2)
  case "$status" in
    ok)      summary_row "  ✅ ${provider^}" "working" ;;
    skipped) summary_row "  ⏭️  ${provider^}" "skipped (set up later)" ;;
    failed)  summary_row "  ❌ ${provider^}" "failed (needs attention)" ;;
  esac
done

echo
echo -e "${BOLD}  Services:${RESET}"
summary_row "  🦞 OpenClaw Gateway" "localhost:18789 (auto-start)"
summary_row "  📊 Mission Control" "http://localhost:18790 (auto-start)"
summary_row "  🛡️  Antigravity" "every 30 min (auto-heal)"
echo
echo -e "${BOLD}  Quick links:${RESET}"
echo -e "  ${CYAN}→ Mission Control:${RESET}  http://localhost:18790"
echo -e "  ${CYAN}→ Docs:${RESET}             https://docs.openclaw.ai"
echo -e "  ${CYAN}→ Discord:${RESET}          https://discord.gg/clawd"
echo
echo -e "${BOLD}  Useful commands:${RESET}"
echo -e "  ${DIM}openclaw gateway status${RESET}  — check gateway"
echo -e "  ${DIM}openclaw configure${RESET}        — add/fix auth profiles"
echo -e "  ${DIM}openclaw agent --message 'hi'${RESET} — test your AI"
echo
echo -e "${DIM}  Install log: ${HOME}/.openclaw/install.log${RESET}"
echo

rm -f "$STATE_FILE"
log "=== INSTALL COMPLETE $(date) role=${SELECTED_ROLE} ==="

#!/usr/bin/env bash
# Antigravity Standalone Health Checker
# Bundled with the installer — works on a fresh machine with just Node + OpenClaw.
# No external dependencies. No workspace assumptions.
# Checks the basics and fixes what it can. Calls Gemini for complex issues.

OPENCLAW_DIR="${HOME}/.openclaw"
ANTIGRAVITY_DIR="${OPENCLAW_DIR}/antigravity"
HEAL_LOG="${ANTIGRAVITY_DIR}/heal-history.jsonl"
HEALTH_LOG="${ANTIGRAVITY_DIR}/health.log"

mkdir -p "$ANTIGRAVITY_DIR"

# ─── Colors ────────────────────────────────────────────────────────────────────
if [[ -t 1 ]]; then
  GREEN='\033[0;32m' RED='\033[0;31m' YELLOW='\033[1;33m'
  CYAN='\033[0;36m' DIM='\033[2m' BOLD='\033[1m' RESET='\033[0m'
else
  GREEN='' RED='' YELLOW='' CYAN='' DIM='' BOLD='' RESET=''
fi

ok()   { echo -e "${GREEN}✅ $*${RESET}"; }
warn() { echo -e "${YELLOW}⚠️  $*${RESET}"; }
fail() { echo -e "${RED}❌ $*${RESET}"; }
info() { echo -e "${CYAN}ℹ️  $*${RESET}"; }

heal_log() {
  echo "{\"ts\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"check\":\"$1\",\"status\":\"$2\",\"detail\":\"$3\"}" >> "$HEAL_LOG"
}

# ─── Health Checks (all self-contained) ───────────────────────────────────────

check_openclaw_installed() {
  if command -v openclaw &>/dev/null; then
    ok "OpenClaw installed: $(openclaw --version 2>/dev/null)"
    heal_log "openclaw_installed" "ok" "$(openclaw --version 2>/dev/null)"
    return 0
  fi
  fail "OpenClaw not found in PATH"
  heal_log "openclaw_installed" "fail" "not in PATH"
  
  # Auto-fix: try installing
  if command -v npm &>/dev/null; then
    warn "Attempting auto-fix: npm install -g openclaw@latest"
    npm install -g openclaw@latest &>/dev/null
    if command -v openclaw &>/dev/null; then
      ok "Auto-fixed: OpenClaw installed"
      heal_log "openclaw_installed" "healed" "npm install succeeded"
      return 0
    fi
  fi
  return 1
}

check_gateway_running() {
  local port=${OPENCLAW_GATEWAY_PORT:-18789}
  if curl -s --max-time 3 "http://localhost:${port}/health" &>/dev/null; then
    ok "Gateway responding on port ${port}"
    heal_log "gateway_running" "ok" "port ${port}"
    return 0
  fi

  fail "Gateway not responding on port ${port}"
  heal_log "gateway_running" "fail" "port ${port} no response"
  
  # Auto-fix: try starting
  warn "Attempting auto-fix: openclaw gateway start"
  openclaw gateway start &>/dev/null &
  sleep 5
  if curl -s --max-time 3 "http://localhost:${port}/health" &>/dev/null; then
    ok "Auto-fixed: Gateway started"
    heal_log "gateway_running" "healed" "gateway start succeeded"
    return 0
  fi

  # Check if launchd service exists
  if launchctl list 2>/dev/null | grep -q "openclaw"; then
    warn "Attempting: launchctl kickstart"
    launchctl kickstart -k "gui/$(id -u)/com.openclaw.gateway" 2>/dev/null
    sleep 5
    if curl -s --max-time 3 "http://localhost:${port}/health" &>/dev/null; then
      ok "Auto-fixed: Gateway kickstarted via launchd"
      heal_log "gateway_running" "healed" "launchctl kickstart"
      return 0
    fi
  fi
  return 1
}

check_config_valid() {
  local config="${OPENCLAW_DIR}/openclaw.json"
  if [[ ! -f "$config" ]]; then
    fail "No openclaw.json found at ${config}"
    heal_log "config_valid" "fail" "file missing"
    return 1
  fi
  
  # Check valid JSON
  if node -e "JSON.parse(require('fs').readFileSync('${config}','utf8'))" 2>/dev/null; then
    ok "openclaw.json is valid JSON"
    heal_log "config_valid" "ok" ""
    return 0
  fi

  fail "openclaw.json is invalid JSON"
  heal_log "config_valid" "fail" "parse error"
  
  # Auto-fix: try to find backup
  if [[ -f "${config}.bak" ]]; then
    warn "Restoring from backup: openclaw.json.bak"
    cp "${config}.bak" "$config"
    if node -e "JSON.parse(require('fs').readFileSync('${config}','utf8'))" 2>/dev/null; then
      ok "Auto-fixed: restored from backup"
      heal_log "config_valid" "healed" "restored .bak"
      return 0
    fi
  fi
  return 1
}

check_disk_space() {
  local free_gb
  if [[ "$(uname)" == "Darwin" ]]; then
    free_gb=$(df -g / | tail -1 | awk '{print $4}')
  else
    free_gb=$(df -BG / | tail -1 | awk '{print $4}' | tr -d 'G')
  fi
  
  if (( free_gb < 1 )); then
    fail "Critically low disk space: ${free_gb}GB free"
    heal_log "disk_space" "fail" "${free_gb}GB"
    return 1
  elif (( free_gb < 3 )); then
    warn "Low disk space: ${free_gb}GB free (recommend 5GB+)"
    heal_log "disk_space" "warn" "${free_gb}GB"
    return 0
  fi
  ok "Disk space: ${free_gb}GB free"
  heal_log "disk_space" "ok" "${free_gb}GB"
}

check_node_version() {
  if ! command -v node &>/dev/null; then
    fail "Node.js not installed"
    heal_log "node_version" "fail" "not installed"
    return 1
  fi
  local ver major
  ver=$(node -v | sed 's/v//')
  major=$(echo "$ver" | cut -d. -f1)
  if (( major < 22 )); then
    warn "Node.js v${ver} (v22+ recommended)"
    heal_log "node_version" "warn" "v${ver}"
    return 0
  fi
  ok "Node.js v${ver}"
  heal_log "node_version" "ok" "v${ver}"
}

check_auth_profiles() {
  local config="${OPENCLAW_DIR}/openclaw.json"
  [[ ! -f "$config" ]] && return 1
  
  local profile_count
  profile_count=$(node -e "
    try {
      const c = JSON.parse(require('fs').readFileSync('${config}','utf8'));
      const profiles = c.auth?.profiles || {};
      console.log(Object.keys(profiles).length);
    } catch(e) { console.log(0); }
  " 2>/dev/null)
  
  if (( profile_count == 0 )); then
    warn "No auth profiles configured. Run: openclaw configure"
    heal_log "auth_profiles" "warn" "0 profiles"
    return 0
  fi
  ok "${profile_count} auth profile(s) configured"
  heal_log "auth_profiles" "ok" "${profile_count} profiles"
}

check_mission_control() {
  if curl -s -o /dev/null --max-time 3 http://localhost:3000; then
    ok "Mission Control responding on port 3000"
    heal_log "mission_control" "ok" "port 3000"
    return 0
  fi
  
  # Not critical, just warn
  info "Mission Control not running (optional)"
  heal_log "mission_control" "info" "not running"
  return 0
}

# ─── Gemini-powered diagnosis (for complex issues) ────────────────────────────

diagnose_with_gemini() {
  local error_desc="$1"
  # Try loading from .env file
  local gemini_key="${GEMINI_API_KEY:-}"
  if [[ -z "$gemini_key" && -f "${ANTIGRAVITY_DIR}/.env" ]]; then
    gemini_key=$(grep "^GEMINI_API_KEY=" "${ANTIGRAVITY_DIR}/.env" 2>/dev/null | cut -d= -f2-)
  fi
  
  if [[ -z "$gemini_key" ]]; then
    info "Gemini API key not set. Skipping AI diagnosis."
    info "Set GEMINI_API_KEY for smart auto-healing."
    return 1
  fi
  
  info "Asking Gemini to diagnose: ${error_desc}"
  
  local system_info
  system_info=$(cat <<EOF
macOS: $(sw_vers -productVersion 2>/dev/null || echo "unknown")
Node: $(node -v 2>/dev/null || echo "not installed")
OpenClaw: $(openclaw --version 2>/dev/null || echo "not installed")
Disk free: $(df -g / 2>/dev/null | tail -1 | awk '{print $4}')GB
Gateway port: ${OPENCLAW_GATEWAY_PORT:-18789}
Config exists: $(test -f ~/.openclaw/openclaw.json && echo "yes" || echo "no")
EOF
  )
  
  local payload
  payload=$(node -e "
    console.log(JSON.stringify({
      contents: [{
        parts: [{
          text: 'You are a system admin for OpenClaw (AI assistant platform). Diagnose this issue and suggest a specific shell command to fix it. Be concise. One command if possible.\n\nSystem info:\n${system_info}\n\nError: ${error_desc}\n\nRespond with just the fix command, nothing else. If no command can fix it, say MANUAL: and explain in one sentence.'
        }]
      }]
    }));
  " 2>/dev/null)
  
  local response
  response=$(curl -s --max-time 15 \
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${gemini_key}" \
    -H "Content-Type: application/json" \
    -d "$payload" 2>/dev/null)
  
  local fix
  fix=$(node -e "
    try {
      const r = JSON.parse('$(echo "$response" | sed "s/'/\\\\'/g")');
      console.log(r.candidates?.[0]?.content?.parts?.[0]?.text || 'MANUAL: Could not parse response');
    } catch(e) { console.log('MANUAL: API error'); }
  " 2>/dev/null)
  
  if [[ "$fix" == MANUAL:* ]]; then
    info "${fix#MANUAL: }"
    heal_log "gemini_diagnosis" "manual" "$fix"
    return 1
  fi
  
  warn "Gemini suggests: ${fix}"
  heal_log "gemini_diagnosis" "suggestion" "$fix"
  echo "$fix"
}

# ─── Main Entry Points ────────────────────────────────────────────────────────

run_health_check() {
  echo -e "\n${BOLD}🛡️  Antigravity Health Check${RESET}"
  echo -e "${DIM}$(date)${RESET}\n"
  
  local issues=0
  check_node_version     || ((issues++))
  check_openclaw_installed || ((issues++))
  check_config_valid     || ((issues++))
  check_gateway_running  || ((issues++))
  check_auth_profiles
  check_disk_space       || ((issues++))
  check_mission_control
  
  echo
  if (( issues == 0 )); then
    ok "All health checks passed"
    echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) HEALTH_OK" >> "$HEALTH_LOG"
  else
    warn "${issues} issue(s) found (auto-fix attempted where possible)"
    echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) HEALTH_ISSUES=${issues}" >> "$HEALTH_LOG"
  fi
  return $issues
}

run_heal() {
  local error_desc="$1"
  if [[ -z "$error_desc" ]]; then
    echo "Usage: antigravity-standalone.sh heal 'description of the problem'"
    return 1
  fi
  diagnose_with_gemini "$error_desc"
}

# ─── CLI ───────────────────────────────────────────────────────────────────────

case "${1:-health}" in
  health)  run_health_check ;;
  heal)    run_heal "$2" ;;
  *)       echo "Usage: $0 {health|heal 'error description'}" ;;
esac

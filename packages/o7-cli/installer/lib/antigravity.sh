#!/usr/bin/env bash
# O7 OpenClaw Installer — Antigravity Self-Healer Integration

ANTIGRAVITY_SCRIPT="${HOME}/.openclaw/workspace/projects/o7-os/module-engine/antigravity.js"

setup_antigravity() {
  section 9 "Antigravity Self-Healer"

  # Check if Antigravity exists
  if [[ ! -f "$ANTIGRAVITY_SCRIPT" ]]; then
    warn "Antigravity script not found at expected path."
    info "It will be installed when Unified MC is set up."
    log "ANTIGRAVITY: script not found, skipping"
    return 0
  fi

  # Check for Gemini API key (required for Antigravity)
  local gemini_key
  gemini_key=$(grep -o '"GEMINI_API_KEY"[[:space:]]*:[[:space:]]*"[^"]*"' ~/.openclaw/openclaw.json 2>/dev/null | head -1 | sed 's/.*: *"//;s/"//')

  if [[ -z "$gemini_key" ]]; then
    # Check if they set up Gemini in auth phase
    local has_gemini=false
    for result in "${AUTH_RESULTS[@]+"${AUTH_RESULTS[@]}"}"; do
      if [[ "$result" == "gemini:ok" ]]; then
        has_gemini=true
        break
      fi
    done

    if [[ "$has_gemini" == "false" ]]; then
      warn "Antigravity needs a Gemini API key (it's free)."
      echo -e "  ${CYAN}→ https://aistudio.google.com/apikey${RESET}"
      local ag_key
      ask "  Paste your Gemini API key (or press Enter to skip):" ag_key true
      if [[ -n "$ag_key" ]]; then
        gemini_key="$ag_key"
      else
        warn "Skipping Antigravity. You can set it up later."
        log "ANTIGRAVITY: no gemini key, skipped"
        return 0
      fi
    fi
  fi

  # Run initial health check
  info "Running Antigravity health check..."
  local health_output
  if [[ -n "$gemini_key" ]]; then
    health_output=$(GEMINI_API_KEY="$gemini_key" node "$ANTIGRAVITY_SCRIPT" health 2>&1)
  else
    health_output=$(node "$ANTIGRAVITY_SCRIPT" health 2>&1)
  fi
  local exit_code=$?

  if (( exit_code == 0 )); then
    ok "Antigravity health check passed"
  else
    warn "Antigravity found issues:"
    echo "$health_output" | while read -r line; do
      echo -e "  ${DIM}${line}${RESET}"
    done
    info "Antigravity will auto-heal these on the next cycle."
  fi

  # Install launchd timer for periodic health checks (every 30 min)
  setup_antigravity_timer "$gemini_key"

  log "ANTIGRAVITY: setup complete"
}

setup_antigravity_timer() {
  local gemini_key="$1"
  info "Setting up Antigravity auto-healer (runs every 30 minutes)..."

  local plist_path="${HOME}/Library/LaunchAgents/com.o7.antigravity.plist"

  cat > "$plist_path" << PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.o7.antigravity</string>
    <key>ProgramArguments</key>
    <array>
        <string>$(which node)</string>
        <string>${ANTIGRAVITY_SCRIPT}</string>
        <string>health</string>
    </array>
    <key>EnvironmentVariables</key>
    <dict>
        <key>PATH</key>
        <string>$(dirname "$(which node)"):/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin</string>
PLIST

  if [[ -n "$gemini_key" ]]; then
    cat >> "$plist_path" << PLIST
        <key>GEMINI_API_KEY</key>
        <string>${gemini_key}</string>
PLIST
  fi

  cat >> "$plist_path" << PLIST
    </dict>
    <key>StartInterval</key>
    <integer>1800</integer>
    <key>RunAtLoad</key>
    <false/>
    <key>StandardOutPath</key>
    <string>/tmp/antigravity.log</string>
    <key>StandardErrorPath</key>
    <string>/tmp/antigravity.err</string>
</dict>
</plist>
PLIST

  launchctl unload "$plist_path" 2>/dev/null
  launchctl load "$plist_path" 2>/dev/null

  if launchctl list | grep -q "com.o7.antigravity"; then
    ok "Antigravity timer installed (every 30 min)"
    log "ANTIGRAVITY: launchd timer installed"
  else
    warn "Antigravity timer couldn't be loaded. You can load it manually:"
    detail "launchctl load $plist_path"
    log "ANTIGRAVITY: launchd timer load failed"
  fi
}

# Run Antigravity heal on a specific error from the install
heal_install_error() {
  local error_desc="$1"
  if [[ -f "$ANTIGRAVITY_SCRIPT" ]]; then
    info "Asking Antigravity to diagnose: ${error_desc}"
    node "$ANTIGRAVITY_SCRIPT" heal "$error_desc" 2>&1 | while read -r line; do
      echo -e "  ${DIM}${line}${RESET}"
    done
  fi
}

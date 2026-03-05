#!/usr/bin/env bash
# O7 OpenClaw Installer — Smart Auth Setup
# NEVER asks for raw API keys for Claude/ChatGPT. Uses OAuth/CLI flows.

AUTH_RESULTS=()  # Track what worked

setup_claude() {
  step "Setting up Claude (Anthropic)"
  echo
  echo -e "${BOLD}  Claude is the primary AI model. We'll authenticate via browser.${RESET}"
  echo -e "${DIM}  This opens your browser — sign in with your Anthropic account.${RESET}"
  echo -e "${DIM}  No API key needed. Just your login.${RESET}"
  echo

  if ! confirm "  Ready to authenticate with Claude?"; then
    warn "Skipping Claude setup. You can set it up later with: openclaw configure"
    AUTH_RESULTS+=("claude:skipped")
    return 1
  fi

  info "Launching browser authentication..."
  openclaw onboard --auth-choice setup-token --non-interactive=false 2>&1 | while read -r line; do
    echo -e "  ${DIM}${line}${RESET}"
  done
  local exit_code=${PIPESTATUS[0]}

  if (( exit_code == 0 )); then
    ok "Claude authentication complete"
    AUTH_RESULTS+=("claude:ok")
    log "AUTH OK: Claude (setup-token)"
    return 0
  fi

  # Fallback: try oauth flow
  warn "Setup token failed. Trying OAuth flow..."
  openclaw onboard --auth-choice oauth 2>&1 | while read -r line; do
    echo -e "  ${DIM}${line}${RESET}"
  done

  if (( ${PIPESTATUS[0]} == 0 )); then
    ok "Claude OAuth authentication complete"
    AUTH_RESULTS+=("claude:ok")
    log "AUTH OK: Claude (oauth fallback)"
    return 0
  fi

  fail "Claude authentication failed."
  info "You can set it up manually later: openclaw configure"
  AUTH_RESULTS+=("claude:failed")
  log "AUTH FAIL: Claude"
  return 1
}

setup_chatgpt() {
  step "Setting up ChatGPT / Codex (OpenAI)"
  echo
  echo -e "${BOLD}  ChatGPT/Codex uses OAuth — just sign in with your OpenAI account.${RESET}"
  echo -e "${DIM}  This will open your browser. No API key needed.${RESET}"
  echo

  if ! confirm "  Ready to authenticate with OpenAI?"; then
    warn "Skipping ChatGPT/Codex. Set up later: openclaw configure"
    AUTH_RESULTS+=("openai:skipped")
    return 1
  fi

  info "Launching OpenAI OAuth..."
  openclaw onboard --auth-choice openai-codex 2>&1 | while read -r line; do
    echo -e "  ${DIM}${line}${RESET}"
  done
  local exit_code=${PIPESTATUS[0]}

  if (( exit_code == 0 )); then
    ok "ChatGPT/Codex authentication complete"
    AUTH_RESULTS+=("openai:ok")
    log "AUTH OK: OpenAI (codex oauth)"
    return 0
  fi

  fail "OpenAI authentication failed."
  AUTH_RESULTS+=("openai:failed")
  log "AUTH FAIL: OpenAI"
  return 1
}

setup_gemini() {
  step "Setting up Gemini (Google)"
  echo
  echo -e "${BOLD}  Gemini uses Google OAuth — sign in with your Google account.${RESET}"
  echo -e "${DIM}  Free tier, no credit card needed. 1M+ context window.${RESET}"
  echo

  if ! confirm "  Ready to authenticate with Google?"; then
    warn "Skipping Gemini. Set up later: openclaw configure"
    AUTH_RESULTS+=("gemini:skipped")
    return 1
  fi

  info "Launching Gemini CLI OAuth..."
  openclaw onboard --auth-choice google-gemini-cli 2>&1 | while read -r line; do
    echo -e "  ${DIM}${line}${RESET}"
  done
  local exit_code=${PIPESTATUS[0]}

  if (( exit_code == 0 )); then
    ok "Gemini authentication complete"
    AUTH_RESULTS+=("gemini:ok")
    log "AUTH OK: Gemini (cli oauth)"
    return 0
  fi

  # Fallback: API key
  warn "OAuth failed. Let's try with an API key instead."
  echo
  echo -e "  ${BOLD}Get a free API key:${RESET}"
  echo -e "  ${CYAN}→ https://aistudio.google.com/apikey${RESET}"
  echo -e "  ${DIM}  Sign in with Google, click 'Create API Key', copy it.${RESET}"
  echo

  local gemini_key
  ask "  Paste your Gemini API key:" gemini_key true

  if [[ -n "$gemini_key" ]]; then
    openclaw onboard --auth-choice gemini-api-key --gemini-api-key "$gemini_key" 2>&1 | while read -r line; do
      echo -e "  ${DIM}${line}${RESET}"
    done
    if (( ${PIPESTATUS[0]} == 0 )); then
      ok "Gemini configured with API key"
      AUTH_RESULTS+=("gemini:ok")
      log "AUTH OK: Gemini (api key fallback)"
      return 0
    fi
  fi

  fail "Gemini setup failed."
  AUTH_RESULTS+=("gemini:failed")
  log "AUTH FAIL: Gemini"
  return 1
}

setup_kimi() {
  step "Setting up Kimi K2.5 (Ollama Cloud)"
  echo
  echo -e "${BOLD}  Kimi K2.5 is our design AI. Runs via Ollama Cloud.${RESET}"
  echo -e "${DIM}  You'll need an API key from ollama.com.${RESET}"
  echo
  echo -e "  ${BOLD}Get your key:${RESET}"
  echo -e "  ${CYAN}→ https://ollama.com/settings/keys${RESET}"
  echo -e "  ${DIM}  1. Sign in or create an account at ollama.com${RESET}"
  echo -e "  ${DIM}  2. Go to Settings → API Keys${RESET}"
  echo -e "  ${DIM}  3. Click 'Create new key', copy it${RESET}"
  echo

  if ! confirm "  Have your Ollama API key ready?"; then
    warn "Skipping Kimi. Set up later: openclaw configure"
    AUTH_RESULTS+=("kimi:skipped")
    return 1
  fi

  local ollama_key
  ask "  Paste your Ollama API key:" ollama_key true

  if [[ -z "$ollama_key" ]]; then
    warn "No key entered. Skipping Kimi."
    AUTH_RESULTS+=("kimi:skipped")
    return 1
  fi

  # Configure as custom provider
  info "Configuring Kimi K2.5 via Ollama Cloud..."
  openclaw onboard \
    --auth-choice custom-api-key \
    --custom-api-key "$ollama_key" \
    --custom-base-url "https://ollama.com/v1" \
    --custom-provider-id "ollama" \
    --custom-model-id "kimi-k2.5:cloud" \
    --custom-compatibility openai \
    --token-profile-id "ollama:cloud" \
    2>&1 | while read -r line; do
    echo -e "  ${DIM}${line}${RESET}"
  done
  local exit_code=${PIPESTATUS[0]}

  if (( exit_code == 0 )); then
    ok "Kimi K2.5 configured"
    AUTH_RESULTS+=("kimi:ok")
    log "AUTH OK: Kimi K2.5 (ollama cloud)"
    return 0
  fi

  fail "Kimi K2.5 configuration failed."
  info "You can add it manually later in openclaw.json"
  AUTH_RESULTS+=("kimi:failed")
  log "AUTH FAIL: Kimi K2.5"
  return 1
}

setup_github_copilot() {
  step "Setting up GitHub Copilot"
  echo
  echo -e "${BOLD}  GitHub Copilot gives access to Claude and GPT models for free.${RESET}"
  echo -e "${DIM}  Requires a GitHub account. Browser sign-in.${RESET}"
  echo

  if ! confirm "  Set up GitHub Copilot?"; then
    warn "Skipping GitHub Copilot."
    AUTH_RESULTS+=("copilot:skipped")
    return 1
  fi

  # Check if gh CLI is installed
  if ! command -v gh &>/dev/null; then
    info "Installing GitHub CLI..."
    brew install gh &
    spin $! "Installing gh..."
    wait $!
  fi

  # Auth with GitHub first if needed
  if ! gh auth status &>/dev/null 2>&1; then
    info "Authenticating with GitHub..."
    gh auth login -w 2>&1 | while read -r line; do
      echo -e "  ${DIM}${line}${RESET}"
    done
  fi

  info "Configuring GitHub Copilot for OpenClaw..."
  openclaw onboard --auth-choice github-copilot 2>&1 | while read -r line; do
    echo -e "  ${DIM}${line}${RESET}"
  done
  local exit_code=${PIPESTATUS[0]}

  if (( exit_code == 0 )); then
    ok "GitHub Copilot configured"
    AUTH_RESULTS+=("copilot:ok")
    log "AUTH OK: GitHub Copilot"
    return 0
  fi

  fail "GitHub Copilot setup failed."
  AUTH_RESULTS+=("copilot:failed")
  log "AUTH FAIL: GitHub Copilot"
  return 1
}

run_auth_setup() {
  section 3 "AI Model Authentication"
  echo
  echo -e "${BOLD}  Let's connect your AI models. No raw API keys needed —${RESET}"
  echo -e "${BOLD}  just sign in through your browser for each one.${RESET}"
  echo
  echo -e "${DIM}  We'll set up the models in order of priority.${RESET}"
  echo -e "${DIM}  You need at least ONE working model to continue.${RESET}"
  echo

  check_internet || return 1

  # Set up each provider
  setup_claude
  echo
  setup_chatgpt
  echo
  setup_gemini
  echo
  setup_kimi
  echo
  setup_github_copilot

  # Check if at least one provider works
  local working=0
  for result in "${AUTH_RESULTS[@]}"; do
    if [[ "$result" == *":ok" ]]; then
      ((working++))
    fi
  done

  echo
  if (( working == 0 )); then
    fail "No AI models configured. You need at least one to use OpenClaw."
    info "Re-run the installer or set up manually: openclaw configure"
    return 1
  fi

  ok "${working} model(s) configured successfully"
  log "AUTH SUMMARY: ${working} working — ${AUTH_RESULTS[*]}"
}

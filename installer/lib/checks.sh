#!/usr/bin/env bash
# O7 OpenClaw Installer — System Checks

check_macos_version() {
  step "Checking macOS version"
  local ver
  ver=$(sw_vers -productVersion 2>/dev/null)
  if [[ -z "$ver" ]]; then
    fail "Not running macOS. This installer is for Mac only."
    log "FAIL: Not macOS"
    return 1
  fi
  local major
  major=$(echo "$ver" | cut -d. -f1)
  if (( major < 13 )); then
    fail "macOS $ver detected. Requires macOS 13 (Ventura) or later."
    info "Upgrade your Mac at System Settings → General → Software Update"
    log "FAIL: macOS $ver too old"
    return 1
  fi
  ok "macOS $ver"
  log "OK: macOS $ver"
}

check_homebrew() {
  step "Checking Homebrew"
  if command -v brew &>/dev/null; then
    ok "Homebrew $(brew --version | head -1 | awk '{print $2}')"
    log "OK: Homebrew found"
    return 0
  fi

  warn "Homebrew not found. Installing..."
  info "This is the standard macOS package manager. Safe and widely used."
  if ! confirm "Install Homebrew?"; then
    fail "Homebrew is required. Can't continue without it."
    return 1
  fi

  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)" &
  spin $! "Installing Homebrew..."
  wait $!
  local exit_code=$?

  if (( exit_code != 0 )); then
    fail "Homebrew installation failed (exit code $exit_code)"
    info "Try running manually: /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
    log "FAIL: Homebrew install exit $exit_code"
    return 1
  fi

  # Add to PATH for Apple Silicon
  if [[ -f /opt/homebrew/bin/brew ]]; then
    eval "$(/opt/homebrew/bin/brew shellenv)"
  fi

  if command -v brew &>/dev/null; then
    ok "Homebrew installed successfully"
    log "OK: Homebrew installed"
  else
    fail "Homebrew installed but not in PATH. Restart your terminal and re-run."
    return 1
  fi
}

check_node() {
  step "Checking Node.js"
  if command -v node &>/dev/null; then
    local node_ver
    node_ver=$(node -v | sed 's/v//')
    local node_major
    node_major=$(echo "$node_ver" | cut -d. -f1)
    if (( node_major >= 22 )); then
      ok "Node.js v${node_ver}"
      log "OK: Node $node_ver"
      return 0
    else
      warn "Node.js v${node_ver} found but v22+ is required."
    fi
  fi

  info "Installing Node.js via Homebrew..."
  brew install node &
  spin $! "Installing Node.js..."
  wait $!

  if command -v node &>/dev/null; then
    local installed_ver
    installed_ver=$(node -v | sed 's/v//')
    ok "Node.js v${installed_ver} installed"
    log "OK: Node $installed_ver installed"
  else
    fail "Node.js installation failed."
    info "Try: brew install node"
    log "FAIL: Node install failed"
    return 1
  fi
}

check_git() {
  step "Checking Git"
  if command -v git &>/dev/null; then
    ok "Git $(git --version | awk '{print $3}')"
    log "OK: Git found"
    return 0
  fi

  info "Installing Git..."
  brew install git &
  spin $! "Installing Git..."
  wait $!

  if command -v git &>/dev/null; then
    ok "Git installed"
    log "OK: Git installed"
  else
    fail "Git installation failed. Try: brew install git"
    log "FAIL: Git install failed"
    return 1
  fi
}

check_pnpm() {
  step "Checking pnpm"
  if command -v pnpm &>/dev/null; then
    ok "pnpm $(pnpm --version)"
    log "OK: pnpm found"
    return 0
  fi

  info "Installing pnpm..."
  npm install -g pnpm &
  spin $! "Installing pnpm..."
  wait $!

  if command -v pnpm &>/dev/null; then
    ok "pnpm installed"
    log "OK: pnpm installed"
  else
    fail "pnpm installation failed. Try: npm install -g pnpm"
    log "FAIL: pnpm install failed"
    return 1
  fi
}

check_disk_space() {
  step "Checking disk space"
  local free_gb
  free_gb=$(df -g / | tail -1 | awk '{print $4}')
  if (( free_gb < 2 )); then
    fail "Only ${free_gb}GB free. Need at least 2GB."
    info "Free up disk space and try again."
    log "FAIL: Only ${free_gb}GB free"
    return 1
  fi
  ok "${free_gb}GB free"
  log "OK: ${free_gb}GB free"
}

run_all_checks() {
  section 1 "System Check"
  local failed=0
  check_macos_version || ((failed++))
  check_homebrew      || ((failed++))
  check_node          || ((failed++))
  check_git           || ((failed++))
  check_pnpm          || ((failed++))
  check_disk_space    || ((failed++))

  if (( failed > 0 )); then
    echo
    fail "$failed prerequisite(s) failed. Fix the issues above and re-run."
    return 1
  fi
  echo
  ok "All system checks passed!"
}

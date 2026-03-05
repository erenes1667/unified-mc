#!/usr/bin/env bash
# O7 OpenClaw Installer — Provider Validation

# Test a model via openclaw agent --message (quick ping)
# Returns 0 on success, 1 on failure with diagnosis
validate_provider() {
  local provider="$1" display_name="$2"
  info "Testing ${display_name}..."

  local output exit_code
  output=$(timeout 30 openclaw agent --message "Reply with exactly: OK" --model "${provider}" --max-tokens 10 2>&1)
  exit_code=$?

  if (( exit_code == 0 )) && echo "$output" | grep -qi "ok"; then
    ok "${display_name} is working"
    log "VALIDATE OK: ${provider}"
    return 0
  fi

  # Diagnose the error
  if echo "$output" | grep -qi "401\|unauthorized\|invalid.*key\|invalid.*token"; then
    fail "${display_name}: Authentication failed (invalid or expired token)"
    info "Your token/key seems wrong. Let's set it up again."
    log "VALIDATE FAIL: ${provider} — 401 unauthorized"
    return 1
  elif echo "$output" | grep -qi "403\|forbidden\|access.*denied"; then
    fail "${display_name}: Access denied (your account may not have access to this model)"
    info "Check your subscription or plan at the provider's dashboard."
    log "VALIDATE FAIL: ${provider} — 403 forbidden"
    return 1
  elif echo "$output" | grep -qi "429\|rate.*limit\|too.*many"; then
    warn "${display_name}: Rate limited (but auth is working — you're good)"
    log "VALIDATE WARN: ${provider} — 429 rate limited but auth OK"
    return 0  # Rate limit = auth works
  elif echo "$output" | grep -qi "timeout\|ETIMEDOUT\|ECONNREFUSED\|network"; then
    fail "${display_name}: Network error (can't reach the API)"
    info "Check your internet connection. If on VPN, try disconnecting."
    log "VALIDATE FAIL: ${provider} — network error"
    return 1
  elif echo "$output" | grep -qi "not.*found\|no.*profile\|no.*auth"; then
    fail "${display_name}: Not configured (no auth profile found)"
    log "VALIDATE FAIL: ${provider} — no auth profile"
    return 1
  else
    warn "${display_name}: Got a response but couldn't verify it's working correctly"
    detail "Output: $(echo "$output" | head -3)"
    log "VALIDATE UNCLEAR: ${provider} — $output"
    return 0  # Assume OK if we got any response
  fi
}

# Validate with retry loop
validate_with_retry() {
  local provider="$1" display_name="$2" setup_fn="$3"
  local max_retries=3 attempt=1

  while (( attempt <= max_retries )); do
    if validate_provider "$provider" "$display_name"; then
      return 0
    fi

    if (( attempt < max_retries )); then
      echo
      if confirm "Try setting up ${display_name} again? (attempt $((attempt+1))/${max_retries})"; then
        $setup_fn
      else
        return 1
      fi
    fi
    ((attempt++))
  done

  fail "Could not validate ${display_name} after ${max_retries} attempts."
  return 1
}

# Quick connectivity check
check_internet() {
  if ! curl -s --max-time 5 https://api.anthropic.com >/dev/null 2>&1; then
    if ! curl -s --max-time 5 https://www.google.com >/dev/null 2>&1; then
      fail "No internet connection detected!"
      info "Check your Wi-Fi or Ethernet connection and try again."
      return 1
    fi
  fi
  return 0
}

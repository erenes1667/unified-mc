#!/bin/bash
# Unified MC Keepalive Script
# Keeps unified-mc running on port 3000, auto-restarts on crash

LOG_FILE="$HOME/.openclaw/workspace/projects/unified-mc/logs/keepalive.log"
PID_FILE="$HOME/.openclaw/workspace/projects/unified-mc/.next/server.pid"
APP_DIR="$HOME/.openclaw/workspace/projects/unified-mc"
PORT=5173

# Ensure log directory exists
mkdir -p "$(dirname "$LOG_FILE")"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Check if already running
check_running() {
  if lsof -ti :$PORT > /dev/null 2>&1; then
    return 0
  fi
  return 1
}

# Start the server
start_server() {
  log "Starting unified-mc on port $PORT..."
  cd "$APP_DIR"
  
  # Build first if needed
  if [ ! -d ".next" ] || [ ! -f ".next/server/server.js" ]; then
    log "Building..."
    npm run build >> "$LOG_FILE" 2>&1
  fi
  
  # Start in background
  PORT=$PORT npm start >> "$LOG_FILE" 2>&1 &
  local pid=$!
  echo $pid > "$PID_FILE"
  
  # Wait for port to be ready
  for i in {1..30}; do
    sleep 1
    if check_running; then
      log "✓ Server ready on port $PORT (PID: $pid)"
      return 0
    fi
  done
  
  log "✗ Server failed to start within 30s"
  return 1
}

# Main loop
log "=== Unified MC Keepalive Started ==="

while true; do
  if ! check_running; then
    log "Server not detected on port $PORT, restarting..."
    start_server
  fi
  
  # Check every 10 seconds
  sleep 10
done

#!/bin/bash
# Unified MC Installer - One command to rule them all
# Usage: curl -sSL https://raw.githubusercontent.com/yourrepo/install.sh | bash

set -e

REPO_URL="https://github.com/erenes1667/unified-mc.git"  # Update this
APP_DIR="$HOME/.openclaw/workspace/projects/unified-mc"
PORT=3000
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
  echo -e "${BLUE}[Unified MC]${NC} $1"
}

success() {
  echo -e "${GREEN}✓${NC} $1"
}

error() {
  echo -e "${RED}✗${NC} $1"
}

# Check prerequisites
check_prereqs() {
  log "Checking prerequisites..."
  
  if ! command -v node &> /dev/null; then
    error "Node.js not found. Please install Node.js 18+ first."
    exit 1
  fi
  
  NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
  if [ "$NODE_VERSION" -lt 18 ]; then
    error "Node.js 18+ required. Found: $(node -v)"
    exit 1
  fi
  success "Node.js $(node -v)"
  
  if ! command -v git &> /dev/null; then
    error "Git not found. Please install Git first."
    exit 1
  fi
  success "Git available"
}

# Clone or update repo
setup_repo() {
  log "Setting up repository..."
  
  if [ -d "$APP_DIR/.git" ]; then
    log "Existing repo found, pulling updates..."
    cd "$APP_DIR"
    git pull origin main || git pull origin master
  else
    log "Cloning fresh repo..."
    mkdir -p "$(dirname "$APP_DIR")"
    git clone "$REPO_URL" "$APP_DIR"
    cd "$APP_DIR"
  fi
  success "Repository ready at $APP_DIR"
}

# Install dependencies
install_deps() {
  log "Installing dependencies..."
  cd "$APP_DIR"
  npm install
  success "Dependencies installed"
}

# Build the app
build_app() {
  log "Building application..."
  cd "$APP_DIR"
  npm run build
  success "Build complete"
}

# Install launchd service (macOS)
install_service() {
  if [[ "$OSTYPE" == "darwin"* ]]; then
    log "Installing launchd service..."
    
    mkdir -p ~/Library/LaunchAgents
    cp "$APP_DIR/installer/com.eneseren.unified-mc.plist" ~/Library/LaunchAgents/
    
    launchctl unload ~/Library/LaunchAgents/com.eneseren.unified-mc.plist 2>/dev/null || true
    launchctl load ~/Library/LaunchAgents/com.eneseren.unified-mc.plist
    
    success "LaunchAgent installed. Service will auto-start on boot."
  else
    log "Linux detected. Creating systemd service..."
    
    sudo tee /etc/systemd/system/unified-mc.service > /dev/null <<EOF
[Unit]
Description=Unified Mission Control
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$APP_DIR
Environment=PORT=$PORT
Environment=PATH=$PATH
ExecStart=$(which npm) start
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF
    
    sudo systemctl daemon-reload
    sudo systemctl enable unified-mc
    sudo systemctl start unified-mc
    
    success "Systemd service installed and started."
  fi
}

# Start the app
start_app() {
  log "Starting application..."
  
  if [[ "$OSTYPE" == "darwin"* ]]; then
    launchctl start com.eneseren.unified-mc 2>/dev/null || true
  else
    sudo systemctl start unified-mc 2>/dev/null || true
  fi
  
  # Wait for server
  log "Waiting for server to start..."
  for i in {1..30}; do
    if curl -s http://localhost:$PORT > /dev/null 2>&1; then
      success "Server is running on http://localhost:$PORT"
      return 0
    fi
    sleep 1
  done
  
  error "Server failed to start within 30 seconds"
  return 1
}

# Print final info
print_info() {
  echo ""
  echo "========================================"
  echo "  Unified MC Installation Complete!"
  echo "========================================"
  echo ""
  echo "🌐 Web UI:     http://localhost:$PORT"
  echo "📁 App Folder:  $APP_DIR"
  echo "📊 API Status:  http://localhost:$PORT/api/cron"
  echo ""
  echo "Mission Control button in mickey-webchat now opens:"
  echo "  http://localhost:$PORT"
  echo ""
  echo "To view logs:"
  if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "  tail -f $APP_DIR/logs/stderr.log"
  else
    echo "  sudo journalctl -u unified-mc -f"
  fi
  echo ""
  echo "========================================"
}

# Main
main() {
  echo ""
  echo "🚀 Unified Mission Control Installer"
  echo "====================================="
  echo ""
  
  check_prereqs
  setup_repo
  install_deps
  build_app
  install_service
  start_app
  print_info
}

main "$@"

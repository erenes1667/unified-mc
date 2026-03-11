#!/usr/bin/env bash
# O7 OpenClaw Installer — UI Helpers

# Colors (degrade gracefully)
if [[ -t 1 ]] && tput colors &>/dev/null && [[ $(tput colors) -ge 8 ]]; then
  RED='\033[0;31m'
  GREEN='\033[0;32m'
  YELLOW='\033[1;33m'
  BLUE='\033[0;34m'
  PURPLE='\033[0;35m'
  CYAN='\033[0;36m'
  WHITE='\033[1;37m'
  DIM='\033[2m'
  BOLD='\033[1m'
  RESET='\033[0m'
else
  RED='' GREEN='' YELLOW='' BLUE='' PURPLE='' CYAN='' WHITE='' DIM='' BOLD='' RESET=''
fi

# Status indicators
ok()    { echo -e "${GREEN}✅ $*${RESET}"; }
warn()  { echo -e "${YELLOW}⚠️  $*${RESET}"; }
fail()  { echo -e "${RED}❌ $*${RESET}"; }
info()  { echo -e "${CYAN}ℹ️  $*${RESET}"; }
step()  { echo -e "\n${BOLD}${PURPLE}▶ $*${RESET}"; }
detail(){ echo -e "  ${DIM}$*${RESET}"; }

# Progress spinner
spin() {
  local pid=$1 msg=$2
  local chars='⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏'
  local i=0
  while kill -0 "$pid" 2>/dev/null; do
    printf "\r  ${CYAN}%s${RESET} %s" "${chars:i%${#chars}:1}" "$msg"
    i=$((i + 1))
    sleep 0.1
  done
  printf "\r"
}

# Ask yes/no (default yes)
confirm() {
  local prompt="${1:-Continue?}"
  echo -en "${BOLD}${prompt}${RESET} [Y/n] "
  read -r answer
  [[ -z "$answer" || "$answer" =~ ^[Yy] ]]
}

# Ask for input
ask() {
  local prompt="$1" var="$2" secret="${3:-false}"
  echo -en "${BOLD}${prompt}${RESET} "
  if [[ "$secret" == "true" ]]; then
    read -rs "$var"
    echo
  else
    read -r "$var"
  fi
}

# Section banner
section() {
  local num="$1" title="$2"
  echo -e "\n${BOLD}${WHITE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
  echo -e "${BOLD}${CYAN}  Phase ${num}: ${title}${RESET}"
  echo -e "${BOLD}${WHITE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
}

# Welcome banner
banner() {
  echo -e "${BOLD}${CYAN}"
  cat << 'BANNER'

   ___  ______   ___                   ____ _               
  / _ \|___  /  / _ \ _ __   ___ _ __ / ___| | __ ___      __
 | | | |  / /  | | | | '_ \ / _ \ '_ \ |   | |/ _` \ \ /\ / /
 | |_| | / /   | |_| | |_) |  __/ | | | |___| | (_| |\ V  V / 
  \___/ /_/     \___/| .__/ \___|_| |_|\____|_|\__,_| \_/\_/  
                     |_|                                      

BANNER
  echo -e "${RESET}"
  echo -e "${DIM}  One-click AI assistant setup for your Mac${RESET}"
  echo -e "${DIM}  Optimum7 — AI-Powered E-Commerce${RESET}"
  echo
}

# Menu selector
menu() {
  local prompt="$1"
  shift
  local options=("$@")
  echo -e "${BOLD}${prompt}${RESET}"
  for i in "${!options[@]}"; do
    echo -e "  ${CYAN}$((i + 1)))${RESET} ${options[$i]}"
  done
  local choice
  while true; do
    echo -en "${BOLD}  Select [1-${#options[@]}]: ${RESET}"
    read -r choice
    if [[ "$choice" =~ ^[0-9]+$ ]] && (( choice >= 1 && choice <= ${#options[@]} )); then
      echo "$((choice - 1))"
      return
    fi
    echo -e "${RED}  Invalid choice. Try again.${RESET}"
  done
}

# Summary table row
summary_row() {
  local label="$1" status="$2"
  printf "  %-30s %s\n" "$label" "$status"
}

# Installer log
INSTALL_LOG="${HOME}/.openclaw/install.log"
mkdir -p "$(dirname "$INSTALL_LOG")"
log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" >> "$INSTALL_LOG"
}

# Unified Mission Control Installer for Windows
# Usage: irm https://raw.githubusercontent.com/erenes1667/unified-mc/main/installer/install.ps1 -OutFile $env:TEMP\umc.ps1; & $env:TEMP\umc.ps1

$ErrorActionPreference = 'Stop'

$REPO_URL = 'https://github.com/erenes1667/unified-mc.git'
$APP_DIR = Join-Path $env:USERPROFILE '.openclaw\workspace\projects\unified-mc'
$PORT = 5173

function Log($msg) { Write-Host "  [UMC] $msg" -ForegroundColor Cyan }
function Ok($msg) { Write-Host "  [OK] $msg" -ForegroundColor Green }
function Bad($msg) { Write-Host "  [!!] $msg" -ForegroundColor Red }
function Caution($msg) { Write-Host "  [!] $msg" -ForegroundColor Yellow }

Write-Host ''
Write-Host '  =================================================' -ForegroundColor Cyan
Write-Host '    Unified Mission Control Installer (Windows)' -ForegroundColor White
Write-Host '  =================================================' -ForegroundColor Cyan
Write-Host ''

# --- Prerequisites ---
Log 'Checking prerequisites...'

# Disable Windows Store shims for node/npm if they exist
$aliasPath = Join-Path $env:LOCALAPPDATA 'Microsoft\WindowsApps'
$storeNode = Join-Path $aliasPath 'node.exe'
$storeNpm = Join-Path $aliasPath 'npm.cmd'
if ((Test-Path $storeNode) -and (Get-Item $storeNode).Length -lt 10000) {
    Log 'Removing Windows Store node shim...'
    Remove-Item $storeNode -Force -ErrorAction SilentlyContinue
    Remove-Item $storeNpm -Force -ErrorAction SilentlyContinue
    Remove-Item (Join-Path $aliasPath 'npx.cmd') -Force -ErrorAction SilentlyContinue
}

# Find real node (not the Store shim)
function FindRealNode {
    $candidates = @(
        'C:\Program Files\nodejs\node.exe'
        'C:\Program Files (x86)\nodejs\node.exe'
        (Join-Path $env:APPDATA 'nvm\current\node.exe')
        (Join-Path $env:USERPROFILE 'scoop\apps\nodejs\current\node.exe')
    )
    foreach ($c in $candidates) {
        if (Test-Path $c) { return $c }
    }
    $found = Get-Command node -ErrorAction SilentlyContinue
    if ($found) {
        $nv = & $found.Source -v 2>$null
        if ($nv -match 'v\d+') { return $found.Source }
    }
    return $null
}

$nodeExe = FindRealNode
if (-not $nodeExe) {
    Log 'Node.js not found. Installing automatically...'
    $hasWinget = Get-Command winget -ErrorAction SilentlyContinue
    if ($hasWinget) {
        winget install OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements --silent
    } else {
        Log 'Downloading Node.js installer...'
        $nodeInstaller = Join-Path $env:TEMP 'node-install.msi'
        Invoke-WebRequest -Uri 'https://nodejs.org/dist/v22.15.0/node-v22.15.0-x64.msi' -OutFile $nodeInstaller
        Log 'Running Node.js installer (this may take a minute)...'
        Start-Process msiexec.exe -ArgumentList "/i `"$nodeInstaller`" /qn" -Wait
    }
    # Refresh PATH
    $m = [Environment]::GetEnvironmentVariable('PATH','Machine')
    $u = [Environment]::GetEnvironmentVariable('PATH','User')
    $env:PATH = $m + ';' + $u
    $nodeExe = FindRealNode
}

if (-not $nodeExe) {
    Bad 'Failed to install Node.js. Please install manually from https://nodejs.org'
    exit 1
}

# Add node dir to PATH for this session
$nodeDir = Split-Path $nodeExe -Parent
if ($env:PATH -notlike "*$nodeDir*") {
    $env:PATH = $nodeDir + ';' + $env:PATH
}

$nv = (& $nodeExe -v 2>$null) -replace '[^0-9.]',''
$major = ($nv -split '\.')[0]
if ($major -lt 18) {
    Bad "Node.js 18+ required. Found: v$nv"
    exit 1
}
Ok "Node.js v$nv"

$hasGit = Get-Command git -ErrorAction SilentlyContinue
if (-not $hasGit) {
    Log 'Git not found. Installing automatically...'
    $hasWinget = Get-Command winget -ErrorAction SilentlyContinue
    if ($hasWinget) {
        winget install Git.Git --accept-package-agreements --accept-source-agreements --silent
    } else {
        Log 'Downloading Git installer...'
        $gitInstaller = Join-Path $env:TEMP 'git-install.exe'
        Invoke-WebRequest -Uri 'https://github.com/git-for-windows/git/releases/download/v2.47.1.windows.2/Git-2.47.1.2-64-bit.exe' -OutFile $gitInstaller
        Log 'Running Git installer...'
        Start-Process $gitInstaller -ArgumentList '/VERYSILENT /NORESTART' -Wait
    }
    $m = [Environment]::GetEnvironmentVariable('PATH','Machine')
    $u = [Environment]::GetEnvironmentVariable('PATH','User')
    $env:PATH = $m + ';' + $u
    # Also check common Git install path
    $gitPath = 'C:\Program Files\Git\cmd'
    if ((Test-Path $gitPath) -and ($env:PATH -notlike "*$gitPath*")) {
        $env:PATH = $gitPath + ';' + $env:PATH
    }
}
$hasGit = Get-Command git -ErrorAction SilentlyContinue
if (-not $hasGit) {
    Bad 'Failed to install Git. Please install from https://git-scm.com'
    exit 1
}
Ok 'Git available'

# --- Install OpenClaw ---
Log 'Checking OpenClaw...'
$hasOC = Get-Command openclaw -ErrorAction SilentlyContinue
if ($hasOC) {
    Ok 'OpenClaw already installed'
} else {
    Log 'Installing OpenClaw globally...'
    $npmPath = Join-Path $nodeDir 'npm.cmd'
    if (-not (Test-Path $npmPath)) { $npmPath = (Get-Command npm -ErrorAction SilentlyContinue).Source }
    & $npmPath install -g openclaw 2>$null
    if ($LASTEXITCODE -eq 0) { Ok 'OpenClaw installed' }
    else { Caution 'OpenClaw not available via npm (skipping)' }
}

# --- Clone/Update Repo ---
Log 'Setting up repository...'
if (Test-Path (Join-Path $APP_DIR '.git')) {
    Log 'Existing repo found, pulling updates...'
    Set-Location $APP_DIR
    git pull origin main 2>$null
} else {
    Log 'Cloning fresh repo...'
    $parentDir = Split-Path $APP_DIR -Parent
    New-Item -ItemType Directory -Force -Path $parentDir | Out-Null
    git clone $REPO_URL $APP_DIR
    Set-Location $APP_DIR
}
Ok "Repository ready at $APP_DIR"

# --- Onboarding ---
Log 'Starting onboarding wizard...'
Write-Host ''
$INSTALLER_DIR = Join-Path $APP_DIR 'installer'
node (Join-Path $INSTALLER_DIR 'onboard.mjs')
if ($LASTEXITCODE -ne 0) {
    Bad 'Onboarding failed'
    exit 1
}

# --- Build ---
Log 'Installing dependencies...'
Set-Location $APP_DIR
$npmPath = Join-Path $nodeDir 'npm.cmd'
if (-not (Test-Path $npmPath)) { $npmPath = (Get-Command npm -ErrorAction SilentlyContinue).Source }
& $npmPath install 2>&1 | Out-Null
Ok 'Dependencies installed'

Log 'Building application (this may take a few minutes)...'
$env:NODE_OPTIONS = '--max-old-space-size=2048'
& $npmPath run build 2>&1 | Out-Null
Ok 'Build complete'

# --- Auto-start ---
Log 'Setting up auto-start...'
$logDir = Join-Path $APP_DIR 'logs'
New-Item -ItemType Directory -Force -Path $logDir | Out-Null

$nodePath = (Get-Command node).Source
$batContent = "@echo off`r`ncd /d `"$APP_DIR`"`r`nset PORT=$PORT`r`nset NODE_ENV=production`r`n`"$nodePath`" node_modules\next\dist\bin\next start -p $PORT >> `"$logDir\stdout.log`" 2>> `"$logDir\stderr.log`""
$batPath = Join-Path $APP_DIR 'start-umc.bat'
Set-Content -Path $batPath -Value $batContent -Encoding ASCII

try {
    $taskName = 'UnifiedMC'
    $old = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
    if ($old) { Unregister-ScheduledTask -TaskName $taskName -Confirm:$false 2>$null }
    $act = New-ScheduledTaskAction -Execute $batPath
    $trg = New-ScheduledTaskTrigger -AtLogon
    $set = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit 0
    Register-ScheduledTask -TaskName $taskName -Action $act -Trigger $trg -Settings $set -Description 'Unified Mission Control' | Out-Null
    Ok 'Startup task registered (runs at login)'
} catch {
    Caution 'Could not create startup task. Start manually with: npm start'
}

# --- Start Now ---
Log 'Starting application...'
Start-Process -FilePath $batPath -WindowStyle Hidden

Log 'Waiting for server...'
$ready = $false
for ($i = 0; $i -lt 30; $i++) {
    Start-Sleep -Seconds 1
    try {
        $r = Invoke-WebRequest -Uri "http://localhost:$PORT" -UseBasicParsing -TimeoutSec 2 -ErrorAction SilentlyContinue
        if ($r.StatusCode -eq 200) { $ready = $true; break }
    } catch {}
}

if ($ready) { Ok "Server running at http://localhost:$PORT" }
else { Caution "Server may still be starting. Check: $logDir\stderr.log" }

# --- Done ---
Write-Host ''
Write-Host '  =================================================' -ForegroundColor Green
Write-Host '    Installation Complete!' -ForegroundColor Green
Write-Host '  =================================================' -ForegroundColor Green
Write-Host ''
Write-Host "    Open:    http://localhost:$PORT" -ForegroundColor White
Write-Host "    App:     $APP_DIR" -ForegroundColor DarkGray
Write-Host "    Config:  $env:USERPROFILE\.openclaw\openclaw.json" -ForegroundColor DarkGray
Write-Host ''
Write-Host "    Logs:    Get-Content $logDir\stderr.log -Tail 20" -ForegroundColor DarkGray
Write-Host ''
Write-Host '  =================================================' -ForegroundColor Green
Write-Host ''

Start-Process "http://localhost:$PORT"

# Unified Mission Control Installer for Windows
# Usage: powershell -ExecutionPolicy Bypass -Command "Invoke-WebRequest https://raw.githubusercontent.com/erenes1667/unified-mc/main/installer/install.ps1 -OutFile $env:TEMP\umc.ps1; & $env:TEMP\umc.ps1"

# Do NOT use $ErrorActionPreference = 'Stop' - git/npm write to stderr and PowerShell
# treats any stderr output as a terminating error, killing the entire script.
$ErrorActionPreference = 'Continue'

$REPO_URL = 'https://github.com/erenes1667/unified-mc.git'
$APP_DIR = Join-Path $env:USERPROFILE '.openclaw\workspace\projects\unified-mc'
$PORT = 5173

function Log($msg) { Write-Host "  [UMC] $msg" -ForegroundColor Cyan }
function Ok($msg) { Write-Host "  [OK] $msg" -ForegroundColor Green }
function Bad($msg) { Write-Host "  [!!] $msg" -ForegroundColor Red }
function Caution($msg) { Write-Host "  [!] $msg" -ForegroundColor Yellow }

# Run an external command, merge stderr into stdout so PowerShell doesn't choke.
# Returns $true if exit code is 0.
function Run {
    param([string]$Label, [string]$Cmd)
    $output = cmd /c "$Cmd 2>&1"
    $ok = $LASTEXITCODE -eq 0
    if (-not $ok -and $Label) { Caution "$Label exited with code $LASTEXITCODE" }
    return $ok
}

Write-Host ''
Write-Host '  =================================================' -ForegroundColor Cyan
Write-Host '    Unified Mission Control Installer (Windows)' -ForegroundColor White
Write-Host '  =================================================' -ForegroundColor Cyan
Write-Host ''

# --- Prerequisites ---
Log 'Checking prerequisites...'

# Remove Windows Store shims for node/npm (they open the Store instead of running node)
$aliasPath = Join-Path $env:LOCALAPPDATA 'Microsoft\WindowsApps'
foreach ($shim in @('node.exe','npm.cmd','npx.cmd')) {
    $shimPath = Join-Path $aliasPath $shim
    if ((Test-Path $shimPath) -and (Get-Item $shimPath).Length -lt 10000) {
        Log "Removing Windows Store shim: $shim"
        Remove-Item $shimPath -Force -ErrorAction SilentlyContinue
    }
}

# Find real Node.js installation
function FindRealNode {
    $candidates = @(
        'C:\Program Files\nodejs\node.exe'
        'C:\Program Files (x86)\nodejs\node.exe'
    )
    # nvm-windows
    if ($env:NVM_HOME) {
        $nvmCurrent = Join-Path $env:NVM_HOME 'current\node.exe'
        $candidates += $nvmCurrent
    }
    # scoop
    $candidates += Join-Path $env:USERPROFILE 'scoop\apps\nodejs\current\node.exe'
    $candidates += Join-Path $env:USERPROFILE 'scoop\apps\nodejs-lts\current\node.exe'

    foreach ($c in $candidates) {
        if (Test-Path $c) { return $c }
    }

    # Fallback: let the system find it (but verify it actually runs)
    $found = Get-Command node -ErrorAction SilentlyContinue
    if ($found) {
        $testVer = cmd /c "`"$($found.Source)`" -v 2>&1"
        if ($testVer -match 'v\d+') { return $found.Source }
    }
    return $null
}

$nodeExe = FindRealNode
if (-not $nodeExe) {
    Log 'Node.js not found. Installing...'
    $hasWinget = Get-Command winget -ErrorAction SilentlyContinue
    if ($hasWinget) {
        cmd /c "winget install OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements --silent 2>&1" | Out-Null
    } else {
        Log 'Downloading Node.js MSI...'
        $msi = Join-Path $env:TEMP 'node-install.msi'
        Invoke-WebRequest -Uri 'https://nodejs.org/dist/v22.15.0/node-v22.15.0-x64.msi' -OutFile $msi
        Log 'Installing Node.js...'
        Start-Process msiexec.exe -ArgumentList "/i `"$msi`" /qn" -Wait
    }
    # Refresh PATH from registry
    $env:PATH = [Environment]::GetEnvironmentVariable('PATH','Machine') + ';' + [Environment]::GetEnvironmentVariable('PATH','User')
    $nodeExe = FindRealNode
}

if (-not $nodeExe) {
    Bad 'Could not find or install Node.js. Install from https://nodejs.org and re-run.'
    exit 1
}

$nodeDir = Split-Path $nodeExe -Parent
if ($env:PATH -notlike "*$nodeDir*") {
    $env:PATH = "$nodeDir;$env:PATH"
}

$nv = cmd /c "`"$nodeExe`" -v 2>&1"
$nv = $nv -replace '[^0-9.]',''
$major = [int](($nv -split '\.')[0])
if ($major -lt 18) {
    Bad "Node.js 18+ required (found v$nv)"
    exit 1
}
Ok "Node.js v$nv"

# --- Git ---
$hasGit = Get-Command git -ErrorAction SilentlyContinue
if (-not $hasGit) {
    Log 'Git not found. Installing...'
    $hasWinget = Get-Command winget -ErrorAction SilentlyContinue
    if ($hasWinget) {
        cmd /c "winget install Git.Git --accept-package-agreements --accept-source-agreements --silent 2>&1" | Out-Null
    } else {
        Log 'Downloading Git...'
        $gitExe = Join-Path $env:TEMP 'git-install.exe'
        Invoke-WebRequest -Uri 'https://github.com/git-for-windows/git/releases/download/v2.47.1.windows.2/Git-2.47.1.2-64-bit.exe' -OutFile $gitExe
        Start-Process $gitExe -ArgumentList '/VERYSILENT /NORESTART' -Wait
    }
    $env:PATH = [Environment]::GetEnvironmentVariable('PATH','Machine') + ';' + [Environment]::GetEnvironmentVariable('PATH','User')
    $gitBin = 'C:\Program Files\Git\cmd'
    if ((Test-Path $gitBin) -and ($env:PATH -notlike "*$gitBin*")) { $env:PATH = "$gitBin;$env:PATH" }
}
$hasGit = Get-Command git -ErrorAction SilentlyContinue
if (-not $hasGit) {
    Bad 'Could not find or install Git. Install from https://git-scm.com and re-run.'
    exit 1
}
Ok 'Git available'

# --- OpenClaw ---
Log 'Checking OpenClaw...'
$hasOC = Get-Command openclaw -ErrorAction SilentlyContinue
if ($hasOC) {
    Ok 'OpenClaw already installed'
} else {
    Log 'Installing OpenClaw globally...'
    cmd /c "npm install -g openclaw 2>&1" | Out-Null
    if ($LASTEXITCODE -eq 0) { Ok 'OpenClaw installed' }
    else { Caution 'OpenClaw install failed (non-critical, continuing)' }
}

# --- Clone / Update ---
Log 'Setting up repository...'
if (Test-Path (Join-Path $APP_DIR '.git')) {
    Log 'Existing repo found, pulling updates...'
    Set-Location $APP_DIR
    cmd /c "git pull origin main 2>&1" | Out-Null
} else {
    Log 'Cloning repo...'
    $parentDir = Split-Path $APP_DIR -Parent
    New-Item -ItemType Directory -Force -Path $parentDir | Out-Null
    cmd /c "git clone `"$REPO_URL`" `"$APP_DIR`" 2>&1"
    Set-Location $APP_DIR
}
Ok "Repository ready at $APP_DIR"

# --- Onboarding ---
Log 'Starting onboarding wizard...'
Write-Host ''
$onboardScript = Join-Path $APP_DIR 'installer\onboard.mjs'
cmd /c "`"$nodeExe`" `"$onboardScript`" 2>&1"
if ($LASTEXITCODE -ne 0) {
    Bad 'Onboarding failed'
    exit 1
}

# --- Build ---
Log 'Installing dependencies...'
Set-Location $APP_DIR
cmd /c "npm install 2>&1" | Out-Null
Ok 'Dependencies installed'

Log 'Building application (this may take a few minutes)...'
$env:NODE_OPTIONS = '--max-old-space-size=2048'
cmd /c "npm run build 2>&1" | Out-Null
Ok 'Build complete'

# --- Auto-start (Scheduled Task) ---
Log 'Setting up auto-start...'
$logDir = Join-Path $APP_DIR 'logs'
New-Item -ItemType Directory -Force -Path $logDir | Out-Null

$batContent = "@echo off`r`ncd /d `"$APP_DIR`"`r`nset PORT=$PORT`r`nset NODE_ENV=production`r`n`"$nodeExe`" node_modules\next\dist\bin\next start -p $PORT >> `"$logDir\stdout.log`" 2>> `"$logDir\stderr.log`""
$batPath = Join-Path $APP_DIR 'start-umc.bat'
Set-Content -Path $batPath -Value $batContent -Encoding ASCII

try {
    $taskName = 'UnifiedMC'
    $old = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
    if ($old) { Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue }
    $act = New-ScheduledTaskAction -Execute $batPath
    $trg = New-ScheduledTaskTrigger -AtLogon
    $set = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit 0
    Register-ScheduledTask -TaskName $taskName -Action $act -Trigger $trg -Settings $set -Description 'Unified Mission Control' | Out-Null
    Ok 'Startup task registered (runs at login)'
} catch {
    Caution 'Could not create startup task. Start manually with start-umc.bat'
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
else { Caution "Server may still be starting. Check logs: $logDir\stderr.log" }

# --- Done ---
Write-Host ''
Write-Host '  =================================================' -ForegroundColor Green
Write-Host '    Installation Complete!' -ForegroundColor Green
Write-Host '  =================================================' -ForegroundColor Green
Write-Host ''
Write-Host "    Open:    http://localhost:$PORT" -ForegroundColor White
Write-Host "    App:     $APP_DIR" -ForegroundColor DarkGray
Write-Host "    Config:  $env:USERPROFILE\.openclaw\openclaw.json" -ForegroundColor DarkGray
Write-Host "    Logs:    $logDir" -ForegroundColor DarkGray
Write-Host ''
Write-Host '  =================================================' -ForegroundColor Green
Write-Host ''

Start-Process "http://localhost:$PORT"

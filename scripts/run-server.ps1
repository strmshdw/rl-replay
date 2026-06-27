param (
    [int]$Port = 8000
)

# Ensure output encoding is UTF8 for emojis
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$WorkspaceRoot = Resolve-Path "$PSScriptRoot\.."
# Set working directory to workspace root so files are served correctly
Push-Location $WorkspaceRoot

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "       STARTING RL-REPLAY LOCAL SERVER     " -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# Check if port is already in use
$portActive = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
if ($portActive) {
    Write-Host "[!] Port $Port is already in use by another process!" -ForegroundColor Red
    Write-Host "Please specify a different port: .\scripts\run-server.ps1 -Port <number>" -ForegroundColor Yellow
    Pop-Location
    exit 1
}

# Determine server command (Python or Node/Npx)
$serverProcess = $null
$hasPython = Get-Command python -ErrorAction SilentlyContinue
$hasNode = Get-Command node -ErrorAction SilentlyContinue

if ($hasPython) {
    Write-Host "Found Python. Starting http.server on port $Port..." -ForegroundColor Gray
    $serverProcess = Start-Process python -ArgumentList "-m http.server $Port" -NoNewWindow -PassThru -ErrorAction SilentlyContinue
} elseif ($hasNode) {
    Write-Host "Python not found. Found Node.js. Starting http-server via npx on port $Port..." -ForegroundColor Gray
    $isWin = ($null -ne $IsWindows -and $IsWindows) -or ([Environment]::OSVersion.Platform -eq 'Win32NT')
    $npxCmd = if ($isWin) { "npx.cmd" } else { "npx" }
    $serverProcess = Start-Process $npxCmd -ArgumentList "http-server -p $Port" -NoNewWindow -PassThru -ErrorAction SilentlyContinue
} else {
    Write-Host "[!] Neither Python nor Node.js / npx was found on your system PATH." -ForegroundColor Red
    Write-Host "Please install Python or Node.js to run the local server." -ForegroundColor Yellow
    Pop-Location
    exit 1
}

if (-not $serverProcess) {
    Write-Host "[!] Failed to launch the background server process." -ForegroundColor Red
    Pop-Location
    exit 1
}

# Give the server a second to bind to the port
Start-Sleep -Seconds 1

# Verify process is still running
if ($serverProcess.HasExited) {
    Write-Host "[!] The server process terminated unexpectedly." -ForegroundColor Red
    Pop-Location
    exit 1
}

# Open the default browser
$url = "http://localhost:$Port"
Write-Host "Opening default browser to $url..." -ForegroundColor Green
try {
    Start-Process $url
} catch {
    Write-Host "[!] Failed to open browser automatically. Please open $url manually." -ForegroundColor Yellow
}

Write-Host "`nServer is running successfully!" -ForegroundColor Green
Write-Host "Press Ctrl+C at any time to stop the server." -ForegroundColor Yellow
Write-Host "==========================================" -ForegroundColor Cyan

try {
    # Wait indefinitely
    while ($true) {
        Start-Sleep -Seconds 1
    }
} finally {
    Write-Host "`nStopping background server process (ID: $($serverProcess.Id))..." -ForegroundColor Yellow
    try {
        Stop-Process -Id $serverProcess.Id -Force -ErrorAction SilentlyContinue
        Write-Host "Server stopped successfully." -ForegroundColor Green
    } catch {
        Write-Host "[!] Failed to stop server process automatically. It may have already exited." -ForegroundColor Yellow
    }
    Pop-Location
}

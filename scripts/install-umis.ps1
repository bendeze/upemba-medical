# install-umis.ps1
# Automated, 1-Click Installer for Upemba Medical Information System (UMIS)
# Usage: powershell -c "irm https://raw.githubusercontent.com/bendeze/upemba-medical/main/scripts/install-umis.ps1 | iex"
# OR run locally from USB where a .whl file is present.

$ErrorActionPreference = "Stop"

$Cyan = "Cyan"
$Gray = "Gray"
$White = "White"
$Green = "Green"
$Yellow = "Yellow"
$Red = "DarkRed"

function Write-Header {
    Clear-Host
    Write-Host "======================================================================" -ForegroundColor $Cyan
    Write-Host "       UMIS - UPEMBA MEDICAL INFORMATION SYSTEM INSTALLER             " -ForegroundColor $Cyan -BackgroundColor Black
    Write-Host "======================================================================" -ForegroundColor $Cyan
    Write-Host ""
}

Write-Header

# 1. Check for Python
Write-Host "[*] Checking for Python installation..." -ForegroundColor $Yellow
$pythonExe = $null

if (Get-Command py -ErrorAction SilentlyContinue) {
    $pythonExe = "py"
} elseif (Get-Command python -ErrorAction SilentlyContinue) {
    $pythonExe = "python"
} elseif (Get-Command python3 -ErrorAction SilentlyContinue) {
    $pythonExe = "python3"
}

if (-not $pythonExe) {
    Write-Host "[!] Python not found. Installing Python 3.12 automatically via winget..." -ForegroundColor $Yellow
    if (Get-Command winget -ErrorAction SilentlyContinue) {
        winget install Python.Python.3.12 --silent --accept-package-agreements --accept-source-agreements
        # Refresh PATH
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
        
        if (Get-Command py -ErrorAction SilentlyContinue) { $pythonExe = "py" }
        elseif (Get-Command python -ErrorAction SilentlyContinue) { $pythonExe = "python" }
        
        if ($pythonExe) {
            Write-Host "[OK] Python installed successfully." -ForegroundColor $Green
        } else {
            Write-Host "[!] Winget completed, but python is still not on PATH. Please restart PowerShell and run again." -ForegroundColor $Red
            exit 1
        }
    } else {
        Write-Host "[!] Winget not found. Downloading standalone Python installer..." -ForegroundColor $Yellow
        $installerUrl = "https://www.python.org/ftp/python/3.12.3/python-3.12.3-amd64.exe"
        $installerPath = Join-Path $env:TEMP "python-installer.exe"
        Invoke-WebRequest -Uri $installerUrl -OutFile $installerPath
        Write-Host "[*] Running installer silently (this may take a minute)..." -ForegroundColor $Gray
        Start-Process -FilePath $installerPath -ArgumentList "/quiet InstallAllUsers=0 PrependPath=1 Include_test=0" -Wait -NoNewWindow
        
        # Refresh PATH
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
        
        if (Get-Command py -ErrorAction SilentlyContinue) { $pythonExe = "py" }
        elseif (Get-Command python -ErrorAction SilentlyContinue) { $pythonExe = "python" }
        
        if (-not $pythonExe) {
            Write-Host "[!] Could not detect Python after install. Please restart your computer and try again." -ForegroundColor $Red
            exit 1
        }
        Write-Host "[OK] Python installed successfully." -ForegroundColor $Green
    }
} else {
    $version = (& $pythonExe --version 2>&1)
    Write-Host "[OK] Python is already installed ($version)." -ForegroundColor $Green
}

# 2. Locate or Download Wheel
Write-Host ""
Write-Host "[*] Resolving UMIS package..." -ForegroundColor $Yellow
$wheelPath = $null

# First, check if a .whl file exists in the current directory (USB drive deployment)
$localWheels = Get-ChildItem -Path . -Filter "*.whl" -ErrorAction SilentlyContinue
if ($localWheels -and $localWheels.Count -gt 0) {
    # Use the most recently modified wheel in the folder
    $wheelPath = ($localWheels | Sort-Object LastWriteTime -Descending | Select-Object -First 1).FullName
    Write-Host "[OK] Found local package on USB/Drive: $($wheelPath)" -ForegroundColor $Green
} else {
    Write-Host "[*] No local .whl found. Fetching latest release from GitHub (bendeze/upemba-medical)..." -ForegroundColor $Gray
    try {
        $releaseApi = "https://api.github.com/repos/bendeze/upemba-medical/releases/latest"
        $release = Invoke-RestMethod -Uri $releaseApi
        
        $asset = $release.assets | Where-Object { $_.name -like "*.whl" } | Select-Object -First 1
        if (-not $asset) {
            Write-Host "[!] Could not find a .whl asset in the latest GitHub release." -ForegroundColor $Red
            exit 1
        }
        
        $wheelPath = Join-Path $env:TEMP $asset.name
        Write-Host "  -> Downloading $($asset.name) (v$($release.tag_name))..." -ForegroundColor $Cyan
        Invoke-WebRequest -Uri $asset.browser_download_url -OutFile $wheelPath
        Write-Host "[OK] Download complete." -ForegroundColor $Green
    } catch {
        Write-Host "[!] Failed to fetch release from GitHub: $_" -ForegroundColor $Red
        exit 1
    }
}

# 3. Install via Pip
Write-Host ""
Write-Host "[*] Installing UMIS into Python environment..." -ForegroundColor $Yellow
& $pythonExe -m pip install $wheelPath --force-reinstall

if ($LASTEXITCODE -ne 0) {
    Write-Host "[!] Installation failed. See pip output above." -ForegroundColor $Red
    exit 1
}
Write-Host "[OK] UMIS Package Installed Successfully." -ForegroundColor $Green

# 4. Configure Silent Startup & Desktop Shortcut
Write-Host ""
Write-Host "[*] Configuring Automatic Silent Startup & Shortcuts..." -ForegroundColor $Yellow

$UmisDir = Join-Path $env:USERPROFILE ".umis"
if (-not (Test-Path $UmisDir)) {
    New-Item -ItemType Directory -Path $UmisDir -Force | Out-Null
}

$VbsPath = Join-Path $UmisDir "umis-launcher.vbs"
$StartupFolder = [System.Environment]::GetFolderPath('Startup')
$StartupLnkPath = Join-Path $StartupFolder "UMIS.lnk"
$DesktopFolder = [System.Environment]::GetFolderPath('Desktop')
$DesktopLnkPath = Join-Path $DesktopFolder "UMIS.lnk"

# Find python Scripts folder where umis-start lives
# We use the python that installed it
$scriptsDir = (& $pythonExe -c "import os, sys; print(os.path.join(os.path.dirname(sys.executable), 'Scripts'))").Trim()
if (-not (Test-Path $scriptsDir)) {
    # Fallback, just rely on PATH
    $scriptsDir = ""
}

$launchCmd = "cmd.exe /c umis-start"

$vbsCode = 'Set sh = CreateObject("Wscript.Shell")' + "`r`n"
$vbsCode += 'sh.Run "' + $launchCmd + '", 0, False'
Set-Content -Path $VbsPath -Value $vbsCode -Encoding Ascii

$WshShell = New-Object -ComObject WScript.Shell

# Create Startup Shortcut
$StartupShortcut = $WshShell.CreateShortcut($StartupLnkPath)
$StartupShortcut.TargetPath = "wscript.exe"
$StartupShortcut.Arguments = "`"$VbsPath`""
$StartupShortcut.WindowStyle = 7
if ($scriptsDir) { $StartupShortcut.WorkingDirectory = $scriptsDir }
$StartupShortcut.Save()

# Create Desktop Shortcut
$DesktopShortcut = $WshShell.CreateShortcut($DesktopLnkPath)
$DesktopShortcut.TargetPath = "wscript.exe"
$DesktopShortcut.Arguments = "`"$VbsPath`""
$DesktopShortcut.WindowStyle = 7
if ($scriptsDir) { $DesktopShortcut.WorkingDirectory = $scriptsDir }
$DesktopShortcut.Save()

Write-Host "[OK] VBScript Launcher created: $VbsPath" -ForegroundColor $Green
Write-Host "[OK] Added to Startup Folder (Boots silently with Windows)" -ForegroundColor $Green
Write-Host "[OK] Desktop Shortcut Created" -ForegroundColor $Green

# 5. Start the Application immediately
Write-Host ""
Write-Host "[*] Launching UMIS right now..." -ForegroundColor $Yellow
Start-Process -FilePath "wscript.exe" -ArgumentList "`"$VbsPath`""

Write-Host ""
Write-Host "======================================================================" -ForegroundColor $Cyan
Write-Host " INSTALLATION COMPLETE! " -ForegroundColor $Green
Write-Host "======================================================================" -ForegroundColor $Cyan
Write-Host "UMIS is now running in the background."
Write-Host "Your browser will open automatically at http://127.0.0.1:8001/"
Write-Host "To access it manually anytime, double-click the UMIS shortcut on your Desktop."
Write-Host ""

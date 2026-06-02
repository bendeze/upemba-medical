@echo off
title UMIS Production Build & Staging Pipeline
color 0B

:: Ensure we are running from the project root
set "PROJECT_ROOT=%~dp0"
cd /d "%PROJECT_ROOT%"

:MENU
clear
echo ====================================================================
echo       UMIS - PRODUCTION BUILD AND STATIC ASSET STAGING PIPELINE
echo ====================================================================
echo.
echo This tool automates the process of building the Next.js frontend,
echo staging the static assets into the Django backend core folder, and 
echo compiling the final production packages (EXE or Wheel).
echo.
echo Select build option:
echo  [1] Step 1: Build & Stage Frontend Only (Next.js -> Django)
echo  [2] Step 2: Build Standalone Windows Executable (UMIS.exe)
echo  [3] Step 2: Build Universal Python Wheel (.whl)
echo  [4] Exit
echo.
set /p choice="Choose option [1-4]: "

if "%choice%"=="1" goto BUILD_FRONTEND
if "%choice%"=="2" goto BUILD_EXE
if "%choice%"=="3" goto BUILD_WHEEL
if "%choice%"=="4" goto EXIT
goto MENU

:BUILD_FRONTEND
echo.
echo ====================================================================
echo  [1/2] COMPILING NEXT.JS FRONTEND (npm run build)
echo ====================================================================
echo.

if not exist "src\frontend\package.json" (
    echo [!] Error: Cannot find src\frontend\package.json.
    echo     Ensure you are running this from the UMIS project root directory.
    pause
    goto MENU
)

cd src\frontend
call npm install
call npm run build
if %errorlevel% neq 0 (
    echo.
    echo [!] Error: Next.js compilation failed. Staging aborted.
    cd /d "%PROJECT_ROOT%"
    pause
    goto MENU
)

cd /d "%PROJECT_ROOT%"

echo.
echo ====================================================================
echo  [2/2] STAGING STATIC ASSETS INTO DJANGO (src/backend/core)
echo ====================================================================
echo.

:: Ensure destination directories exist
if not exist "src\backend\core\static" mkdir "src\backend\core\static"
if not exist "src\backend\core\templates" mkdir "src\backend\core\templates"

:: Clean old Next.js build assets to prevent stale chunk accumulation
echo [*] Cleaning old static assets in Django...
if exist "src\backend\core\templates\index.html" del /q "src\backend\core\templates\index.html"
if exist "src\backend\core\static\_next" rmdir /s /q "src\backend\core\static\_next"
if exist "src\backend\core\static\favicon.ico" del /q "src\backend\core\static\favicon.ico"

:: Copy base index template
echo [*] Copying index.html to templates...
copy /y "src\frontend\out\index.html" "src\backend\core\templates\index.html" >nul

:: Copy other Next.js compiled static files recursively using robocopy
echo [*] Staging static assets recursively...
robocopy "src\frontend\out" "src\backend\core\static" /E /XD "templates" /XF "index.html" /njh /njs /ndl /nc /ns >nul

echo.
echo [+] SUCCESS: Frontend static assets successfully built and staged inside Django!
echo     - Templates: src/backend/core/templates/index.html
echo     - Assets:    src/backend/core/static/ (including _next/ static chunks)
echo.
pause
goto MENU

:BUILD_EXE
:: Execute frontend build first to guarantee fresh assets
call :BUILD_FRONTEND_SILENT
if %errorlevel% neq 0 (
    echo [!] Build failed. EXE compilation aborted.
    pause
    goto MENU
)

echo.
echo ====================================================================
echo  COMPILING STANDALONE WINDOWS EXECUTABLE (UMIS.exe)
echo ====================================================================
echo.

cd src\backend

:: Ensure virtual environment is active or pyinstaller is available
where pyinstaller >nul 2>nul
if %errorlevel% neq 0 (
    echo [*] Checking for PyInstaller inside active virtual environment (.venv)...
    if exist ".venv\Scripts\pyinstaller.exe" (
        set "PYINSTALLER_CMD=.venv\Scripts\pyinstaller.exe"
    ) else (
        echo [!] Error: PyInstaller was not found in PATH or in the .venv folder.
        echo     Please run: pip install pyinstaller
        cd /d "%PROJECT_ROOT%"
        pause
        goto MENU
    )
) else (
    set "PYINSTALLER_CMD=pyinstaller"
)

echo [*] Compiling UMIS using umis.spec...
call "%PYINSTALLER_CMD%" umis.spec

if %errorlevel% neq 0 (
    echo [!] Error: PyInstaller compilation failed.
    cd /d "%PROJECT_ROOT%"
    pause
    goto MENU
)

echo.
echo [+] SUCCESS: Standalone Windows Executable built successfully!
echo     Executable is located at: src\backend\dist\UMIS.exe
echo.
cd /d "%PROJECT_ROOT%"
pause
goto MENU

:BUILD_WHEEL
:: Execute frontend build first to guarantee fresh assets
call :BUILD_FRONTEND_SILENT
if %errorlevel% neq 0 (
    echo [!] Build failed. Wheel compilation aborted.
    pause
    goto MENU
)

echo.
echo ====================================================================
echo  COMPILING UNIVERSAL PYTHON WHEEL (.whl)
echo ====================================================================
echo.

cd src\backend

:: Verify Python is available
where python >nul 2>nul
if %errorlevel% neq 0 (
    echo [!] Error: Python was not found in your system PATH.
    cd /d "%PROJECT_ROOT%"
    pause
    goto MENU
)

echo [*] Compiling Wheel package...
python setup.py bdist_wheel

if %errorlevel% neq 0 (
    echo [!] Error: Wheel package compilation failed.
    cd /d "%PROJECT_ROOT%"
    pause
    goto MENU
)

echo.
echo [+] SUCCESS: Universal Python Wheel built successfully!
echo     Wheel file is located at: src\backend\dist\umis-1.0.0-py3-none-any.whl
echo.
cd /d "%PROJECT_ROOT%"
pause
goto MENU

:BUILD_FRONTEND_SILENT
:: Silently trigger build & stage of frontend (used as prerequisite for EXE and Wheel compiles)
echo.
echo [*] Triggering fresh frontend build and staging...
if not exist "src\frontend\package.json" exit /b 1

cd src\frontend
call npm install >nul 2>nul
call npm run build >nul
if %errorlevel% neq 0 (
    cd /d "%PROJECT_ROOT%"
    exit /b 1
)

cd /d "%PROJECT_ROOT%"

if not exist "src\backend\core\static" mkdir "src\backend\core\static"
if not exist "src\backend\core\templates" mkdir "src\backend\core\templates"

if exist "src\backend\core\templates\index.html" del /q "src\backend\core\templates\index.html"
if exist "src\backend\core\static\_next" rmdir /s /q "src\backend\core\static\_next"
if exist "src\backend\core\static\favicon.ico" del /q "src\backend\core\static\favicon.ico"

copy /y "src\frontend\out\index.html" "src\backend\core\templates\index.html" >nul
robocopy "src\frontend\out" "src\backend\core\static" /E /XD "templates" /XF "index.html" /njh /njs /ndl /nc /ns >nul
exit /b 0

:EXIT
echo Exiting Build Utility.
exit /b 0

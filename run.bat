@echo off
title GovardhanaGiri 2.0 - Early Warning Command Center
color 0B

echo ======================================================================
echo           GOVARDHANA GIRI 2.0 - FLASH FLOOD PREDICTION SYSTEM         
echo        Hyper-Local AI Early Warning System for Hilly Regions (Telangana)
echo ======================================================================
echo.

:: 1. Check Python installation
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python is not installed or not added to your PATH!
    echo Please install Python 3.10+ and try again.
    pause
    exit /b 1
)

:: 2. Optional: Install dependencies if missing
echo [*] Checking dependencies...
python -c "import fastapi, uvicorn, xgboost, sklearn, pandas, numpy, joblib" >nul 2>&1
if errorlevel 1 (
    echo [*] Installing required packages from requirements.txt...
    pip install -r requirements.txt
    if errorlevel 1 (
        echo [ERROR] Failed to install dependencies.
        pause
        exit /b 1
    )
) else (
    echo [OK] All core dependencies verified.
)

:: 3. Launch default web browser automatically in 2 seconds
echo [*] Preparing to open Command Center dashboard...
start "" cmd /c "timeout /t 2 /nobreak >nul & start http://127.0.0.1:8000"

:: 4. Start FastAPI server serving both Backend AI & Frontend UI
echo.
echo ======================================================================
echo [SERVER] Starting GovardhanaGiri 2.0 Backend & Dashboard on Port 8000
echo [URL]    Dashboard: http://127.0.0.1:8000
echo [API]    Swagger Docs: http://127.0.0.1:8000/docs
echo ======================================================================
echo Press CTRL+C to stop the server at any time.
echo.

python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload

pause

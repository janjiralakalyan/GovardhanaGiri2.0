@echo off
title GovardhanaGiri 2.0 - Flash Flood Early Warning Command Center
color 0B
cls

echo.
echo  ==========================================================================
echo  ##    GOVARDHANA GIRI 2.0 - FLASH FLOOD PREDICTION SYSTEM              ##
echo  ##    Hyper-Local AI Early Warning System for Hilly Regions (Telangana) ##
echo  ==========================================================================
echo.

:: ============================================================
::  STEP 1: CHECK PYTHON INSTALLATION
:: ============================================================
echo  [1/6] Checking Python installation...
python --version >nul 2>&1
if errorlevel 1 (
    color 0C
    echo.
    echo  [ERROR] Python is NOT installed or not in your PATH!
    echo          Please install Python 3.10+ from https://python.org
    echo          Make sure to check "Add Python to PATH" during installation.
    echo.
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('python --version 2^>^&1') do set PYVER=%%i
echo  [OK] %PYVER% detected.
echo.

:: ============================================================
::  STEP 2: VERIFY PROJECT STRUCTURE (Backend + Frontend + Models + Data)
:: ============================================================
echo  [2/6] Verifying project structure...

:: --- Backend Files ---
set MISSING=0
if not exist "backend\main.py" (
    echo  [MISSING] backend\main.py
    set MISSING=1
)
if not exist "backend\predictor.py" (
    echo  [MISSING] backend\predictor.py
    set MISSING=1
)
if not exist "backend\mock_telemetry.py" (
    echo  [MISSING] backend\mock_telemetry.py
    set MISSING=1
)
if not exist "backend\nelens_router.py" (
    echo  [MISSING] backend\nelens_router.py
    set MISSING=1
)

:: --- Frontend Files ---
if not exist "frontend\index.html" (
    echo  [MISSING] frontend\index.html
    set MISSING=1
)
if not exist "frontend\nelens.html" (
    echo  [MISSING] frontend\nelens.html
    set MISSING=1
)
if not exist "frontend\css\dashboard.css" (
    echo  [MISSING] frontend\css\dashboard.css
    set MISSING=1
)
if not exist "frontend\css\nelens.css" (
    echo  [MISSING] frontend\css\nelens.css
    set MISSING=1
)
if not exist "frontend\css\terrain_3d.css" (
    echo  [MISSING] frontend\css\terrain_3d.css
    set MISSING=1
)
if not exist "frontend\js\app.js" (
    echo  [MISSING] frontend\js\app.js
    set MISSING=1
)
if not exist "frontend\js\map.js" (
    echo  [MISSING] frontend\js\map.js
    set MISSING=1
)
if not exist "frontend\js\nelens_app.js" (
    echo  [MISSING] frontend\js\nelens_app.js
    set MISSING=1
)
if not exist "frontend\js\nelens_map.js" (
    echo  [MISSING] frontend\js\nelens_map.js
    set MISSING=1
)
if not exist "frontend\js\terrain_3d.js" (
    echo  [MISSING] frontend\js\terrain_3d.js
    set MISSING=1
)
if not exist "frontend\js\terrain_3d_ui.js" (
    echo  [MISSING] frontend\js\terrain_3d_ui.js
    set MISSING=1
)
if not exist "frontend\js\audio_alerts.js" (
    echo  [MISSING] frontend\js\audio_alerts.js
    set MISSING=1
)

:: --- AI Models ---
if not exist "models\flash_flood_binary_xgb.joblib" (
    echo  [MISSING] models\flash_flood_binary_xgb.joblib
    set MISSING=1
)
if not exist "models\flash_flood_risk_xgb.joblib" (
    echo  [MISSING] models\flash_flood_risk_xgb.joblib
    set MISSING=1
)
if not exist "models\lead_time_regressor_xgb.joblib" (
    echo  [MISSING] models\lead_time_regressor_xgb.joblib
    set MISSING=1
)
if not exist "models\risk_label_encoder.joblib" (
    echo  [MISSING] models\risk_label_encoder.joblib
    set MISSING=1
)

:: --- Data Files ---
if not exist "data\telangana_flash_flood_dataset.csv" (
    echo  [MISSING] data\telangana_flash_flood_dataset.csv
    set MISSING=1
)
if not exist "data\telangana_geography_layers.json" (
    echo  [MISSING] data\telangana_geography_layers.json
    set MISSING=1
)
if not exist "data\telangana_monitoring_stations.json" (
    echo  [MISSING] data\telangana_monitoring_stations.json
    set MISSING=1
)

if %MISSING%==1 (
    echo.
    echo  [WARNING] Some project files are missing! The system may not work correctly.
    echo            Please ensure all files are present before running.
    echo.
    choice /C YN /M "  Continue anyway? (Y/N)"
    if errorlevel 2 exit /b 1
) else (
    echo  [OK] Backend ......... 4 modules verified
    echo  [OK] Frontend ........ 2 HTML + 2 CSS + 5 JS files verified
    echo  [OK] AI Models ....... 4 XGBoost models verified
    echo  [OK] Data ............ 3 datasets verified
)
echo.

:: ============================================================
::  STEP 3: INSTALL / VERIFY PYTHON DEPENDENCIES
:: ============================================================
echo  [3/6] Checking Python dependencies...
python -c "import fastapi, uvicorn, xgboost, sklearn, pandas, numpy, joblib, pydantic" >nul 2>&1
if errorlevel 1 (
    echo  [*] Some packages are missing. Installing from requirements.txt...
    pip install -r requirements.txt
    if errorlevel 1 (
        color 0C
        echo.
        echo  [ERROR] Failed to install dependencies!
        echo          Try running: pip install -r requirements.txt manually.
        echo.
        pause
        exit /b 1
    )
    echo  [OK] All packages installed successfully.
) else (
    echo  [OK] All Python dependencies are installed.
)
echo.

:: ============================================================
::  STEP 4: CHECK IF PORT 8000 IS ALREADY IN USE
:: ============================================================
echo  [4/6] Checking port 8000 availability...
netstat -ano | findstr ":8000 " | findstr "LISTENING" >nul 2>&1
if not errorlevel 1 (
    echo  [WARNING] Port 8000 is already in use!
    echo            Another instance might be running.
    choice /C YN /M "  Kill existing process and continue? (Y/N)"
    if errorlevel 2 (
        echo  [*] Aborting. Please free port 8000 and try again.
        pause
        exit /b 1
    )
    for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":8000 " ^| findstr "LISTENING"') do (
        taskkill /PID %%p /F >nul 2>&1
    )
    echo  [OK] Previous process terminated.
)
echo  [OK] Port 8000 is available.
echo.

:: ============================================================
::  STEP 5: AUTO-OPEN BROWSER (after 3 second delay)
:: ============================================================
echo  [5/6] Browser will auto-open in 3 seconds...
start "" cmd /c "timeout /t 3 /nobreak >nul & start http://127.0.0.1:8000"
echo.

:: ============================================================
::  STEP 6: LAUNCH FULL-STACK SERVER
:: ============================================================
echo  ==========================================================================
echo.
echo   GovardhanaGiri 2.0 is STARTING UP!
echo.
echo   DASHBOARD PAGES:
echo     Main (NeLens)  :  http://127.0.0.1:8000
echo     Flood Monitor  :  http://127.0.0.1:8000/floods
echo     NeLens Page    :  http://127.0.0.1:8000/nelens
echo.
echo   API ENDPOINTS:
echo     Swagger Docs   :  http://127.0.0.1:8000/docs
echo     Health Check   :  http://127.0.0.1:8000/api/health
echo     All Stations   :  http://127.0.0.1:8000/api/stations
echo     Model Info     :  http://127.0.0.1:8000/api/model-info
echo.
echo   [6/6] FastAPI + Uvicorn server starting with hot-reload...
echo.
echo  ==========================================================================
echo   Press CTRL+C to stop the server at any time.
echo  ==========================================================================
echo.

python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload

:: If server stops, show message
echo.
echo  ==========================================================================
echo   Server has stopped. Press any key to exit.
echo  ==========================================================================
pause

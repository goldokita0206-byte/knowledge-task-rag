@echo off
cd /d %~dp0
echo ======================================
echo   Knowledge-Task RAG ????
echo ======================================
echo.

echo [1/2] ????????...
cd backend
start "Backend-API" cmd /k "venv\Scripts\activate && uvicorn main:app --reload --host 127.0.0.1 --port 8000 --workers 1"
cd ..

timeout /t 4 /nobreak >nul

echo [2/2] ?????????...
cd frontend
if not exist node_modules (
  echo ?????????: npm install
  call npm install
)
start "Frontend-UI" cmd /k "npm run dev"

echo.
echo  ??????!
echo 
echo  ??????: http://127.0.0.1:3000
echo  API???  : http://127.0.0.1:8000/docs
echo 
pause

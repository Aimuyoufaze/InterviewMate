@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo 🚀 启动 Interview Mate...
echo 📡 启动服务 (port 8000)...
echo.
echo    打开浏览器访问: http://localhost:8000
echo    按 Ctrl+C 停止服务
echo.

cd backend
".venv\Scripts\python.exe" main.py

#!/bin/bash
# Interview Mate 一键启动
cd "$(dirname "$0")"

echo "🚀 启动 Interview Mate..."

# 启动后端
echo "📡 启动后端 (port 8000)..."
cd backend
.venv/bin/python main.py &
BACKEND_PID=$!
cd ..

sleep 2

# 启动前端
echo "🌐 启动前端 (port 8080)..."
cd frontend
python3 -m http.server 8080 &
FRONTEND_PID=$!
cd ..

sleep 1

echo ""
echo "✅ 一切就绪！"
echo "   前端: http://localhost:8080"
echo "   后端: http://localhost:8000"
echo ""
echo "   按 Ctrl+C 停止所有服务"

# 等待，退出时清理
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo '已停止'" EXIT
wait

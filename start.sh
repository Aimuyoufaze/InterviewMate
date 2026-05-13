#!/bin/bash
# Interview Mate — 跨平台一键启动
set -e

cd "$(dirname "$0")"

# ═══════════════════════════════════════════════════
# OS 检测
# ═══════════════════════════════════════════════════
case "$(uname -s)" in
    MINGW*|MSYS*|CYGWIN*)
        IS_WINDOWS=true
        VENV_PYTHON=".venv/Scripts/python.exe"
        ;;
    *)
        IS_WINDOWS=false
        VENV_PYTHON=".venv/bin/python"
        ;;
esac

# ═══════════════════════════════════════════════════
# ffmpeg 检测与自动安装
# ═══════════════════════════════════════════════════
if ! command -v ffmpeg &>/dev/null; then
    echo "🔧 检测到 ffmpeg 未安装，正在自动安装..."
    if $IS_WINDOWS; then
        if command -v winget &>/dev/null; then
            winget install --silent ffmpeg 2>/dev/null || echo "⚠️ 自动安装失败，请手动安装: winget install ffmpeg"
        else
            echo "⚠️ 请手动安装 ffmpeg: https://ffmpeg.org/download.html"
        fi
    elif command -v brew &>/dev/null; then
        brew install ffmpeg 2>/dev/null || echo "⚠️ 自动安装失败，请手动安装: brew install ffmpeg"
    elif command -v apt-get &>/dev/null; then
        sudo apt-get install -y ffmpeg 2>/dev/null || echo "⚠️ 自动安装失败，请手动安装: sudo apt-get install ffmpeg"
    else
        echo "⚠️ 未找到包管理器，请手动安装 ffmpeg: https://ffmpeg.org/download.html"
    fi
fi

echo "🚀 启动 Interview Mate..."

# ═══════════════════════════════════════════════════
# 确保 Python 控制台输出使用 UTF-8（GBK 无法渲染 emoji）
# ═══════════════════════════════════════════════════
export PYTHONIOENCODING=utf-8

# ═══════════════════════════════════════════════════
# 启动后端（前端由 FastAPI StaticFiles 托管）
# ═══════════════════════════════════════════════════
echo "📡 启动服务 (port 8000)..."
cd backend
$VENV_PYTHON main.py &
BACKEND_PID=$!
cd ..

sleep 2

echo ""
echo "✅ 一切就绪！"
echo "   打开浏览器访问: http://localhost:8000"
echo ""
echo "   按 Ctrl+C 停止服务"

# 等待，退出时清理
trap "kill $BACKEND_PID 2>/dev/null; echo '已停止'" EXIT
wait

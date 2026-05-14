"""
Interview Mate — AI Agent 模拟面试平台 (后端)
"""
import os
import sys
import json
import re
import uuid
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, UploadFile, File, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel

# ═══════════════════════════════════════════════════
# PDF 文本提取（使用 pdfplumber）
# ═══════════════════════════════════════════════════
try:
    import pdfplumber
    HAS_PDFPLUMBER = True
except ImportError:
    HAS_PDFPLUMBER = False

load_dotenv()

# ── 确保能找到同级模块 ──────────────────────────
sys.path.insert(0, str(Path(__file__).parent))

from persona import (
    get_all_personas, get_persona, extract_persona_async,
    GENERAL_PERSONAS, ExtractedPersona, delete_persona
)
from interview import start_interview, continue_interview, end_interview
from chat import chat as main_agent_chat, AGENT_PROFILES
from history import list_sessions, get_session as history_get_session
from api_config import set_api_key, set_base_url

app = FastAPI(title="Interview Mate", version="0.2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ═══════════════════════════════════════════════════
# 请求/响应模型
# ═══════════════════════════════════════════════════

class StartRequest(BaseModel):
    persona_id: str
    persona_name: str = ""       # 面试官名称
    field: str
    background: str | None = None
    resume: str | None = None
    language: str = "zh"

class ChatRequest(BaseModel):
    messages: list[dict]          # [{"role":"user/assistant","content":"..."}]
    language: str = "zh"
    agent_profile: dict | None = None
    resume_content: str = ""
    background_content: str = ""
    user_name: str = ""
    is_first_visit: bool = False

class ContinueRequest(BaseModel):
    session_id: str
    message: str

class EndRequest(BaseModel):
    session_id: str

class ExtractRequest(BaseModel):
    name: str
    affiliation: str = ""
    papers: list[str] = []
    materials: list[str] = []
    language: str = "zh"  # 输出语言: zh / en


# ═══════════════════════════════════════════════════
# 背景文件管理
# ═══════════════════════════════════════════════════

UPLOAD_DIR = Path(__file__).parent / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# 当前背景文件信息（内存 + 文件持久化）
BACKGROUND_META_PATH = UPLOAD_DIR / "_background_meta.json"


def _load_background_meta() -> dict:
    """加载背景元数据（文件名、文件路径、提取的文本内容）"""
    if BACKGROUND_META_PATH.exists():
        try:
            return json.loads(BACKGROUND_META_PATH.read_text(encoding="utf-8"))
        except Exception:
            pass
    return {"filename": None, "filepath": None, "content": None}


def _save_background_meta(meta: dict):
    """保存背景元数据"""
    BACKGROUND_META_PATH.write_text(
        json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8"
    )


# ── 简历元数据 ──────────────────────────────────
RESUME_META_PATH = UPLOAD_DIR / "_resume_meta.json"


def _load_resume_meta() -> dict:
    """加载简历元数据"""
    if RESUME_META_PATH.exists():
        try:
            return json.loads(RESUME_META_PATH.read_text(encoding="utf-8"))
        except Exception:
            pass
    return {"filename": None, "filepath": None, "content": None}


def _save_resume_meta(meta: dict):
    """保存简历元数据"""
    RESUME_META_PATH.write_text(
        json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8"
    )


def _extract_pdf_text(filepath: str) -> str:
    """用 pdfplumber 提取 PDF 文本内容"""
    if not HAS_PDFPLUMBER:
        raise HTTPException(status_code=500, detail="pdfplumber 未安装，请执行: pip install pdfplumber")
    text_parts = []
    with pdfplumber.open(filepath) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text()
            if page_text:
                text_parts.append(page_text)
    return "\n\n".join(text_parts)


def _extract_text_from_file(filepath: str, original_filename: str) -> str:
    """根据文件类型提取文本内容"""
    ext = Path(original_filename).suffix.lower()
    if ext == ".pdf":
        return _extract_pdf_text(filepath)
    elif ext in (".txt", ".md"):
        return Path(filepath).read_text(encoding="utf-8")
    else:
        # 尝试当作文本文件读取
        try:
            return Path(filepath).read_text(encoding="utf-8", errors="replace")
        except Exception:
            return f"[无法提取文本内容: 不支持的文件格式 {ext}]"


@app.post("/api/background/upload")
async def upload_background(file: UploadFile = File(...)):
    """
    上传项目背景文件（如 PDF/文本），提取内容并保存。
    返回文件名和提取的文本摘要。
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="未选择文件")

    # 检查文件类型
    ext = Path(file.filename).suffix.lower()
    allowed_exts = {".pdf", ".txt", ".md", ".docx", ".csv", ".json"}
    if ext not in allowed_exts:
        raise HTTPException(
            status_code=400,
            detail=f"不支持的文件格式: {ext}。支持的格式: {', '.join(allowed_exts)}"
        )

    # 保存文件
    safe_filename = f"{uuid.uuid4().hex}{ext}"
    filepath = UPLOAD_DIR / safe_filename
    content = await file.read()
    filepath.write_bytes(content)

    # 提取文本
    try:
        extracted_text = _extract_text_from_file(str(filepath), file.filename)
    except HTTPException:
        raise
    except Exception as e:
        extracted_text = f"[文本提取失败: {str(e)}]"

    # 限制文本长度（防止 API 请求过大）
    max_chars = 10000
    if len(extracted_text) > max_chars:
        extracted_text = extracted_text[:max_chars] + f"\n\n[...文本过长，已截取前 {max_chars} 字符]"

    # 保存元数据
    meta = {
        "filename": file.filename,
        "filepath": str(filepath),
        "content": extracted_text
    }
    _save_background_meta(meta)

    return {
        "message": "文件上传成功",
        "filename": file.filename,
        "saved_as": safe_filename,
        "text_length": len(extracted_text),
        "preview": extracted_text[:200] + ("..." if len(extracted_text) > 200 else "")
    }


@app.get("/api/background")
async def get_background():
    """获取当前背景文件信息（文件名和内容预览）"""
    meta = _load_background_meta()
    if not meta.get("filename"):
        return {"filename": None, "has_background": False}
    return {
        "filename": meta["filename"],
        "has_background": True,
        "text_length": len(meta.get("content", "") or ""),
        "preview": (meta.get("content", "") or "")[:200]
    }


@app.delete("/api/background")
async def delete_background():
    """删除背景文件"""
    meta = _load_background_meta()
    if meta.get("filepath"):
        try:
            Path(meta["filepath"]).unlink(missing_ok=True)
        except Exception:
            pass
    # 清空元数据
    _save_background_meta({"filename": None, "filepath": None, "content": None})
    return {"message": "背景文件已删除"}

# ═══════════════════════════════════════════════════
# 个人简历
# ═══════════════════════════════════════════════════

@app.post("/api/resume/upload")
async def upload_resume(file: UploadFile = File(...)):
    """上传个人简历文件"""
    if not file.filename:
        raise HTTPException(status_code=400, detail="未选择文件")

    ext = Path(file.filename).suffix.lower()
    allowed_exts = {".pdf", ".txt", ".md", ".docx"}
    if ext not in allowed_exts:
        raise HTTPException(status_code=400, detail=f"不支持的文件格式: {ext}")

    safe_filename = f"resume_{uuid.uuid4().hex}{ext}"
    filepath = UPLOAD_DIR / safe_filename
    content = await file.read()
    filepath.write_bytes(content)

    try:
        extracted_text = _extract_text_from_file(str(filepath), file.filename)
    except Exception as e:
        extracted_text = f"[文本提取失败: {str(e)}]"

    max_chars = 10000
    if len(extracted_text) > max_chars:
        extracted_text = extracted_text[:max_chars] + f"\n\n[...文本过长，已截取前 {max_chars} 字符]"

    _save_resume_meta({"filename": file.filename, "filepath": str(filepath), "content": extracted_text})

    return {
        "message": "简历上传成功",
        "filename": file.filename,
        "saved_as": safe_filename,
        "text_length": len(extracted_text),
        "preview": extracted_text[:200] + ("..." if len(extracted_text) > 200 else "")
    }


@app.get("/api/resume")
async def get_resume():
    """获取当前简历信息"""
    meta = _load_resume_meta()
    if not meta.get("filename"):
        return {"filename": None, "has_resume": False}
    return {
        "filename": meta["filename"],
        "has_resume": True,
        "text_length": len(meta.get("content", "")),
        "preview": meta.get("content", "")[:300] + "..." if len(meta.get("content", "")) > 300 else meta.get("content", "")
    }


@app.delete("/api/resume")
async def delete_resume():
    """删除已上传的简历"""
    meta = _load_resume_meta()
    if meta.get("filepath") and os.path.exists(meta["filepath"]):
        os.remove(meta["filepath"])
    _save_resume_meta({"filename": None, "filepath": None, "content": None})
    return {"message": "简历已删除"}


async def apply_api_key_override(request: Request):
    """Dependency: Read API key/URL from custom HTTP headers and set context vars."""
    api_key = request.headers.get("X-DeepSeek-API-Key", "")
    base_url = request.headers.get("X-DeepSeek-Base-URL", "")
    if api_key:
        set_api_key(api_key)
    if base_url:
        set_base_url(base_url)


# ═══════════════════════════════════════════════════
# API 路由
# ═══════════════════════════════════════════════════

@app.get("/api/health")
async def health():
    return {"status": "ok", "version": "0.2.0"}

@app.get("/api/personas")
async def list_personas(language: str = "zh"):
    """获取所有可用的面试官人格"""
    return {"personas": get_all_personas(language=language)}

@app.get("/api/personas/{pid}")
async def get_persona_detail(pid: str, language: str = "zh"):
    """获取某个面试官人格详情"""
    p = get_persona(pid, language=language)
    if not p:
        raise HTTPException(status_code=404, detail="Persona not found")
    return {"persona": p}

@app.post("/api/personas/extract")
async def extract_persona(req: ExtractRequest, _: bool = Depends(apply_api_key_override)):
    """
    Persona Extraction (蒸馏)：
    根据导师姓名和机构，搜索 ArXiv 论文 + 网络公开信息，
    用 DeepSeek 分析生成真实导师画像，存入 SQLite。
    """
    try:
        result = await extract_persona_async(req.name, req.affiliation, language=req.language)
        return {"persona": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"提取失败: {str(e)}")

@app.delete("/api/personas/{pid}")
async def remove_persona(pid: str):
    """删除已提取的导师画像"""
    if pid in GENERAL_PERSONAS:
        raise HTTPException(status_code=400, detail="不能删除通用面试官人格")
    if not delete_persona(pid):
        raise HTTPException(status_code=404, detail="Persona not found")
    return {"message": f"已删除面试官: {pid}"}

@app.post("/api/interview/start")
async def interview_start(req: StartRequest, _: bool = Depends(apply_api_key_override)):
    """开始面试（可选携带背景文件内容）"""
    if not get_persona(req.persona_id):
        raise HTTPException(status_code=400, detail="无效的面试官人格 ID")
    # 尝试读取背景文件（如果存在）
    background = req.background
    if not background:
        meta = _load_background_meta()
        background = meta.get("content")
    # 尝试读取简历文件（如果存在）
    resume = req.resume
    if not resume:
        resume_meta = _load_resume_meta()
        resume = resume_meta.get("content")
    result = await start_interview(req.persona_id, req.field, background=background, resume=resume, language=req.language, persona_name=req.persona_name)
    return result

@app.post("/api/interview/respond")
async def interview_respond(req: ContinueRequest, _: bool = Depends(apply_api_key_override)):
    """继续面试——回复面试官"""
    result = await continue_interview(req.session_id, req.message)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result

@app.post("/api/interview/end")
async def interview_end(req: EndRequest, _: bool = Depends(apply_api_key_override)):
    """结束面试并获取反馈"""
    result = await end_interview(req.session_id)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result

# ═══════════════════════════════════════════════════
# STT — 语音转文字
# ═══════════════════════════════════════════════════
#
# 支持以下模式（按优先级）：
#
# 1. STT_PROVIDER=baidu    → 百度语音识别（推荐国内用户）
#    .env 需配置 BAIDU_STT_API_KEY / BAIDU_STT_SECRET_KEY
#
# 2. STT_API_KEY 已配置     → OpenAI 兼容的 Whisper API (Groq / OpenAI 等)
#    .env 需配置 STT_API_KEY / STT_API_URL / STT_MODEL
#
# 3. 以上均未配置            → 本地 Whisper（离线可用，但首次会下载模型）

@app.post("/api/stt/transcribe")
async def stt_transcribe(
    file: UploadFile = File(...),
):
    """将上传的音频文件转写成文字。"""
    if not file.filename:
        raise HTTPException(status_code=400, detail="未上传音频文件")

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="音频文件为空")

    provider = os.getenv("STT_PROVIDER", "")
    stt_key = os.getenv("STT_API_KEY", "")

    if provider == "baidu":
        # 🅰️ 百度语音识别
        return await _baidu_stt(content)
    elif stt_key:
        # 🅱️ OpenAI 兼容 Whisper API
        return await _openai_whisper_stt(content, file.filename, file.content_type)
    else:
        # 🅲 本地 Whisper（兜底）
        return await _local_stt(content)


# ── Provider: 百度语音识别 ──────────────────────

async def _baidu_stt(audio_bytes: bytes) -> dict:
    try:
        from stt_baidu import transcribe, check_config
        ok, msg = check_config()
        if not ok:
            raise HTTPException(
                status_code=400,
                detail=f"百度语音识别配置不完整: {msg}\n\n"
                       f"请在 .env 中设置：\n"
                       f"  BAIDU_STT_API_KEY=你的API_Key\n"
                       f"  BAIDU_STT_SECRET_KEY=你的Secret_Key\n"
                       f"（从 https://console.bce.baidu.com/ai/#/ai/speech/overview/index 获取）"
            )
        text = await transcribe(audio_bytes)
        return {"text": text, "source": "baidu", "language": "zh"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"百度语音识别失败: {str(e)}")


# ── Provider: OpenAI 兼容 Whisper API ───────────

async def _openai_whisper_stt(audio_bytes: bytes, filename: str, content_type: str | None) -> dict:
    import httpx

    stt_url = os.getenv("STT_API_URL", "https://api.openai.com/v1/audio/transcriptions")
    stt_key = os.getenv("STT_API_KEY", "")
    stt_model = os.getenv("STT_MODEL", "whisper-1")

    try:
        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.post(
                stt_url,
                headers={"Authorization": f"Bearer {stt_key}"},
                files={
                    "file": (filename, audio_bytes, content_type or "audio/webm")
                },
                data={"model": stt_model, "language": "zh"},
            )
            result = resp.json()
            if resp.status_code != 200:
                raise HTTPException(
                    status_code=502,
                    detail=f"STT API 错误 ({resp.status_code}): {result.get('error', {}).get('message', resp.text)}"
                )
            return {"text": result.get("text", ""), "source": "api", "language": "zh"}
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="STT API 请求超时")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"STT API 调用失败: {str(e)}")


# ── Provider: 本地 Whisper（兜底） ──────────────

async def _local_stt(audio_bytes: bytes) -> dict:
    try:
        from stt_local import transcribe
        text = await transcribe(audio_bytes, language="zh")
        return {"text": text, "source": "local", "language": "zh"}
    except ImportError as e:
        raise HTTPException(
            status_code=500,
            detail=f"本地 Whisper 未安装: {e}\n请执行: pip install faster-whisper"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"本地语音转写失败: {str(e)}"
        )


# ═══════════════════════════════════════════════════
# Main Agent 聊天
# ═══════════════════════════════════════════════════

@app.post("/api/chat")
async def agent_chat(req: ChatRequest, _: bool = Depends(apply_api_key_override)):
    """Main Agent 对话——面试备考陪伴助手"""
    try:
        result = await main_agent_chat(
            messages=req.messages,
            language=req.language,
            agent_profile=req.agent_profile,
            resume_content=req.resume_content,
            background_content=req.background_content,
            user_name=req.user_name,
            is_first_visit=req.is_first_visit
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"对话失败: {str(e)}")


@app.get("/api/agent/profiles")
async def get_agent_profiles(language: str = "zh"):
    """返回可用的 Main Agent 预设人格列表"""
    profiles = []
    for key, profile in AGENT_PROFILES.items():
        profiles.append({
            "id": key,
            "name": profile.get("name_zh" if language == "zh" else "name_en", key),
        })
    return {"profiles": profiles}


@app.get("/api/config/status")
async def get_config_status():
    """返回服务器端 API Key 配置状态"""
    import os
    server_key = os.getenv("DEEPSEEK_API_KEY", "")
    server_url = os.getenv("DEEPSEEK_BASE_URL", "")
    return {
        "has_server_key": bool(server_key),
        "has_server_url": bool(server_url),
    }


# ═══════════════════════════════════════════════════
# 面试历史
# ═══════════════════════════════════════════════════

@app.get("/api/history")
async def get_history():
    """返回所有已完成面试的列表"""
    return {"sessions": list_sessions()}


@app.get("/api/history/{session_id}")
async def get_history_detail(session_id: str):
    """返回某个已完成面试的完整记录"""
    session = history_get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="历史记录不存在")
    return {"session": session}


@app.delete("/api/history/{session_id}")
async def delete_history(session_id: str):
    """删除一条历史记录"""
    from history import delete_session
    if not delete_session(session_id):
        raise HTTPException(status_code=404, detail="历史记录不存在")
    return {"message": "已删除"}


# ═══════════════════════════════════════════════════
# 静态文件服务（MPA：每页一个显式路由）
# ═══════════════════════════════════════════════════

FRONTEND_DIR = Path(__file__).parent.parent / "frontend"
PAGES_DIR = FRONTEND_DIR / "pages"

if PAGES_DIR.exists():
    @app.get("/")
    async def serve_chat_root():
        return FileResponse(str(PAGES_DIR / "chat.html"))

    @app.get("/chat")
    async def serve_chat():
        return FileResponse(str(PAGES_DIR / "chat.html"))

    @app.get("/interview")
    async def serve_interview():
        return FileResponse(str(PAGES_DIR / "interview.html"))

    @app.get("/history")
    async def serve_history():
        return FileResponse(str(PAGES_DIR / "history.html"))

    # CSS / JS 等静态资源（注意：mount 必须在所有 API 路由之后）
    app.mount("/css", StaticFiles(directory=str(FRONTEND_DIR / "css")), name="css")
    app.mount("/js", StaticFiles(directory=str(FRONTEND_DIR / "js")), name="js")
    print(f"[OK] Frontend (MPA): {PAGES_DIR}")

# ═══════════════════════════════════════════════════
# 启动
# ═══════════════════════════════════════════════════

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)

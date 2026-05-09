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
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

load_dotenv()

# ── 确保能找到同级模块 ──────────────────────────
sys.path.insert(0, str(Path(__file__).parent))

from persona import (
    get_all_personas, get_persona, extract_persona_async,
    GENERAL_PERSONAS, ExtractedPersona, delete_persona
)
from interview import start_interview, continue_interview, end_interview

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
    field: str

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

# ═══════════════════════════════════════════════════
# API 路由
# ═══════════════════════════════════════════════════

@app.get("/api/health")
async def health():
    return {"status": "ok", "version": "0.2.0"}

@app.get("/api/personas")
async def list_personas():
    """获取所有可用的面试官人格"""
    return {"personas": get_all_personas()}

@app.get("/api/personas/{pid}")
async def get_persona_detail(pid: str):
    """获取某个面试官人格详情"""
    p = get_persona(pid)
    if not p:
        raise HTTPException(status_code=404, detail="Persona not found")
    return {"persona": p}

@app.post("/api/personas/extract")
async def extract_persona(req: ExtractRequest):
    """
    Persona Extraction (蒸馏)：
    根据导师姓名和机构，搜索 ArXiv 论文 + 网络公开信息，
    用 DeepSeek 分析生成真实导师画像，存入 SQLite。
    """
    try:
        result = await extract_persona_async(req.name, req.affiliation)
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
async def interview_start(req: StartRequest):
    """开始面试"""
    if not get_persona(req.persona_id):
        raise HTTPException(status_code=400, detail="无效的面试官人格 ID")
    result = await start_interview(req.persona_id, req.field)
    return result

@app.post("/api/interview/respond")
async def interview_respond(req: ContinueRequest):
    """继续面试——回复面试官"""
    result = await continue_interview(req.session_id, req.message)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result

@app.post("/api/interview/end")
async def interview_end(req: EndRequest):
    """结束面试并获取反馈"""
    result = await end_interview(req.session_id)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result

# ═══════════════════════════════════════════════════
# 启动
# ═══════════════════════════════════════════════════

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)

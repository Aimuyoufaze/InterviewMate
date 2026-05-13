"""
面试引擎——基于 DeepSeek 的多轮模拟面试
"""
import json
import os
import uuid
from datetime import datetime
from typing import Optional

import httpx

from persona import get_style_prompt

DEEPSEEK_BASE = os.getenv("DEEPSEEK_BASE_URL", "https://api.deepseek.com")
DEEPSEEK_KEY = os.getenv("DEEPSEEK_API_KEY", "")

SYSTEM_PROMPT_QUESTION = """你是一位研究生入学面试官。你的任务是根据以下信息生成面试问题。

{persona_style}

【候选人专业方向】{field}

面试规则：
1. 第一轮：先问一个开放性问题，了解候选人的背景和研究兴趣
2. 后续轮次：根据候选人的回答，追问技术细节和研究思路
3. 控制每个回答在 2-3 句话内，不要一次给太多信息
4. 保持面试官角色不越界，不要替候选人回答问题
5. 可以偶尔抛出反问，测试候选人的思考深度
6. 每轮只问 1 个问题

现在开始面试。"""

SYSTEM_PROMPT_FEEDBACK = """你是一位研究生入学面试评估专家。请基于以下面试记录，生成一份评估报告。

【面试官风格】{persona_style}
【目标专业方向】{field}

请从以下几个方面评估：
1. **总体印象**（一句话概括）
2. **专业知识**（候选人对专业知识的掌握程度，1-10分）
3. **逻辑思维**（回答的结构性和逻辑性，1-10分）
4. **研究潜力**（展现出的研究思维和创新性，1-10分）
5. **沟通表达**（表达的清晰度和自信度，1-10分）
6. **优势亮点**（具体的表现亮点）
7. **改进建议**（具体的改进方向和练习建议）
8. **综合评分**（1-10分）

请用中文回复，语气专业但友善。评分要附上简短理由。"""


# ── Session 管理 ──────────────────────────────────

_sessions: dict[str, dict] = {}

class InterviewSession:
    def __init__(self, persona_id: str, field: str, language: str = "zh"):
        self.session_id = str(uuid.uuid4())
        self.persona_id = persona_id
        self.field = field
        self.language = language
        self.messages: list[dict] = []
        self.started_at = datetime.now().isoformat()
        self.round = 0
        self.finished = False

    def save(self):
        _sessions[self.session_id] = self

    @staticmethod
    def load(session_id: str) -> Optional["InterviewSession"]:
        return _sessions.get(session_id)

    def to_dict(self):
        return {
            "session_id": self.session_id,
            "persona_id": self.persona_id,
            "field": self.field,
            "language": self.language,
            "round": self.round,
            "finished": self.finished,
            "started_at": self.started_at,
            "messages": self.messages
        }


def _lang_instruction(language: str) -> str:
    """Return language directive based on selected language"""
    if language == "en":
        return '\n\nIMPORTANT LANGUAGE RULE: You MUST conduct the entire interview in English. Ask all questions in English, respond in English, give feedback in English. DO NOT use Chinese unless the candidate explicitly asks to switch.'
    else:
        return '\n\nIMPORTANT LANGUAGE RULE: 请全程使用中文进行面试。用中文提问、回应和给出反馈。'


# ── LLM 调用 ──────────────────────────────────────

async def _call_deepseek(messages: list[dict], max_tokens: int = 1024, temperature: float = 0.7) -> str:
    """调用 DeepSeek Chat API"""
    if not DEEPSEEK_KEY:
        return "[模拟回复] 请配置 DEEPSEEK_API_KEY 后重试。"

    async with httpx.AsyncClient(timeout=60.0) as client:
        resp = await client.post(
            f"{DEEPSEEK_BASE}/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {DEEPSEEK_KEY}",
                "Content-Type": "application/json"
            },
            json={
                "model": "deepseek-v4-flash",
                "messages": messages,
                "max_tokens": max_tokens,
                "temperature": temperature
            }
        )
        resp.raise_for_status()
        data = resp.json()
        return data["choices"][0]["message"]["content"]


# ── 面试逻辑 ──────────────────────────────────────

async def start_interview(persona_id: str, field: str, background: str | None = None, resume: str | None = None, language: str = "zh") -> dict:
    """开始一轮新面试，返回第一个问题

    Args:
        persona_id: 面试官人格 ID
        field: 面试方向
        background: 可选的项目背景文件内容
        resume: 可选的个人简历内容
        language: 面试语言 (zh/en)
    """
    style_prompt = get_style_prompt(persona_id, language=language)

    session = InterviewSession(persona_id, field, language=language)
    session.save()

    # 基础 system prompt
    system_msg = SYSTEM_PROMPT_QUESTION.format(
        persona_style=style_prompt,
        field=field
    )

    # 语言指令
    system_msg += _lang_instruction(language)

    # 如果有背景文件内容，附加到 system prompt
    if background and background.strip():
        system_msg += f"\n\n【项目背景要求】\n{background.strip()}\n\n请注意：以上是候选人的项目背景信息。面试问题时需要结合候选人的项目背景进行针对性提问，考察候选人对该领域的理解和匹配度。"

    # 如果有简历内容，附加到 system prompt
    if resume and resume.strip():
        system_msg += f"\n\n【候选人简历】\n{resume.strip()}\n\n注意：以上是候选人的个人简历。面试官应该仔细阅读简历内容，并基于简历中的经历、技能和项目提出有针对性的问题。"

    first_user_msg = "请开始面试，先让我自我介绍。" if language == "zh" else "Please start the interview. Let me introduce myself first."

    msgs = [
        {"role": "system", "content": system_msg},
        {"role": "user", "content": first_user_msg}
    ]

    try:
        reply = await _call_deepseek(msgs, temperature=0.8)
    except Exception as e:
        reply = f"[抱歉，AI 模型调用失败: {e}]"

    session.messages.append({"role": "assistant", "content": reply, "round": 0})
    session.round = 1
    session.save()

    return {
        "session_id": session.session_id,
        "question": reply,
        "round": 0,
        "persona_id": persona_id
    }


async def continue_interview(session_id: str, user_message: str) -> dict:
    """继续面试，返回面试官的下一个问题"""
    session = InterviewSession.load(session_id)
    if not session:
        return {"error": "面试会话不存在"}

    if session.finished:
        return {"error": "面试已结束"}

    style_prompt = get_style_prompt(session.persona_id, language=session.language)

    # 构建消息历史
    system_msg = SYSTEM_PROMPT_QUESTION.format(
        persona_style=style_prompt,
        field=session.field
    )
    system_msg += _lang_instruction(session.language)
    msgs = [{"role": "system", "content": system_msg}]

    for msg in session.messages:
        if msg["role"] == "user":
            msgs.append({"role": "user", "content": msg["content"]})
        else:
            msgs.append({"role": "assistant", "content": msg["content"]})

    msgs.append({"role": "user", "content": user_message})

    try:
        reply = await _call_deepseek(msgs, temperature=0.8)
    except Exception as e:
        reply = f"[抱歉，AI 模型调用失败: {e}]"

    # 记录
    session.messages.append({"role": "user", "content": user_message, "round": session.round})
    session.messages.append({"role": "assistant", "content": reply, "round": session.round})
    session.round += 1
    session.save()

    return {
        "session_id": session_id,
        "question": reply,
        "round": session.round - 1,
    }


async def end_interview(session_id: str) -> dict:
    """结束面试并生成反馈"""
    session = InterviewSession.load(session_id)
    if not session:
        return {"error": "面试会话不存在"}

    session.finished = True
    session.save()

    style_prompt = get_style_prompt(session.persona_id, language=session.language)

    # 整理对话记录
    transcript = ""
    for msg in session.messages:
        role = "面试官" if msg["role"] == "assistant" else "候选人"
        transcript += f"\n[{role}]: {msg['content']}\n"

    system_msg = SYSTEM_PROMPT_FEEDBACK.format(
        persona_style=style_prompt,
        field=session.field
    )
    system_msg += _lang_instruction(session.language)

    feedback_prompt = f"以下是本次模拟面试的记录：\n{transcript}\n请生成评估报告。" if session.language == "zh" else f"Here is the interview transcript:\n{transcript}\nPlease generate an evaluation report."

    msgs = [
        {"role": "system", "content": system_msg},
        {"role": "user", "content": feedback_prompt}
    ]

    try:
        feedback = await _call_deepseek(msgs, max_tokens=2048, temperature=0.5)
    except Exception as e:
        feedback = f"[反馈生成失败: {e}]"

    return {
        "session_id": session_id,
        "feedback": feedback,
        "summary": {
            "total_rounds": session.round,
            "field": session.field,
            "persona_id": session.persona_id
        }
    }

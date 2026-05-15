"""
Main Agent 聊天引擎 — 面试备考陪伴助手
"""
import httpx

from api_config import get_api_key, get_base_url

# ── 预设 Agent 人格 ──────────────────────────

AGENT_PROFILES = {
    "friendly": {
        "name_zh": "友好陪伴型",
        "name_en": "Friendly Companion",
        "prompt": """你是一位友善、温暖的面试备考陪伴助手。你的角色是：
- 用鼓励和支持的语气与用户交流
- 耐心解答面试准备相关的问题
- 在用户紧张或焦虑时给予安慰和建议
- 分享面试技巧和经验，但保持轻松的氛围
- 像一位有经验的朋友一样陪伴用户的备考旅程""",
    },
    "strict": {
        "name_zh": "严格导师型",
        "name_en": "Strict Mentor",
        "prompt": """你是一位严格、专业的面试备考导师。你的角色是：
- 用高标准要求用户，不轻易给出"不错"的评价
- 锐利地指出用户思路中的问题和逻辑漏洞
- 给出具体、可操作的改进建议
- 推动用户走出舒适区，挑战更高难度
- 像一位严厉但真正关心学生成长的导师""",
    },
    "wise": {
        "name_zh": "睿智学者型",
        "name_en": "Wise Scholar",
        "prompt": """你是一位睿智、博学的学术导师。你的角色是：
- 引经据典、深入浅出地解答问题
- 启发用户从多角度思考问题
- 分享学术界的思维方式和文化
- 在回答中融入学科前沿动态和方法论
- 像一位德高望重的教授一样循循善诱""",
    },
}

DEFAULT_SYSTEM_PROMPT = """你是一位友善、知识渊博的面试备考陪伴助手（Interview Mate）。你的职责是：

1. **陪伴与规划**：了解用户的面试目标，帮助制定备考计划
2. **知识解答**：回答用户关于面试流程、技巧、学术概念的问题
3. **模拟建议**：在用户使用模拟面试功能前后，给出准备建议和复盘分析
4. **鼓励支持**：关注用户的情绪状态，在备考过程中提供心理支持

行为准则：
- 用中文交流（除非用户用英文提问）
- 每次回复控制在 3-5 句话内，简洁有力
- 保持专业但不失温暖
- 可以适时反问以了解用户需求
- 记住用户分享的关键信息（目标院校、专业方向等）"""


def build_system_prompt(agent_profile: dict | None = None, resume_content: str = "",
                        background_content: str = "", user_name: str = "",
                        is_first_visit: bool = False) -> str:
    """构建完整的 System prompt"""
    prompt = ""

    # 用户自定义或预设人格
    if agent_profile and agent_profile.get("prompt"):
        prompt = agent_profile["prompt"]
    else:
        prompt = DEFAULT_SYSTEM_PROMPT

    # 附加用户信息
    if user_name:
        prompt += f"\n\n当前用户：{user_name}"

    # 附加简历
    if resume_content and resume_content.strip():
        prompt += f"\n\n用户简历内容：\n{resume_content.strip()}\n\n你可以根据用户的简历，提供更个性化的建议。"

    # 附加背景文件
    if background_content and background_content.strip():
        prompt += f"\n\n用户目标项目背景：\n{background_content.strip()}\n\n你可以结合该项目的背景信息，给出更有针对性的指导。"

    # 首次对话引导
    if is_first_visit:
        prompt += """

【重要：首次对话引导】
这是用户第一次使用 Interview Mate。请按以下步骤引导：
1. 先热情自我介绍，说明你可以如何帮助 ta
2. 询问用户的姓名（如果你还不知道的话）
3. 询问用户的面试目标（考研/保研/留学？目标院校和专业？）
4. 如果用户还没有上传简历，温和地建议 ta 在左下角设置中上传
5. 根据用户的回答，给出初步建议并引导下一步"""

    return prompt


async def _call_deepseek(messages: list[dict], max_tokens: int = 1024,
                          temperature: float = 0.7) -> str:
    """调用 DeepSeek Chat API"""
    key = get_api_key()
    base = get_base_url()
    if not key:
        return "请配置 DeepSeek API Key 后重试。可在左侧「配置 Agent」中设置。"

    async with httpx.AsyncClient(timeout=60.0) as client:
        resp = await client.post(
            f"{base}/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {key}",
                "Content-Type": "application/json"
            },
            json={
                "model": "deepseek-v4-flash",
                "messages": messages,
                "max_tokens": max_tokens,
                "temperature": temperature
            }
        )
        if resp.status_code == 401:
            return "API Key 无效或已过期，请在左侧「配置 Agent」中更新。"
        resp.raise_for_status()
        data = resp.json()
        return data["choices"][0]["message"]["content"]


async def chat(messages: list[dict], language: str = "zh",
               agent_profile: dict | None = None,
               resume_content: str = "", background_content: str = "",
               user_name: str = "", is_first_visit: bool = False) -> dict:
    """
    Main Agent 对话

    Args:
        messages: 对话历史 [{"role":"user/assistant","content":"..."}]
        language: zh / en
        agent_profile: 用户配置的 Agent 人格
        resume_content: 简历文本内容
        background_content: 背景文件文本内容
        user_name: 用户姓名
        is_first_visit: 是否首次对话（触发引导流程）

    Returns:
        {"reply": "..."}
    """
    system_msg = build_system_prompt(
        agent_profile=agent_profile,
        resume_content=resume_content,
        background_content=background_content,
        user_name=user_name,
        is_first_visit=is_first_visit
    )

    msgs = [{"role": "system", "content": system_msg}] + messages

    try:
        reply = await _call_deepseek(msgs, temperature=0.8)
    except Exception as e:
        reply = f"[抱歉，AI 模型调用失败: {e}]"

    return {"reply": reply}

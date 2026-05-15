"""
Persona 提取模块
- 真实版：ArXiv 论文搜索 + 网络搜索 + DeepSeek 分析 → 导师画像
"""
import hashlib
import json
import re
import sqlite3
from pathlib import Path
from typing import Optional

import httpx
from pydantic import BaseModel

# ── 通用面试官人格 ──────────────────────────────────

GENERAL_PERSONAS = {
    "strict": {
        "id": "strict",
        "zh": {
            "name": "严厉型",
            "description": "要求严格，喜欢追问细节，不会轻易给出正面评价",
            "style_prompt": "你是一位严厉的研究生面试官。你的风格是：语气严肃、要求严格、喜欢追问技术细节和逻辑漏洞。不要轻易说\"很好\"，要不断挑战候选人的回答。给出有建设性的批评。"
        },
        "en": {
            "name": "Strict",
            "description": "Demanding and detail-oriented, not easily impressed",
            "style_prompt": "You are a strict graduate school interviewer. Your style is: serious tone, demanding, focused on technical details and logical gaps. Never say \"good\" easily, keep challenging the candidate's answers. Give constructive criticism."
        },
        "avatar_emoji": "😤"
    },
    "gentle": {
        "id": "gentle",
        "zh": {
            "name": "温和型",
            "description": "鼓励式引导，会给出提示和方向性建议",
            "style_prompt": "你是一位温和的研究生面试官。你的风格是：语气友善、鼓励式引导、当候选人卡住时会给出提示。先肯定再指出不足，帮助候选人发挥出最好水平。"
        },
        "en": {
            "name": "Gentle",
            "description": "Encouraging and supportive, offers hints when stuck",
            "style_prompt": "You are a gentle graduate school interviewer. Your style is: friendly tone, encouraging guidance, offer hints when the candidate gets stuck. Acknowledge strengths first, then point out areas for improvement. Help the candidate do their best."
        },
        "avatar_emoji": "😊"
    },
    "probing": {
        "id": "probing",
        "zh": {
            "name": "追问型",
            "description": "一个问题接着一个问题，测试知识深度",
            "style_prompt": "你是一位追问型的研究生面试官。你的风格是：抛出一个问题后，根据回答连续追问3-4层，层层深入，直到触及候选人知识边界。不满足于表面答案，注重考察思维深度。"
        },
        "en": {
            "name": "Probing",
            "description": "Follow-up questions drill deep into knowledge",
            "style_prompt": "You are a probing graduate school interviewer. Your style is: ask a question, then follow up 3-4 levels deep based on the answer, drilling until you reach the candidate's knowledge boundary. Never satisfied with surface-level answers, focused on depth of understanding."
        },
        "avatar_emoji": "🔍"
    },
    "socratic": {
        "id": "socratic",
        "zh": {
            "name": "苏格拉底型",
            "description": "通过反问引导候选人自己发现答案",
            "style_prompt": "你是一位苏格拉底式的研究生面试官。你很少直接回答问题，而是通过连续的反问和质疑来引导候选人自己思考和发现答案。注重考察逻辑推理能力和批判性思维。"
        },
        "en": {
            "name": "Socratic",
            "description": "Uses counter-questions to guide self-discovery",
            "style_prompt": "You are a Socratic graduate school interviewer. You rarely answer questions directly. Instead, you guide the candidate through continuous counter-questions and challenges to think and discover answers themselves. Focus on logical reasoning and critical thinking."
        },
        "avatar_emoji": "🧠"
    }
}

# ── 提取的导师画像模型 ──────────────────────────────

class ExtractedPersona(BaseModel):
    id: str
    name: str
    affiliation: str
    title: str
    research_areas: list[str]
    research_style: str
    teaching_style: str
    personality_traits: list[str]
    typical_questions: list[str]
    style_prompt: str
    source_urls: list[str]


# ── SQLite 持久化 ──────────────────────────────────

DB_PATH = Path(__file__).parent / "personas.db"


def _get_conn():
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn


def _init_db():
    conn = _get_conn()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS personas (
            id              TEXT PRIMARY KEY,
            name            TEXT NOT NULL,
            affiliation     TEXT NOT NULL DEFAULT '',
            title           TEXT DEFAULT '',
            research_areas  TEXT DEFAULT '[]',
            research_style  TEXT DEFAULT '',
            teaching_style  TEXT DEFAULT '',
            personality_traits TEXT DEFAULT '[]',
            typical_questions  TEXT DEFAULT '[]',
            style_prompt    TEXT DEFAULT '',
            source_urls     TEXT DEFAULT '[]',
            created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.commit()
    conn.close()


_init_db()


def _row_to_dict(row) -> dict:
    return {
        "id": row["id"],
        "name": row["name"],
        "affiliation": row["affiliation"],
        "title": row["title"],
        "research_areas": json.loads(row["research_areas"]),
        "research_style": row["research_style"],
        "teaching_style": row["teaching_style"],
        "personality_traits": json.loads(row["personality_traits"]),
        "typical_questions": json.loads(row["typical_questions"]),
        "style_prompt": row["style_prompt"],
        "source_urls": json.loads(row["source_urls"]),
        "created_at": row["created_at"],
    }


def get_all_personas(language: str = "zh") -> dict:
    result = {}
    lang = language if language in ("zh", "en") else "zh"
    for pid, p in GENERAL_PERSONAS.items():
        localized = p.get(lang, p.get("zh", {}))
        result[pid] = {
            "id": pid, "name": localized.get("name", p["zh"]["name"]),
            "description": localized.get("description", p["zh"]["description"]),
            "type": "general",
            "avatar_emoji": p["avatar_emoji"]
        }
    conn = _get_conn()
    rows = conn.execute("SELECT * FROM personas ORDER BY created_at DESC").fetchall()
    conn.close()
    for row in rows:
        p = _row_to_dict(row)
        result[p["id"]] = {
            "id": p["id"], "name": p["name"],
            "description": f"{p['title']} @ {p['affiliation']}",
            "type": "extracted",
            "research_areas": p["research_areas"],
            "avatar_emoji": "🎓"
        }
    return result


def get_persona(pid: str, language: str = "zh") -> Optional[dict]:
    if pid in GENERAL_PERSONAS:
        p = GENERAL_PERSONAS[pid]
        lang = language if language in ("zh", "en") else "zh"
        localized = p.get(lang, p.get("zh", {}))
        return {
            "id": pid,
            "name": localized.get("name", p["zh"]["name"]),
            "description": localized.get("description", p["zh"]["description"]),
            "style_prompt": localized.get("style_prompt", p["zh"]["style_prompt"]),
            "avatar_emoji": p["avatar_emoji"]
        }
    conn = _get_conn()
    row = conn.execute("SELECT * FROM personas WHERE id=?", (pid,)).fetchone()
    conn.close()
    if row:
        return _row_to_dict(row)
    return None


def get_style_prompt(pid: str, language: str = "zh") -> str:
    if pid in GENERAL_PERSONAS:
        p = GENERAL_PERSONAS[pid]
        lang = language if language in ("zh", "en") else "zh"
        localized = p.get(lang, p.get("zh", {}))
        return localized.get("style_prompt", p["zh"]["style_prompt"])
    conn = _get_conn()
    row = conn.execute("SELECT style_prompt FROM personas WHERE id=?", (pid,)).fetchone()
    conn.close()
    if row:
        return row["style_prompt"]
    return GENERAL_PERSONAS["gentle"]["en" if language == "en" else "zh"].get("style_prompt", GENERAL_PERSONAS["gentle"]["zh"]["style_prompt"])


def store_extracted_persona(persona: ExtractedPersona):
    conn = _get_conn()
    conn.execute("""
        INSERT OR REPLACE INTO personas
               (id, name, affiliation, title, research_areas, research_style,
                teaching_style, personality_traits, typical_questions,
                style_prompt, source_urls)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        persona.id, persona.name, persona.affiliation, persona.title,
        json.dumps(persona.research_areas, ensure_ascii=False),
        persona.research_style,
        persona.teaching_style,
        json.dumps(persona.personality_traits, ensure_ascii=False),
        json.dumps(persona.typical_questions, ensure_ascii=False),
        persona.style_prompt,
        json.dumps(persona.source_urls, ensure_ascii=False),
    ))
    conn.commit()
    conn.close()


def delete_persona(pid: str) -> bool:
    conn = _get_conn()
    cur = conn.execute("DELETE FROM personas WHERE id=?", (pid,))
    conn.commit()
    conn.close()
    return cur.rowcount > 0


# ══════════════════════════════════════════════════════════════════════
# 真实版 Persona Extraction 流水线
# ══════════════════════════════════════════════════════════════════════

# ── 1. ArXiv 论文搜索 ─────────────────────────────

async def search_arxiv(name: str, max_results: int = 15) -> list[dict]:
    """搜索 ArXiv 上导师的论文"""
    import urllib.parse
    # 用 all: 格式 + 姓名（效果好于 au: 格式）
    query_name = urllib.parse.quote(f'"{name}"')
    url = (
        "http://export.arxiv.org/api/query"
        f"?search_query=all:{query_name}"
        f"&start=0&max_results={max_results}"
        "&sortBy=submittedDate&sortOrder=descending"
    )

    async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
        resp = await client.get(url)
        text = resp.text

    # 简单 XML 解析
    papers = []
    entries = re.findall(r"<entry>.*?</entry>", text, re.DOTALL)
    for entry in entries:
        title_m = re.search(r"<title>(.*?)</title>", entry, re.DOTALL)
        summary_m = re.search(r"<summary>(.*?)</summary>", entry, re.DOTALL)
        published_m = re.search(r"<published>(.*?)</published>", entry)
        arxiv_id_m = re.search(r"<id>(.*?)</id>", entry)
        authors = re.findall(r"<name>(.*?)</name>", entry)

        if not title_m:
            continue

        papers.append({
            "title": title_m.group(1).strip(),
            "summary": summary_m.group(1).strip() if summary_m else "",
            "published": published_m.group(1) if published_m else "",
            "year": published_m.group(1)[:4] if published_m else "",
            "arxiv_id": arxiv_id_m.group(1).split("/")[-1] if arxiv_id_m else "",
            "authors": authors,
        })

    return papers


# ── 2. 网络搜索 ───────────────────────────────────

async def search_web(name: str, affiliation: str = "", max_results: int = 5) -> list[dict]:
    """用 DuckDuckGo HTML 搜索导师公开信息（绕过 API 限制）"""
    results = []
    query_terms = [name]
    if affiliation:
        query_terms.append(affiliation)
    query = " ".join(query_terms)

    try:
        async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
            resp = await client.get(
                "https://html.duckduckgo.com/html/",
                params={"q": query},
                headers={
                    "User-Agent": "Mozilla/5.0 (compatible; InterviewMate/1.0)"
                }
            )
            if resp.status_code == 200:
                # 解析 HTML 结果
                import re
                # 提取结果块
                result_blocks = re.findall(
                    r'<h2 class="result__title[^>]*>.*?<a[^>]*href="([^"]+)"[^>]*>(.*?)</a>.*?<a[^>]*class="result__snippet[^>]*>(.*?)</a>',
                    resp.text, re.DOTALL
                )
                for url, title, snippet in result_blocks[:max_results]:
                    # 清理 HTML 标签
                    title = re.sub(r'<[^>]+>', '', title).strip()
                    snippet = re.sub(r'<[^>]+>', '', snippet).strip()
                    results.append({
                        "title": title,
                        "url": url,
                        "body": snippet,
                    })
                
                # 备用解析：如果上面的正则没匹配到，尝试更宽松的匹配
                if not results:
                    all_links = re.findall(
                        r'<a[^>]*class="result__a[^>]*href="([^"]+)"[^>]*>(.*?)</a>',
                        resp.text, re.DOTALL
                    )
                    snippets = re.findall(
                        r'<a[^>]*class="result__snippet[^>]*>(.*?)</a>',
                        resp.text, re.DOTALL
                    )
                    for i, (url, title) in enumerate(all_links[:max_results]):
                        title = re.sub(r'<[^>]+>', '', title).strip()
                        snippet = re.sub(r'<[^>]+>', '', snippets[i]).strip() if i < len(snippets) else ""
                        results.append({"title": title, "url": url, "body": snippet})
    except Exception as e:
        print(f"[WARN] 网络搜索失败: {e}")

    return results


# ── 3. 抓取网页内容 ───────────────────────────────

async def fetch_pages(urls: list[str], max_chars: int = 3000) -> list[str]:
    """抓取多个网页的文本内容"""
    contents = []
    async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:

        for url in urls[:3]:  # 最多抓 3 个
            try:
                resp = await client.get(url, headers={
                    "User-Agent": "Mozilla/5.0 (compatible; InterviewMate/1.0)"
                })
                if resp.status_code == 200:
                    text = resp.text
                    # 简单去标签
                    text = re.sub(r"<[^>]+>", " ", text)
                    text = re.sub(r"\s+", " ", text).strip()
                    if len(text) > max_chars:
                        text = text[:max_chars]
                    contents.append(text)
            except Exception:
                pass
    return contents


# ── 4. DeepSeek 分析生成画像 ─────────────────────

async def _call_deepseek(messages: list[dict], max_tokens: int = 4096, temperature: float = 0.7) -> str:
    from api_config import get_api_key, get_base_url
    key = get_api_key()
    base = get_base_url()
    if not key:
        return json.dumps({"error": "DeepSeek API Key 未配置，请在左侧「配置 Agent」中设置。"})

    async with httpx.AsyncClient(timeout=120.0) as client:
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
                "temperature": temperature,
            }
        )
        if resp.status_code == 401:
            return json.dumps({"error": "API Key 无效或已过期，请在左侧「配置 Agent」中更新。"})
        resp.raise_for_status()
        data = resp.json()
        return data["choices"][0]["message"]["content"]


def _get_analysis_system_prompt(language: str = 'zh') -> str:
    if language == 'en':
        return """You are an academic talent analysis expert. Your task is to generate a structured professor profile JSON based on the provided public information about this professor.

Output strictly in the following JSON format. Only output JSON, do not include any other text, do not use markdown code block markers:

{
  "title": "Professor's academic title (e.g. Professor, Associate Professor, Assistant Professor, Researcher, etc.)",
  "research_areas": ["Research Area 1", "Research Area 2", "Research Area 3", ...],
  "research_style": "Detailed description of the professor's research style (theory-driven / application-driven / mixed, what types of problems they like, etc.)",
  "teaching_style": "Description of the professor's teaching and mentoring style (based on available information)",
  "personality_traits": ["Trait 1", "Trait 2", "Trait 3", ...],
  "typical_questions": [
    "Possible interview question 1 from this professor",
    "Interview question 2",
    "Interview question 3"
  ],
  "style_prompt": "A detailed prompt to instruct the DeepSeek model to role-play as this professor as a graduate interviewer. Include: identity, research field, style characteristics, interview tone, etc. Must be written in English.",
  "summary": "One-sentence summary of this professor's academic profile"
}

Requirements:
- All content MUST be in English
- research_areas: at least 3, at most 5
- personality_traits: at least 3
- typical_questions: at least 5, with professional depth
- style_prompt: use second person, format as 'You are Professor [Name] from [Institution], an AI persona interviewer...'
- All content based on provided public information, do not fabricate"""
    return """你是一位学术人才分析专家。你的任务是基于提供的导师公开信息，生成一份结构化的导师画像 JSON。

请严格按照以下 JSON 格式输出，只输出 JSON，不要包含任何其他文字，不要使用 markdown 代码块标记：

{
  "title": "教授的职称（如教授、副教授、助理教授、研究员等）",
  "research_areas": ["研究领域1", "研究领域2", "研究领域3", ...],
  "research_style": "对导师研究风格的详细描述（理论驱动/应用驱动/混合型，喜欢什么类型的问题等）",
  "teaching_style": "导师的教学和指导风格描述（基于能找到的信息推断）",
  "personality_traits": ["性格特征1", "性格特征2", "性格特征3", ...],
  "typical_questions": [
    "这位面试官可能问候选人的面试问题1",
    "面试问题2",
    "面试问题3"
  ],
  "style_prompt": "一段详细的提示词，用于指导 DeepSeek 模型扮演这位导师作为研究生面试官。包含：身份说明、研究领域、风格特点、面试语气等。",
  "summary": "一句话总结这位导师的学术画像"
}

要求：
- 所有内容用中文
- research_areas 至少 3 个，最多 5 个
- personality_traits 至少 3 个
- typical_questions 至少 5 个，要有专业深度
- style_prompt 要用第二人称，格式为"你是 [姓名]教授（[机构]）的数字分身面试官..."
- 所有内容基于提供的公开信息，不要编造"""


async def analyze_with_deepseek(
    name: str,
    affiliation: str,
    papers: list[dict],
    web_info: list[dict],
    page_contents: list[str],
    language: str = "zh",
) -> dict:
    """用 DeepSeek 分析收集到的信息，生成导师画像"""
    # 整理信息文本
    if language == "en":
        info_parts = [f"Professor name: {name}", f"Institution: {affiliation}"]

        if papers:
            info_parts.append(f"\n--- ArXiv Papers ({len(papers)}) ---")
            for p in papers[:8]:
                info_parts.append(
                    f"- {p['title']} ({p['year']})\n"
                    f"  Abstract: {p['summary'][:300]}"
                )

        if web_info:
            info_parts.append(f"\n--- Web Search Results ({len(web_info)}) ---")
            for r in web_info[:5]:
                info_parts.append(f"- {r['title']}: {r['body'][:200]}")

        if page_contents:
            info_parts.append(f"\n--- Web Content ---")
            for c in page_contents[:3]:
                info_parts.append(c[:1500])
    else:
        info_parts = [f"导师姓名: {name}", f"所属机构: {affiliation}"]

        if papers:
            info_parts.append(f"\n--- ArXiv 论文 ({len(papers)} 篇) ---")
            for p in papers[:8]:
                info_parts.append(
                    f"- {p['title']} ({p['year']})\n"
                    f"  摘要: {p['summary'][:300]}"
                )

        if web_info:
            info_parts.append(f"\n--- 网络搜索结果 ({len(web_info)} 条) ---")
            for r in web_info[:5]:
                info_parts.append(f"- {r['title']}: {r['body'][:200]}")

        if page_contents:
            info_parts.append(f"\n--- 网页内容 ---")
            for c in page_contents[:3]:
                info_parts.append(c[:1500])

    user_message = "\n".join(info_parts)

    try:
        reply = await _call_deepseek([
            {"role": "system", "content": _get_analysis_system_prompt(language)},
            {"role": "user", "content": user_message},
        ])

        # 尝试解析 JSON
        # 去除可能的 markdown code block 包裹
        json_str = reply.strip()
        if json_str.startswith("```"):
            json_str = re.sub(r"^```(?:json)?\s*", "", json_str)
            json_str = re.sub(r"\s*```$", "", json_str)

        result = json.loads(json_str)
        return result
    except Exception as e:
        print(f"[ERROR] DeepSeek 分析失败: {e}")
        return {
            "error": f"分析失败: {e}",
            "research_areas": [f"{name}的主要研究方向"],
            "research_style": "待分析",
            "teaching_style": "待分析",
            "personality_traits": ["待分析"],
            "typical_questions": [],
            "style_prompt": f"你是{name}教授（{affiliation}）的数字分身面试官。",
            "summary": f"{name}教授的学术画像",
        }


# ── 5. 提取流水线（主入口）─────────────────────────

async def extract_persona_async(
    name: str,
    affiliation: str = "",
    papers_urls: list[str] | None = None,
    materials: list[str] | None = None,
    progress_callback=None,
    language: str = "zh",
) -> dict:
    """完整版导师画像提取流程"""
    # 生成唯一 ID
    raw = f"{name}:{affiliation}:{hashlib.md5(str(hash(name+affiliation)).encode()).hexdigest()}"
    pid = "prof_" + hashlib.md5(raw.encode()).hexdigest()[:12]

    current_papers = []
    current_web_info = []
    current_page_contents = []

    # ---- 第 1 步：搜索 ArXiv 论文 ----
    if progress_callback:
        msg = "正在搜索 ArXiv 论文..." if language == "zh" else "Searching ArXiv papers..."
        await progress_callback("search_arxiv", msg)
    try:
        current_papers = await search_arxiv(name)
    except Exception as e:
        print(f"[WARN] ArXiv 搜索失败: {e}")

    # ---- 第 2 步：网络搜索 ----
    if progress_callback:
        msg = "正在网络搜索公开信息..." if language == "zh" else "Searching web for public info..."
        await progress_callback("search_web", msg)
    try:
        current_web_info = await search_web(name, affiliation)
    except Exception as e:
        print(f"[WARN] 网络搜索失败: {e}")

    # ---- 第 3 步：抓取页面 ----
    urls_to_fetch = []
    for r in current_web_info:
        u = r.get("url", "")
        if u and not any(skip in u for skip in ["youtube.com", "facebook.com", "twitter.com"]):
            urls_to_fetch.append(u)

    if urls_to_fetch and progress_callback:
        msg = "正在读取网页内容..." if language == "zh" else "Reading web pages..."
        await progress_callback("fetch_pages", msg)
    try:
        current_page_contents = await fetch_pages(urls_to_fetch)
    except Exception as e:
        print(f"[WARN] 页面抓取失败: {e}")

    # ---- 第 4 步：DeepSeek 分析 ----
    if progress_callback:
        msg = "正在用 AI 分析生成导师画像..." if language == "zh" else "Analyzing with AI to generate professor profile..."
        await progress_callback("analyzing", msg)
    analysis = await analyze_with_deepseek(
        name, affiliation,
        current_papers, current_web_info, current_page_contents,
        language=language
    )

    # ---- 第 5 步：构建并保存 ----
    source_urls = [r["url"] for r in current_web_info if r.get("url")]

    persona = ExtractedPersona(
        id=pid,
        name=name,
        affiliation=affiliation,
        title=analysis.get("title", "教授"),
        research_areas=analysis.get("research_areas", [f"{name}的主要研究方向"]),
        research_style=analysis.get("research_style", "待分析"),
        teaching_style=analysis.get("teaching_style", "待分析"),
        personality_traits=analysis.get("personality_traits", ["待分析"]),
        typical_questions=analysis.get("typical_questions", [
            "请介绍一下你之前的研究经历",
            "你为什么对我们这个方向感兴趣？",
        ]),
        style_prompt=analysis.get("style_prompt",
            f"你是{name}教授（{affiliation}）的数字分身面试官。"),
        source_urls=source_urls,
    )
    store_extracted_persona(persona)

    result = persona.model_dump()
    result["_stats"] = {
        "papers_found": len(current_papers),
        "web_results": len(current_web_info),
        "pages_fetched": len(current_page_contents),
    }
    return result

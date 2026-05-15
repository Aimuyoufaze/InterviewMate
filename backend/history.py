"""
面试历史持久化 — SQLite 存储已完成面试
"""
import json
import sqlite3
import uuid
from pathlib import Path
from datetime import datetime

DB_PATH = Path(__file__).parent / "personas.db"  # 复用同一个数据库文件


def _get_conn():
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn


def _init_table():
    conn = _get_conn()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS interview_history (
            id              TEXT PRIMARY KEY,
            persona_id      TEXT NOT NULL,
            persona_name    TEXT DEFAULT '',
            field           TEXT DEFAULT '',
            language        TEXT DEFAULT 'zh',
            messages        TEXT DEFAULT '[]',
            feedback        TEXT DEFAULT '',
            total_rounds    INTEGER DEFAULT 0,
            started_at      TEXT,
            ended_at        TEXT DEFAULT ''
        )
    """)
    conn.commit()
    conn.close()


_init_table()


def save_session(session) -> str:
    """将已完成的面试保存到 SQLite"""
    conn = _get_conn()
    session_id = getattr(session, 'session_id', str(uuid.uuid4()))
    persona_id = getattr(session, 'persona_id', '')
    persona_name = getattr(session, 'persona_name', '')
    field = getattr(session, 'field', '')
    language = getattr(session, 'language', 'zh')
    messages = json.dumps(getattr(session, 'messages', []), ensure_ascii=False)
    feedback = getattr(session, 'feedback', '')
    total_rounds = getattr(session, 'round', 0)
    started_at = getattr(session, 'started_at', '')
    ended_at = datetime.now().isoformat()

    conn.execute("""
        INSERT OR REPLACE INTO interview_history
            (id, persona_id, persona_name, field, language,
             messages, feedback, total_rounds, started_at, ended_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        session_id, persona_id, persona_name, field, language,
        messages, feedback, total_rounds, started_at, ended_at
    ))
    conn.commit()
    conn.close()
    return session_id


def list_sessions() -> list[dict]:
    """返回所有已完成面试的摘要列表"""
    conn = _get_conn()
    rows = conn.execute(
        "SELECT * FROM interview_history ORDER BY ended_at DESC"
    ).fetchall()
    conn.close()

    result = []
    for row in rows:
        feedback = row["feedback"] or ""
        result.append({
            "id": row["id"],
            "persona_id": row["persona_id"],
            "persona_name": row["persona_name"],
            "field": row["field"],
            "language": row["language"],
            "total_rounds": row["total_rounds"],
            "started_at": row["started_at"],
            "ended_at": row["ended_at"],
            "feedback_preview": feedback[:200] + ("..." if len(feedback) > 200 else ""),
        })
    return result


def get_session(session_id: str) -> dict | None:
    """返回某个已完成面试的完整记录"""
    conn = _get_conn()
    row = conn.execute(
        "SELECT * FROM interview_history WHERE id=?", (session_id,)
    ).fetchone()
    conn.close()

    if not row:
        return None

    return {
        "id": row["id"],
        "persona_id": row["persona_id"],
        "persona_name": row["persona_name"],
        "field": row["field"],
        "language": row["language"],
        "messages": json.loads(row["messages"]),
        "feedback": row["feedback"],
        "total_rounds": row["total_rounds"],
        "started_at": row["started_at"],
        "ended_at": row["ended_at"],
    }


def delete_session(session_id: str) -> bool:
    """删除一条历史记录"""
    conn = _get_conn()
    cur = conn.execute("DELETE FROM interview_history WHERE id=?", (session_id,))
    conn.commit()
    conn.close()
    return cur.rowcount > 0

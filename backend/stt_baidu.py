"""
百度语音识别 (短语音) — STT Provider

使用方式：
1. 在 https://console.bce.baidu.com/ai/#/ai/speech/overview/index 创建应用
2. 获取 App ID, API Key, Secret Key
3. 在 .env 中配置：

   STT_PROVIDER=baidu
   BAIDU_STT_APP_ID=...
   BAIDU_STT_API_KEY=...
   BAIDU_STT_SECRET_KEY=...

免费额度：每天 50000 次（标准模型 1537）
"""
import os
import json
import time
import base64
import asyncio

import httpx

# ── 配置 ──────────────────────────────────────

APP_ID = os.getenv("BAIDU_STT_APP_ID", "")
API_KEY = os.getenv("BAIDU_STT_API_KEY", "")
SECRET_KEY = os.getenv("BAIDU_STT_SECRET_KEY", "")

# 默认使用普通话模型（有标点）
DEV_PID = os.getenv("BAIDU_STT_DEV_PID", "1537")

# Token 缓存
_token_cache = {"token": None, "expires_at": 0}


async def _get_access_token() -> str:
    """获取百度 OAuth access token（带缓存）"""
    now = time.time()
    if _token_cache["token"] and _token_cache["expires_at"] > now + 60:
        return _token_cache["token"]

    url = "https://aip.baidubce.com/oauth/2.0/token"
    params = {
        "grant_type": "client_credentials",
        "client_id": API_KEY,
        "client_secret": SECRET_KEY,
    }

    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(url, params=params)
        data = resp.json()

        if "access_token" not in data:
            raise RuntimeError(
                f"获取百度 token 失败: {data.get('error_description', data)}"
            )

        token = data["access_token"]
        expires_in = data.get("expires_in", 2592000)  # 默认 30 天
        _token_cache["token"] = token
        _token_cache["expires_at"] = now + expires_in
        return token


async def transcribe(audio_bytes: bytes, language: str = "zh") -> str:
    """
    百度短语音识别。
    自动将任意格式的音频（webm/wav/mp3）转为 16kHz PCM 后发送。
    
    Args:
        audio_bytes: 音频数据（任意格式）
        language: 忽略，由 dev_pid 控制
    
    Returns:
        识别文字
    """
    if not API_KEY or not SECRET_KEY:
        raise RuntimeError(
            "百度语音识别未配置。请在 .env 中设置 BAIDU_STT_API_KEY 和 BAIDU_STT_SECRET_KEY"
        )

    # ── 用 ffmpeg 将任意音频转为 16kHz 16bit 单声道 PCM ──
    pcm_data = await _convert_to_pcm(audio_bytes)

    token = await _get_access_token()
    cuid = f"interviewmate-{APP_ID or 'default'}"

    # 转成 base64
    audio_b64 = base64.b64encode(pcm_data).decode("utf-8")
    audio_len = len(pcm_data)

    payload = {
        "format": "pcm",
        "rate": 16000,
        "dev_pid": int(DEV_PID),
        "channel": 1,
        "token": token,
        "cuid": cuid,
        "len": audio_len,
        "speech": audio_b64,
    }

    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            "http://vop.baidu.com/server_api",
            json=payload,
        )
        result = resp.json()

        err_no = result.get("err_no", -1)
        if err_no != 0:
            err_msg = result.get("err_msg", "未知错误")
            raise RuntimeError(f"百度语音识别失败 (err_no={err_no}): {err_msg}")

        candidates = result.get("result", [])
        if candidates:
            return candidates[0]
        return ""


async def _convert_to_pcm(audio_bytes: bytes) -> bytes:
    """用 ffmpeg 将任意音频转为 16kHz, 16bit, 单声道 PCM"""
    import tempfile
    import subprocess as sp

    # 写入临时文件（保留原始扩展名以便 ffmpeg 识别格式）
    suffix = ".webm"
    if audio_bytes[:4] == b"RIFF":
        suffix = ".wav"
    elif audio_bytes[:4] == b"\x1aE\xdf\xa3":
        suffix = ".webm"
    elif audio_bytes[:3] == b"ID3":
        suffix = ".mp3"

    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as f_in:
        f_in.write(audio_bytes)
        in_path = f_in.name

    out_path = in_path + ".pcm"

    try:
        proc = await asyncio.get_event_loop().run_in_executor(
            None,
            lambda: sp.run(
                [
                    "ffmpeg", "-y",
                    "-i", in_path,
                    "-f", "s16le",        # 输出格式: signed 16-bit little-endian
                    "-acodec", "pcm_s16le",
                    "-ac", "1",           # 单声道
                    "-ar", "16000",       # 16kHz
                    "-vn",                 # 无视频
                    out_path,
                ],
                capture_output=True,
                timeout=30,
            )
        )

        if proc.returncode != 0:
            error_msg = proc.stderr.decode("utf-8", errors="replace")[:200]
            raise RuntimeError(f"ffmpeg 转换失败: {error_msg}")

        with open(out_path, "rb") as f:
            pcm_data = f.read()

        return pcm_data

    finally:
        for p in [in_path, out_path]:
            try:
                os.unlink(p)
            except OSError:
                pass


def check_config() -> tuple[bool, str]:
    """检查配置是否完整"""
    if not API_KEY:
        return False, "BAIDU_STT_API_KEY 未配置"
    if not SECRET_KEY:
        return False, "BAIDU_STT_SECRET_KEY 未配置"
    return True, "ok"

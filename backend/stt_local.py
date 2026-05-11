"""
本地 Whisper 语音转文字
用 faster-whisper 在本地跑，零配置，完全离线。
首次使用会自动下载模型，后续秒开。
"""
import os
import tempfile
from pathlib import Path

# ── 配置 ──────────────────────────────────────
# 模型选择：tiny / base / small / medium / large-v3
# M 芯片 Mac 建议用 small（效果好，速度也快）
# 首次使用会自动下载模型到 ~/.cache/huggingface/
MODEL_SIZE = os.getenv("WHISPER_MODEL", "base")

# 设备：auto 会自动选 MPS（M芯片）或 CPU
DEVICE = os.getenv("WHISPER_DEVICE", "auto")
COMPUTE_TYPE = os.getenv("WHISPER_COMPUTE", "default")

_model = None  # 懒加载


def get_model():
    global _model
    if _model is not None:
        return _model
    from faster_whisper import WhisperModel

    # 设备检测
    device = DEVICE
    compute_type = COMPUTE_TYPE
    if device == "auto":
        try:
            import onnxruntime as ort
            providers = ort.get_available_providers()
            if "CoreMLExecutionProvider" in providers:
                print(f"[STT] CoreML 加速可用")
        except ImportError:
            pass
        # faster-whisper 用 CTranslate2 管理设备，ONNX 只是底层
        # M 芯片上用 int8 量化 CPU 模式最快最稳
        device = "cpu"
        compute_type = "int8"

    print(f"[STT] 加载 Whisper 模型: {MODEL_SIZE} (device={device}, compute={compute_type})")
    _model = WhisperModel(MODEL_SIZE, device=device, compute_type=compute_type)
    print(f"[STT] Whisper 加载完成 ✅")
    return _model


async def transcribe(audio_bytes: bytes, language: str = "zh") -> str:
    """
    转写音频字节为文字。
    
    Args:
        audio_bytes: 原始音频数据（webm / wav / mp3 等）
        language: 语言代码（默认 zh）
    
    Returns:
        转写后的文字
    """
    import asyncio

    model = get_model()

    # faster-whisper 需要文件路径，把字节写入临时文件
    suffix = ".webm"
    
    loop = asyncio.get_event_loop()

    def _run():
        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as f:
            f.write(audio_bytes)
            tmp_path = f.name

        try:
            segments, info = model.transcribe(
                tmp_path,
                language=language,
                beam_size=5,
                vad_filter=True,        # 过滤静音部分
                vad_parameters=dict(
                    threshold=0.5,
                    min_speech_duration_ms=200,
                    min_silence_duration_ms=500,
                ),
            )
            # 收集所有片段
            result_parts = []
            for seg in segments:
                result_parts.append(seg.text.strip())
            
            text = " ".join(result_parts)
            return text if text else ""
        finally:
            # 清理临时文件
            try:
                os.unlink(tmp_path)
            except OSError:
                pass

    text = await loop.run_in_executor(None, _run)
    return text


def is_model_available() -> bool:
    """检查模型是否可用（快速检查，不加载模型）"""
    try:
        # 通过检查 huggingface cache 来判断模型是否已下载
        from huggingface_hub import scan_cache_dir
        cache = scan_cache_dir()
        model_id = f"Systran/faster-whisper-{MODEL_SIZE}"
        for repo in cache.repos:
            if model_id in str(repo.repo_id):
                return True
        return False
    except Exception:
        return False

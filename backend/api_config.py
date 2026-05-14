"""
Per-request API key and base URL configuration using contextvars.
Allows the frontend to override DeepSeek credentials via HTTP headers,
falling back to .env values when no override is provided.
"""
import os
from contextvars import ContextVar

_request_api_key: ContextVar[str] = ContextVar("deepseek_api_key", default="")
_request_base_url: ContextVar[str] = ContextVar("deepseek_base_url", default="")


def set_api_key(key: str) -> None:
    """Set the API key for the current request context."""
    _request_api_key.set(key)


def set_base_url(url: str) -> None:
    """Set the base URL for the current request context."""
    _request_base_url.set(url)


def get_api_key() -> str:
    """Return the effective API key: request override first, then .env, then empty."""
    key = _request_api_key.get()
    if key:
        return key
    return os.getenv("DEEPSEEK_API_KEY", "")


def get_base_url() -> str:
    """Return the effective base URL: request override first, then .env, then default."""
    url = _request_base_url.get()
    if url:
        return url
    return os.getenv("DEEPSEEK_BASE_URL", "https://api.deepseek.com")

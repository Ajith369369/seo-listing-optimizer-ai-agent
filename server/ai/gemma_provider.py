"""Gemma (e.g. 3 4B) via Ollama or any /api/generate-compatible endpoint."""
import asyncio
from typing import Any

import httpx


class GemmaProvider:
    def __init__(self, base_url: str, model: str = "gemma2:4b", timeout: int = 30):
        self._base = base_url.rstrip("/")
        self._model = model
        self._timeout = timeout

    @property
    def name(self) -> str:
        return "gemma"

    async def generate(self, prompt: str) -> str:
        url = f"{self._base}/api/generate"
        payload = {"model": self._model, "prompt": prompt, "stream": False}
        async with httpx.AsyncClient(timeout=self._timeout) as client:
            resp = await client.post(url, json=payload)
            resp.raise_for_status()
        data = resp.json()
        return (data.get("response") or "").strip()
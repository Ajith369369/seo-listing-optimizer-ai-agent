"""Google Gemini (gemini-2.0-flash) via google-generativeai."""
import asyncio
from typing import Any

import google.generativeai as genai


class GeminiProvider:
    def __init__(self, api_key: str, model: str = "gemini-2.0-flash", timeout: int = 10):
        if not api_key:
            raise ValueError("GEMINI_API_KEY is required for GeminiProvider")
        genai.configure(api_key=api_key)
        self._model = genai.GenerativeModel(model)
        self._timeout = timeout

    @property
    def name(self) -> str:
        return "gemini"

    async def generate(self, prompt: str) -> str:
        def _run() -> str:
            r = self._model.generate_content(prompt)
            return (r.text or "").strip()

        return await asyncio.wait_for(
            asyncio.to_thread(_run),
            timeout=self._timeout,
        )
"""LLM Gateway: routing and fallback across providers. Fallback on 429, 5xx, timeout."""
import logging
from typing import List

from ai.base import GenerateResult, LLMProvider

log = logging.getLogger(__name__)


def _is_fallbackable(err: BaseException) -> bool:
    s = str(err).lower()
    if "429" in s or "rate limit" in s or "quota" in s:
        return True
    if "timeout" in s or "timed out" in s:
        return True
    if "500" in s or "502" in s or "503" in s:
        return True
    if "connection" in s or "refused" in s or "unreachable" in s:
        return True
    return False


class LLMGateway:
    def __init__(self, providers: List[LLMProvider]):
        self._providers = providers

    async def generate(self, prompt: str) -> GenerateResult:
        last: BaseException | None = None
        for p in self._providers:
            try:
                text = await p.generate(prompt)
                log.info("llm_gateway provider_used=%s", p.name)
                return GenerateResult(text=text, provider=p.name)
            except Exception as e:
                last = e
                if _is_fallbackable(e):
                    log.warning("llm_gateway fallback provider=%s err=%s", p.name, e)
                    continue
                raise
        if last is not None:
            raise last
        raise RuntimeError("No LLM providers configured")
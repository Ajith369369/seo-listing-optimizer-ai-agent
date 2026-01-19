"""Base types for the LLM provider abstraction."""
from dataclasses import dataclass
from typing import Protocol


@dataclass(frozen=True)
class GenerateResult:
    text: str
    provider: str


class LLMProvider(Protocol):
    @property
    def name(self) -> str: ...

    async def generate(self, prompt: str) -> str: ...
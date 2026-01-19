"""
FastAPI backend for SEO Listing Optimizer AI Agent
Multi-provider LLM (Gemini, Gemma) with routing and fallback on 429/5xx/timeout.
"""
import asyncio
import json
import os
from typing import List

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from pydantic_settings import BaseSettings
from slowapi.util import get_remote_address

from ai import LLMGateway, GeminiProvider, GemmaProvider
from utils.rate_limiter import RateLimiter

# Settings
class Settings(BaseSettings):
    # requests_per_minute: int = 15
    # requests_per_day: int = 500
    requests_per_minute: int = 100
    requests_per_day: int = 3000
    # --- LLM: one key/URL per provider ---
    gemini_api_key: str = ""       # GEMINI_API_KEY (legacy: API_KEY still works if gemini_api_key empty)
    gemma_base_url: str = ""       # GEMMA_BASE_URL e.g. http://localhost:11434 (Ollama)
    gemma_model: str = "gemma2:4b" # GEMMA_MODEL for Gemma 3 4B use gemma3:4b when available
    ai_provider_order: str = "gemini,gemma"  # AI_PROVIDER_ORDER; omit a name to disable
    request_timeout: int = 40  # seconds
    port: int = 8500  # Server port (8000 often in use; override via PORT in .env)
    
    class Config:
        env_file = ".env"
        case_sensitive = False

settings = Settings()

# Rate Limiter
rate_limiter = RateLimiter(
    requests_per_minute=settings.requests_per_minute,
    requests_per_day=settings.requests_per_day
)


def _build_llm_gateway() -> LLMGateway:
    """Build LLM gateway from settings. GEMINI_API_KEY or API_KEY; GEMMA_BASE_URL optional."""
    gemini_key = settings.gemini_api_key or os.environ.get("API_KEY", "")
    order = [s.strip().lower() for s in settings.ai_provider_order.split(",") if s.strip()]
    providers: List = []
    if "gemini" in order and gemini_key:
        providers.append(
            GeminiProvider(api_key=gemini_key, timeout=settings.request_timeout)
        )
    if "gemma" in order and settings.gemma_base_url:
        providers.append(
            GemmaProvider(
                base_url=settings.gemma_base_url,
                model=settings.gemma_model,
                timeout=min(settings.request_timeout * 2, 60),
            )
        )
    if not providers:
        raise RuntimeError(
            "At least one LLM provider required. Set GEMINI_API_KEY or API_KEY, or GEMMA_BASE_URL (e.g. http://localhost:11434)."
        )
    return LLMGateway(providers)


llm_gateway = _build_llm_gateway()

# FastAPI App
app = FastAPI(
    title="SEO Listing Optimizer API",
    description="AI agent for optimizing Amazon product titles with high-volume keywords",
    version="1.0.0"
)

# CORS Middleware - must run early to add headers to preflight (OPTIONS) and all responses
# allow_origins=["*"] works when allow_credentials=False; for prod use an explicit allowlist
# CORS: explicit OPTIONS + dev origins so preflight gets Access-Control-Allow-Origin. For prod, extend via env.
_cors_origins = ["http://localhost:5173", "http://127.0.0.1:5173"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS", "PUT", "PATCH", "DELETE", "HEAD"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Request Models
class SEOOptimizeRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=500, description="Original product title")

class KeywordSuggestion(BaseModel):
    keyword: str
    volume: str = "High"  # Placeholder for future volume data

class SEOOptimizeResponse(BaseModel):
    keywords: List[str] = Field(..., description="5 high-volume, long-tail keywords")
    optimizedTitle: str = Field(..., description="AI-optimized product title")
    reasoning: str = Field(..., description="Explanation of optimization strategy")
    metadata: dict | None = Field(default=None, description="e.g. { provider: 'gemini' | 'gemma' }")

# System Prompt for Gemini
SEO_SYSTEM_PROMPT = """You are an expert Amazon SEO Consultant for a high-end SaaS agency. 
Your goal is to transform basic product titles into high-converting, search-optimized assets.

Follow these strict constraints:
1. KEYWORD RESEARCH: Identify 5 high-volume, long-tail keywords based on the input title. 
   Prioritize "Customer Intent" (e.g., 'leak-proof' over just 'bottle').
2. STRUCTURE: Use the formula: [Brand] + [Main Keyword] + [Feature/Benefit] + [Material/Size].
3. MOBILE FIRST: Place the primary keyword within the first 80 characters.
4. COMPLIANCE: Do not use subjective claims like "Best," "Amazing," or "Number 1."
5. FORMAT: Return a valid JSON object with three fields: 
   - 'keywords' (an array of exactly 5 strings)
   - 'optimizedTitle' (a string)
   - 'reasoning' (a string explaining your optimization strategy)

Example output:
{
  "keywords": ["leak-proof water bottle", "stainless steel insulated", "BPA-free hydration", "24oz travel bottle", "double-wall vacuum"],
  "optimizedTitle": "HydroFlask 24oz Leak-Proof Stainless Steel Insulated Water Bottle - BPA-Free Double-Wall Vacuum Travel Hydration",
  "reasoning": "Placed primary keyword 'leak-proof' within first 80 chars. Included brand, size, material, and key benefits. Avoided banned words."
}"""

async def optimize_with_llm(title: str, retries: int = 3) -> SEOOptimizeResponse:
    """
    Uses LLM gateway (Gemini, Gemma) with fallback. Retries with backoff on 429/timeout.
    """
    prompt = f"{SEO_SYSTEM_PROMPT}\n\nInput Title: {title}\n\nProvide your optimization:"
    last_error: BaseException | None = None

    for attempt in range(retries):
        try:
            res = await llm_gateway.generate(prompt)
            raw = res.text
            if "```json" in raw:
                raw = raw.split("```json")[1].split("```")[0].strip()
            elif "```" in raw:
                raw = raw.split("```")[1].split("```")[0].strip()
            data = json.loads(raw)
            if not isinstance(data.get("keywords"), list) or len(data.get("keywords", [])) != 5:
                raise ValueError("AI did not return exactly 5 keywords")
            if not isinstance(data.get("optimizedTitle"), str):
                raise ValueError("AI did not return a valid optimized title")
            return SEOOptimizeResponse(
                keywords=data["keywords"],
                optimizedTitle=data["optimizedTitle"],
                reasoning=data.get("reasoning", "Optimized for Amazon search visibility and mobile display."),
                metadata={"provider": res.provider},
            )
        except TimeoutError as e:
            last_error = e
            if attempt < retries - 1:
                await asyncio.sleep(2 ** attempt)
            else:
                raise HTTPException(status_code=504, detail=str(e))
        except Exception as e:
            last_error = e
            err = str(e).lower()
            if "429" in err or "rate limit" in err or "quota" in err:
                if attempt < retries - 1:
                    await asyncio.sleep(2 ** (attempt + 1))
                else:
                    raise HTTPException(status_code=429, detail="The Agent is busy. Please wait a minute or two.")
            else:
                if attempt < retries - 1:
                    await asyncio.sleep(2 ** attempt)
                else:
                    raise HTTPException(status_code=500, detail=f"AI service error: {str(e)}")
    raise HTTPException(status_code=500, detail=f"AI error after {retries} attempts: {last_error}")


@app.get("/")
async def root():
    return {"message": "SEO Listing Optimizer API", "status": "operational"}

@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "rate_limit": {
            "requests_per_minute": settings.requests_per_minute,
            "requests_per_day": settings.requests_per_day
        }
    }

@app.post("/api/optimize", response_model=SEOOptimizeResponse)
async def optimize_seo(request: SEOOptimizeRequest, http_request: Request):
    """
    Optimizes a product title with AI-suggested keywords.
    Includes rate limiting and timeout protection.
    """
    # Check rate limit
    client_id = get_remote_address(http_request)
    
    if not rate_limiter.check_rate_limit(client_id):
        raise HTTPException(
            status_code=429,
            detail="Too many requests. Please wait a minute and try again."
        )

    try:
        result = await optimize_with_llm(request.title)
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Optimization failed: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=settings.port)

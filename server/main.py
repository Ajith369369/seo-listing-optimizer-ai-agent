"""
FastAPI backend for SEO Listing Optimizer AI Agent
Implements rate limiting, timeout handling, and Gemini 2.5 Flash integration
"""
import asyncio
import json
from typing import List

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from pydantic_settings import BaseSettings
from slowapi.util import get_remote_address
import google.generativeai as genai

from utils.rate_limiter import RateLimiter

# Settings
class Settings(BaseSettings):
    requests_per_minute: int = 15
    requests_per_day: int = 500
    api_key: str = ""  # Gemini API key from .env (API_KEY=...)
    request_timeout: int = 10  # seconds
    
    class Config:
        env_file = ".env"
        case_sensitive = False

settings = Settings()

# Initialize Gemini
if settings.api_key:
    genai.configure(api_key=settings.api_key)

# Rate Limiter
rate_limiter = RateLimiter(
    requests_per_minute=settings.requests_per_minute,
    requests_per_day=settings.requests_per_day
)

# FastAPI App
app = FastAPI(
    title="SEO Listing Optimizer API",
    description="AI agent for optimizing Amazon product titles with high-volume keywords",
    version="1.0.0"
)

# CORS Middleware - must run early to add headers to preflight (OPTIONS) and all responses
# allow_origins=["*"] works when allow_credentials=False; for prod use an explicit allowlist
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Permissive for dev; restrict to specific origins in production
    allow_credentials=False,
    allow_methods=["*"],
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

async def _call_gemini_with_timeout(model, prompt: str) -> str:
    """
    Internal function to call Gemini API with timeout protection.
    Returns the response text or raises an exception.
    """
    # Create timeout task
    timeout_task = asyncio.create_task(asyncio.sleep(settings.request_timeout))
    api_task = asyncio.create_task(
        asyncio.to_thread(model.generate_content, prompt)
    )
    
    # Wait for either completion or timeout
    done, pending = await asyncio.wait(
        [api_task, timeout_task],
        return_when=asyncio.FIRST_COMPLETED
    )
    
    # Check if timeout occurred before API response
    if timeout_task in done and api_task not in done:
        # Cancel the API task
        api_task.cancel()
        try:
            await api_task
        except asyncio.CancelledError:
            pass
        raise TimeoutError(f"Request exceeded {settings.request_timeout} second timeout")
    
    # Cancel timeout task if API completed first
    if timeout_task in pending:
        timeout_task.cancel()
        try:
            await timeout_task
        except asyncio.CancelledError:
            pass
    
    # Get API response
    response = await api_task
    return response.text.strip()


async def optimize_with_gemini(title: str, retries: int = 3) -> SEOOptimizeResponse:
    """
    Calls Gemini 2.5 Flash to optimize the product title.
    Implements Self-Healing AI with retry logic and exponential backoff.
    Handles 429 rate limit errors gracefully.
    """
    # gemini-1.5-flash is retired (404); use gemini-2.0-flash (fallback: gemini-2.0-flash-001)
    model = genai.GenerativeModel("gemini-2.0-flash")
    
    prompt = f"{SEO_SYSTEM_PROMPT}\n\nInput Title: {title}\n\nProvide your optimization:"
    
    last_error = None
    
    for attempt in range(retries):
        try:
            # Call Gemini with timeout protection
            response_text = await _call_gemini_with_timeout(model, prompt)
            
            # Try to extract JSON from markdown code blocks if present
            if "```json" in response_text:
                response_text = response_text.split("```json")[1].split("```")[0].strip()
            elif "```" in response_text:
                response_text = response_text.split("```")[1].split("```")[0].strip()
            
            # Parse JSON
            try:
                data = json.loads(response_text)
            except json.JSONDecodeError:
                raise ValueError("Failed to parse JSON response from AI")
            
            # Validate and return
            if not isinstance(data.get("keywords"), list) or len(data.get("keywords", [])) != 5:
                raise ValueError("AI did not return exactly 5 keywords")
            
            if not isinstance(data.get("optimizedTitle"), str):
                raise ValueError("AI did not return a valid optimized title")
            
            return SEOOptimizeResponse(
                keywords=data["keywords"],
                optimizedTitle=data["optimizedTitle"],
                reasoning=data.get("reasoning", "Optimized for Amazon search visibility and mobile display.")
            )
            
        except TimeoutError as e:
            last_error = e
            if attempt < retries - 1:
                wait_time = 2 ** attempt  # Exponential backoff: 1s, 2s, 4s
                print(f"AI request timed out. Retrying in {wait_time}s... ({retries - attempt - 1} retries left)")
                await asyncio.sleep(wait_time)
            else:
                raise HTTPException(status_code=504, detail=str(e))
                
        except Exception as e:
            last_error = e
            error_str = str(e).lower()
            
            # Check for rate limit errors (429)
            if "429" in error_str or "rate limit" in error_str or "quota" in error_str:
                if attempt < retries - 1:
                    # For rate limits, wait longer (exponential backoff)
                    wait_time = 2 ** (attempt + 1)  # 2s, 4s, 8s
                    print(f"Rate limit hit. Retrying in {wait_time}s... ({retries - attempt - 1} retries left)")
                    await asyncio.sleep(wait_time)
                else:
                    raise HTTPException(
                        status_code=429,
                        detail="The Agent is busy analyzing other listings. Please wait 60 seconds."
                    )
            else:
                # For other errors, retry with exponential backoff
                if attempt < retries - 1:
                    wait_time = 2 ** attempt  # 1s, 2s, 4s
                    print(f"AI request failed: {str(e)}. Retrying in {wait_time}s... ({retries - attempt - 1} retries left)")
                    await asyncio.sleep(wait_time)
                else:
                    raise HTTPException(status_code=500, detail=f"AI service error: {str(e)}")
    
    # If we get here, all retries failed
    raise HTTPException(
        status_code=500,
        detail=f"AI service error after {retries} attempts: {str(last_error)}"
    )

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
            detail="The Agent is busy analyzing other listings. Please wait 60 seconds."
        )
    
    # Optimize with Gemini
    try:
        result = await optimize_with_gemini(request.title)
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Optimization failed: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

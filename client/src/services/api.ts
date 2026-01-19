/**
 * API service for SEO optimization
 * Handles requests to the FastAPI backend with timeout and error handling
 */
import axios, { AxiosError } from 'axios';

// Empty = use Vite proxy in dev (/api -> :8000), no CORS. Set VITE_API_URL for production.
const API_BASE_URL = import.meta.env.VITE_API_URL || '';

// Dev: use backend :8000 directly (or VITE_API_URL). Prod: use VITE_API_URL or '' (same-origin).
// const API_BASE_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:8000' : '');

const REQUEST_TIMEOUT = 30000; // 30 seconds

export interface SEOOptimizeRequest {
  title: string;
}

export interface SEOOptimizeResponse {
  keywords: string[];
  optimizedTitle: string;
  reasoning: string;
}

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: REQUEST_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Optimizes a product title using the AI agent
 * @param title - Original product title
 * @returns Optimized title with keywords and reasoning
 * @throws Error with type information for proper error handling
 */
export async function optimizeTitle(
  title: string
): Promise<SEOOptimizeResponse> {
  try {
    const response = await apiClient.post<SEOOptimizeResponse>(
      '/api/optimize',
      { title } as SEOOptimizeRequest
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<{ detail: string }>;
      
      // Handle timeout
      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        throw new Error('TIMEOUT');
      }
      
      // Handle rate limit
      if (axiosError.response?.status === 429) {
        throw new Error('RATE_LIMIT');
      }
      // 502 = proxy could not reach backend (server not running)
      if (axiosError.response?.status === 502) {
        throw new Error('BACKEND_UNREACHABLE');
      }
      // Handle other API errors
      if (axiosError.response?.status) {
        throw new Error(`API_ERROR: ${axiosError.response.data?.detail || axiosError.message}`);
      }
      // No response (connection refused, backend down)
      if (error.request) {
        throw new Error('NETWORK_ERROR');
      }
    }
    
    throw new Error(`UNKNOWN_ERROR: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

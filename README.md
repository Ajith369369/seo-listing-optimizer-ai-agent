# SEO Listing Optimizer AI Agent

An AI-powered tool for optimizing Amazon product titles with high-volume, strategic keywords. Built with React, Vite, Tailwind CSS, and FastAPI.

## Features

- **AI-Powered Optimization**: Uses Gemini 2.5 Flash to suggest 5 high-volume keywords and rewrite product titles
- **Rate Limiting**: Protects API quota (15 RPM, 500 RPD) with intelligent rate limiting
- **Timeout Protection**: 10-second timeout ensures responsive UI
- **HITL Interface**: Human-in-the-loop approval flow with side-by-side comparison
- **Keyword Chips**: Interactive keyword management with add/remove functionality
- **Error Handling**: Comprehensive error handling with retry and manual entry fallback
- **Mobile Optimization**: Ensures primary keywords are within first 80 characters
- **Compliance**: Avoids banned words (Best, Cheap, 100%, etc.)

## Tech Stack

### Frontend
- React 18
- TypeScript
- Vite
- Tailwind CSS
- Axios

### Backend
- FastAPI
- Python 3.9+
- Google Gemini 2.5 Flash
- Pydantic for validation

## Setup

### Backend Setup

1. Navigate to the server directory:
```bash
cd server
```

2. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Create a `.env` file:
```bash
cp .env.example .env
```

5. Add your Gemini API key to `.env`:
```
GEMINI_API_KEY=your_actual_api_key_here
REQUESTS_PER_MINUTE=15
REQUESTS_PER_DAY=500
```

6. Run the server:
```bash
uvicorn main:app --reload
```

The API will be available at `http://localhost:8000`

### Frontend Setup

1. Navigate to the client directory:
```bash
cd client
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

The app will be available at `http://localhost:5173`

## Usage

1. Enter a product title in the input field
2. Click "Optimize" to trigger AI analysis
3. Review the AI-optimized title and suggested keywords
4. Edit the optimized title if needed
5. Click keywords to add/remove them from the title
6. Approve the final title when satisfied

## API Endpoints

### `POST /api/optimize`

Optimizes a product title with AI-suggested keywords.

**Request:**
```json
{
  "title": "Water Bottle"
}
```

**Response:**
```json
{
  "keywords": [
    "leak-proof water bottle",
    "stainless steel insulated",
    "BPA-free hydration",
    "24oz travel bottle",
    "double-wall vacuum"
  ],
  "optimizedTitle": "HydroFlask 24oz Leak-Proof Stainless Steel Insulated Water Bottle - BPA-Free Double-Wall Vacuum Travel Hydration",
  "reasoning": "Placed primary keyword 'leak-proof' within first 80 chars. Included brand, size, material, and key benefits. Avoided banned words."
}
```

### `GET /health`

Returns API health status and rate limit configuration.

## Rate Limiting

The API enforces:
- **15 requests per minute** per client
- **500 requests per day** per client

If the limit is exceeded, a `429` status code is returned with the message: "The Agent is busy analyzing other listings. Please wait 60 seconds."

## Error Handling

The application handles:
- **Timeout errors**: 10-second timeout for AI requests
- **Rate limit errors**: Automatic retry with user notification
- **Network errors**: Connection failure detection
- **API errors**: Graceful error messages

## Architecture

### State Management

Uses **Discriminated Union** pattern for type-safe state management:

- `idle`: Initial state
- `loading`: AI processing
- `review_required`: Awaiting user approval
- `error`: Error state with retry option
- `approved`: User approved optimization
- `manual_entry`: Manual entry fallback

### Components

- `SEOOptimizer`: Main component with state management
- `KeywordChip`: Interactive keyword display
- `LoadingSpinner`: Loading state indicator
- `TitleSkeleton`: Skeleton loader for titles

## Development

### Backend Development

```bash
cd server
uvicorn main:app --reload --port 8000
```

### Frontend Development

```bash
cd client
npm run dev
```

### Building for Production

**Frontend:**
```bash
cd client
npm run build
```

**Backend:**
The FastAPI server can be deployed using any ASGI server (uvicorn, gunicorn, etc.)

## License

Proprietary - Equal Collective

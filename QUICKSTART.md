# Quick Start Guide

## Prerequisites

- Python 3.9+ (for backend)
- Node.js 18+ (for frontend)
- Gemini API Key (get one from [Google AI Studio](https://makersuite.google.com/app/apikey))

## Setup Steps

### 1. Backend Setup (5 minutes)

```bash
# Navigate to server directory
cd server

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On Mac/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
# Copy the example and add your API key
echo "REQUESTS_PER_MINUTE=15" > .env
echo "REQUESTS_PER_DAY=500" >> .env
echo "GEMINI_API_KEY=your_api_key_here" >> .env

# Start the server
uvicorn main:app --reload
```

Backend will run on `http://localhost:8000`

### 2. Frontend Setup (3 minutes)

```bash
# Open a new terminal, navigate to client directory
cd client

# Install dependencies
npm install

# Start development server
npm run dev
```

Frontend will run on `http://localhost:5173`

## Testing

1. Open `http://localhost:5173` in your browser
2. Enter a product title (e.g., "Water Bottle")
3. Click "Optimize"
4. Wait for AI analysis (should take 2-5 seconds)
5. Review the optimized title and keywords
6. Edit if needed and approve

## Troubleshooting

### Backend Issues

**Error: Module not found**
- Make sure virtual environment is activated
- Run `pip install -r requirements.txt` again

**Error: GEMINI_API_KEY not found**
- Check that `.env` file exists in `server/` directory
- Verify the API key is correct

**Error: Rate limit exceeded**
- Wait 60 seconds between requests
- Check `.env` for `REQUESTS_PER_MINUTE` setting

### Frontend Issues

**Error: Cannot connect to API**
- Verify backend is running on port 8000
- Check `vite.config.ts` proxy settings

**Error: Build fails**
- Run `npm install` again
- Check Node.js version (should be 18+)

## API Testing

Test the API directly:

```bash
curl -X POST "http://localhost:8000/api/optimize" \
  -H "Content-Type: application/json" \
  -d '{"title": "Water Bottle"}'
```

Expected response:
```json
{
  "keywords": [...],
  "optimizedTitle": "...",
  "reasoning": "..."
}
```

## Next Steps

- Customize the AI prompt in `server/main.py` (SEO_SYSTEM_PROMPT)
- Adjust rate limits in `.env`
- Modify UI styling in `client/src/index.css`
- Add more features to the frontend

This contains everything you need to run the app locally.

## Run Locally

**Prerequisites:** Node.js

1. Install dependencies:
   `npm install`
2. Run the app:
   `npm run dev`
3. Open `http://localhost:3000`

## API Keys

### Gemini key (required)

1. Open the app.
2. Go to `Settings`.
3. Paste your Gemini API key and click `Save Key`.

### Finnhub key (recommended for live numeric data)

1. Create/get a key at `https://finnhub.io/dashboard`.
2. In the app, go to `Settings`.
3. Paste your Finnhub API key and click `Save Key`.

## Data + Security Notes

- API keys are stored in browser local storage on your machine.
- The app uses Finnhub directly from the browser for snapshot data (quote/profile/financials/news/earnings).

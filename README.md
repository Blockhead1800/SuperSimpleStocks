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
- For production apps, prefer a backend proxy so secrets are never exposed to end users.

## Finnhub Behavior

- If Finnhub is healthy, UI shows `Live data: Finnhub`.
- If Finnhub is partial, analysis still runs and missing fields are marked unavailable.
- If Finnhub is unavailable, analysis still runs with reduced context and UI shows `Using reduced context`.

## Troubleshooting

- `401` from Finnhub: key is invalid, expired, or missing.
- `429` from Finnhub: rate limit reached; retry after a short wait.
- Partial data for a symbol: one or more Finnhub endpoints returned empty/missing fields; the pipeline continues with explicit uncertainty.

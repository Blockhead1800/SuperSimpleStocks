# Super Simple Stocks

Super Simple Stocks is a beginner-friendly stock analysis app that uses a multi-agent AI pipeline plus live market data.

It is built for **US stocks and ETFs** (not crypto) and is designed to produce plain-language recommendations with transparent source links.

## What It Does

- Analyzes a single ticker or scans for multiple opportunities.
- Prioritizes your portfolio holdings during market scans.
- Uses a 4 step AI workflow to gather, compare, audit, and synthesize findings.
- Pulls live numeric context from Finnhub (price, profile, basic financials, recent news, earnings).
- Shows one stock at a time in a swipe style results feed (TikTok style up/down navigation).
- Outputs beginner and advanced views:
  - Beginner summary + one clear action
  - Advanced thesis, indicators, fundamentals, correlations, and source links

## Analysis Pipeline

1. `Gatherer` collects current context and recent catalysts.
2. `Historian` compares current setup to past patterns.
3. `Auditor` checks consistency, removes weak claims, validates sources.
4. `Synthesizer` returns structured JSON for UI rendering.

Finnhub data is injected into prompts as a primary numeric source.  
If Finnhub data is missing, the system marks fields as unavailable and lowers certainty instead of inventing numbers.

## Core Behaviors

- Non-portfolio ideas are constrained to buy-side opportunities.
- Portfolio symbols are always prioritized in scan outputs.
- URLs shown in sources are filtered for valid `http/https` links.
- Duplicate analyzed symbols are de-duped in final results.

## Run Locally

**Prerequisites:** Node.js

1. Install dependencies  
   `npm install`
2. Start dev server  
   `npm run dev`
3. Open  
   `http://localhost:3000`

## API Keys

### Gemini key (required)

1. Open the app
2. Go to `Settings`
3. Paste your Gemini API key
4. Click `Save Key`

### Finnhub key (recommended)

1. Create/get a key at `https://finnhub.io/dashboard`
2. Go to `Settings`
3. Paste your Finnhub API key
4. Click `Save Key`

## Data and Security Notes

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

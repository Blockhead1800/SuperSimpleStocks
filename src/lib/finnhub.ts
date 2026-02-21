export const FINNHUB_API_KEY_STORAGE_KEY = "lumina_finnhub_api_key";

const FINNHUB_BASE_URL = "https://finnhub.io/api/v1";
const REQUEST_TIMEOUT_MS = 8000;
const MAX_RETRIES = 2;
const MAX_NEWS_ITEMS = 5;
const MAX_EARNINGS_ITEMS = 4;

export type FinnhubQuality = "ok" | "partial" | "unavailable";

interface FinnhubQuote {
  c?: number; // current
  d?: number; // change
  dp?: number; // percent change
  h?: number; // high
  l?: number; // low
  o?: number; // open
  pc?: number; // previous close
  t?: number; // timestamp
}

interface FinnhubProfile {
  name?: string;
  ticker?: string;
  exchange?: string;
  marketCapitalization?: number;
  finnhubIndustry?: string;
  ipo?: string;
}

interface FinnhubMetricResponse {
  metric?: {
    peBasicExclExtraTTM?: number;
    peTTM?: number;
    pbAnnual?: number;
    psTTM?: number;
    "52WeekHigh"?: number;
    "52WeekLow"?: number;
    beta?: number;
    dividendYieldIndicatedAnnual?: number;
  };
}

interface FinnhubNewsItem {
  headline?: string;
  summary?: string;
  source?: string;
  url?: string;
  datetime?: number;
}

interface FinnhubEarningsItem {
  period?: string;
  actual?: number | null;
  estimate?: number | null;
  surprisePercent?: number | null;
}

export interface FinnhubSnapshot {
  symbol: string;
  fetchedAt: string;
  quote: {
    currentPrice: number | null;
    change: number | null;
    changePercent: number | null;
    high: number | null;
    low: number | null;
    open: number | null;
    previousClose: number | null;
    timestamp: string | null;
  } | null;
  profile: {
    name: string;
    exchange: string;
    industry: string;
    marketCapBillion: number | null;
    ipoDate: string | null;
  } | null;
  basicFinancials: {
    peTtm: number | null;
    pb: number | null;
    psTtm: number | null;
    week52High: number | null;
    week52Low: number | null;
    beta: number | null;
    dividendYield: number | null;
  } | null;
  news: Array<{
    headline: string;
    summary: string;
    source: string;
    url: string;
    timestamp: string | null;
  }>;
  earnings: Array<{
    period: string;
    actualEps: number | null;
    estimateEps: number | null;
    surprisePercent: number | null;
  }>;
}

export interface FinnhubSnapshotResult {
  snapshot: FinnhubSnapshot | null;
  quality: FinnhubQuality;
  errors: Partial<Record<"quote" | "profile" | "financials" | "news" | "earnings", string>>;
  asPromptBlock: string;
}

export function getFinnhubApiKey(): string | undefined {
  if (typeof window === "undefined") return undefined;
  const savedKey = window.localStorage.getItem(FINNHUB_API_KEY_STORAGE_KEY)?.trim();
  const envKey = (import.meta as ImportMeta & { env?: { VITE_FINNHUB_API_KEY?: string } }).env?.VITE_FINNHUB_API_KEY?.trim();
  return savedKey || envKey || undefined;
}

export function setFinnhubApiKey(key: string): void {
  if (typeof window === "undefined") return;
  const trimmed = key.trim();
  if (trimmed) {
    window.localStorage.setItem(FINNHUB_API_KEY_STORAGE_KEY, trimmed);
  }
}

export function clearFinnhubApiKey(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(FINNHUB_API_KEY_STORAGE_KEY);
}

function boundedText(value: unknown, fallback: string, maxLength: number): string {
  if (typeof value !== "string") return fallback;
  const cleaned = value.replace(/\s+/g, " ").trim();
  if (!cleaned) return fallback;
  if (cleaned.length <= maxLength) return cleaned;
  return `${cleaned.slice(0, maxLength - 1).trimEnd()}...`;
}

function toNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function toIsoTimestamp(secondsUnix: unknown): string | null {
  if (typeof secondsUnix !== "number" || !Number.isFinite(secondsUnix) || secondsUnix <= 0) return null;
  try {
    return new Date(secondsUnix * 1000).toISOString();
  } catch {
    return null;
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function requestFinnhubJson<T>(endpoint: string, apiKey: string): Promise<T> {
  let attempt = 0;
  let lastError: Error | null = null;

  while (attempt <= MAX_RETRIES) {
    try {
      const joiner = endpoint.includes("?") ? "&" : "?";
      const url = `${FINNHUB_BASE_URL}${endpoint}${joiner}token=${encodeURIComponent(apiKey)}`;
      const response = await fetchWithTimeout(url, { method: "GET" }, REQUEST_TIMEOUT_MS);

      if (response.status === 429) {
        const retryAfter = Number(response.headers.get("Retry-After"));
        const waitMs = Number.isFinite(retryAfter) && retryAfter > 0
          ? retryAfter * 1000
          : 400 * Math.pow(2, attempt);
        await delay(waitMs);
        attempt += 1;
        continue;
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return await response.json() as T;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      lastError = new Error(`Finnhub ${endpoint} failed: ${message}`);
      if (attempt === MAX_RETRIES) break;
      await delay(300 * Math.pow(2, attempt));
      attempt += 1;
    }
  }

  throw lastError ?? new Error(`Finnhub ${endpoint} failed`);
}

function buildPromptBlock(
  symbol: string,
  snapshot: FinnhubSnapshot | null,
  quality: FinnhubQuality,
  errors: FinnhubSnapshotResult["errors"]
): string {
  const compact = {
    provider: "Finnhub",
    symbol,
    quality,
    fetchedAt: snapshot?.fetchedAt ?? new Date().toISOString(),
    quote: snapshot?.quote ?? null,
    profile: snapshot?.profile ?? null,
    basicFinancials: snapshot?.basicFinancials ?? null,
    recentNews: snapshot?.news ?? [],
    recentEarnings: snapshot?.earnings ?? [],
    errors,
  };
  return `Finnhub Data (primary numeric source):\n${JSON.stringify(compact)}`;
}

export async function getFinnhubSnapshot(symbol: string): Promise<FinnhubSnapshotResult> {
  const normalizedSymbol = symbol.trim().toUpperCase();
  const apiKey = getFinnhubApiKey();

  if (!apiKey) {
    const errors = { quote: "Missing Finnhub API key" };
    return {
      snapshot: null,
      quality: "unavailable",
      errors,
      asPromptBlock: buildPromptBlock(normalizedSymbol, null, "unavailable", errors),
    };
  }

  const errors: FinnhubSnapshotResult["errors"] = {};

  const [quoteResult, profileResult, metricsResult, newsResult, earningsResult] = await Promise.allSettled([
    requestFinnhubJson<FinnhubQuote>(`/quote?symbol=${encodeURIComponent(normalizedSymbol)}`, apiKey),
    requestFinnhubJson<FinnhubProfile>(`/stock/profile2?symbol=${encodeURIComponent(normalizedSymbol)}`, apiKey),
    requestFinnhubJson<FinnhubMetricResponse>(`/stock/metric?symbol=${encodeURIComponent(normalizedSymbol)}&metric=all`, apiKey),
    requestFinnhubJson<FinnhubNewsItem[]>(
      `/company-news?symbol=${encodeURIComponent(normalizedSymbol)}&from=${
        new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
      }&to=${new Date().toISOString().slice(0, 10)}`,
      apiKey
    ),
    requestFinnhubJson<FinnhubEarningsItem[]>(
      `/stock/earnings?symbol=${encodeURIComponent(normalizedSymbol)}&limit=${MAX_EARNINGS_ITEMS}`,
      apiKey
    ),
  ]);

  const quote = quoteResult.status === "fulfilled"
    ? {
        currentPrice: toNumber(quoteResult.value.c),
        change: toNumber(quoteResult.value.d),
        changePercent: toNumber(quoteResult.value.dp),
        high: toNumber(quoteResult.value.h),
        low: toNumber(quoteResult.value.l),
        open: toNumber(quoteResult.value.o),
        previousClose: toNumber(quoteResult.value.pc),
        timestamp: toIsoTimestamp(quoteResult.value.t),
      }
    : null;
  if (quoteResult.status === "rejected") errors.quote = quoteResult.reason?.message ?? "Quote request failed";

  const profile = profileResult.status === "fulfilled"
    ? {
        name: boundedText(profileResult.value.name, normalizedSymbol, 90),
        exchange: boundedText(profileResult.value.exchange, "unavailable", 40),
        industry: boundedText(profileResult.value.finnhubIndustry, "unavailable", 80),
        marketCapBillion: toNumber(profileResult.value.marketCapitalization),
        ipoDate: typeof profileResult.value.ipo === "string" && profileResult.value.ipo ? profileResult.value.ipo : null,
      }
    : null;
  if (profileResult.status === "rejected") errors.profile = profileResult.reason?.message ?? "Profile request failed";

  const metric = metricsResult.status === "fulfilled" ? metricsResult.value.metric ?? {} : null;
  const basicFinancials = metric
    ? {
        peTtm: toNumber(metric.peTTM ?? metric.peBasicExclExtraTTM),
        pb: toNumber(metric.pbAnnual),
        psTtm: toNumber(metric.psTTM),
        week52High: toNumber(metric["52WeekHigh"]),
        week52Low: toNumber(metric["52WeekLow"]),
        beta: toNumber(metric.beta),
        dividendYield: toNumber(metric.dividendYieldIndicatedAnnual),
      }
    : null;
  if (metricsResult.status === "rejected") errors.financials = metricsResult.reason?.message ?? "Financials request failed";

  const news = newsResult.status === "fulfilled" && Array.isArray(newsResult.value)
    ? newsResult.value
        .slice(0, MAX_NEWS_ITEMS)
        .map((item) => ({
          headline: boundedText(item.headline, "Headline unavailable", 140),
          summary: boundedText(item.summary, "Summary unavailable", 220),
          source: boundedText(item.source, "Unknown source", 60),
          url: typeof item.url === "string" ? item.url : "",
          timestamp: toIsoTimestamp(item.datetime),
        }))
        .filter((item) => item.url.startsWith("http://") || item.url.startsWith("https://"))
    : [];
  if (newsResult.status === "rejected") errors.news = newsResult.reason?.message ?? "News request failed";

  const earnings = earningsResult.status === "fulfilled" && Array.isArray(earningsResult.value)
    ? earningsResult.value.slice(0, MAX_EARNINGS_ITEMS).map((item) => ({
        period: boundedText(item.period, "unknown", 20),
        actualEps: toNumber(item.actual),
        estimateEps: toNumber(item.estimate),
        surprisePercent: toNumber(item.surprisePercent),
      }))
    : [];
  if (earningsResult.status === "rejected") errors.earnings = earningsResult.reason?.message ?? "Earnings request failed";

  const snapshot: FinnhubSnapshot = {
    symbol: normalizedSymbol,
    fetchedAt: new Date().toISOString(),
    quote,
    profile,
    basicFinancials,
    news,
    earnings,
  };

  const successCount = [quote, profile, basicFinancials].filter(Boolean).length;
  const quality: FinnhubQuality = successCount >= 3 ? "ok" : successCount > 0 ? "partial" : "unavailable";
  const finalSnapshot = quality === "unavailable" ? null : snapshot;

  return {
    snapshot: finalSnapshot,
    quality,
    errors,
    asPromptBlock: buildPromptBlock(normalizedSymbol, finalSnapshot, quality, errors),
  };
}

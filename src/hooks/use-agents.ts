import { useState, useCallback } from "react";
import { getAiClient, MODELS, AgentStatus, AnalysisResult } from "@/lib/gemini";
import { Type } from "@google/genai";

// Helper to clean and parse JSON from AI response
function cleanAndParseJSON(text: string): any {
  try {
    // Remove markdown code blocks
    let cleaned = text.replace(/```json/g, '').replace(/```/g, '');
    
    // Find the first valid JSON start (object or array)
    const firstOpenBrace = cleaned.indexOf('{');
    const firstOpenBracket = cleaned.indexOf('[');
    
    let start = -1;
    let end = -1;
    
    // Determine if we are looking for object or array based on which comes first
    if (firstOpenBrace !== -1 && (firstOpenBracket === -1 || firstOpenBrace < firstOpenBracket)) {
      start = firstOpenBrace;
      end = cleaned.lastIndexOf('}');
    } else if (firstOpenBracket !== -1) {
      start = firstOpenBracket;
      end = cleaned.lastIndexOf(']');
    }
    
    if (start !== -1 && end !== -1) {
      cleaned = cleaned.substring(start, end + 1);
    }
    
    return JSON.parse(cleaned);
  } catch (e) {
    console.error("JSON Parse Error:", e);
    console.log("Failed Text:", text);
    throw new Error("Failed to parse AI response");
  }
}

function normalizeTickerSymbol(symbol: string): string {
  return symbol.trim().toUpperCase();
}

function isValidTickerSymbol(symbol: string): boolean {
  return /^[A-Z.]{1,6}$/.test(symbol);
}

function toValidTickerList(symbols: string[]): string[] {
  const seen = new Set<string>();
  const valid: string[] = [];

  for (const raw of symbols) {
    const symbol = normalizeTickerSymbol(raw);
    if (!isValidTickerSymbol(symbol) || seen.has(symbol)) {
      continue;
    }
    seen.add(symbol);
    valid.push(symbol);
  }

  return valid;
}

function extractSymbolsFromScanPayload(payload: unknown): string[] {
  if (Array.isArray(payload)) {
    return payload.flatMap((item) => {
      if (isNonEmptyString(item)) return [item];
      if (item && typeof item === "object" && isNonEmptyString((item as { symbol?: unknown }).symbol)) {
        return [(item as { symbol: string }).symbol];
      }
      return [];
    });
  }

  if (payload && typeof payload === "object") {
    const data = payload as { symbols?: unknown; tickers?: unknown; symbol?: unknown };
    if (Array.isArray(data.symbols)) return extractSymbolsFromScanPayload(data.symbols);
    if (Array.isArray(data.tickers)) return extractSymbolsFromScanPayload(data.tickers);
    if (isNonEmptyString(data.symbol)) return [data.symbol];
  }

  return [];
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function toTrimmedString(value: unknown, fallback: string): string {
  return isNonEmptyString(value) ? value.trim() : fallback;
}

function toStringArray(value: unknown, fallback: string): string[] {
  if (!Array.isArray(value)) return [fallback];

  const cleaned = value
    .filter((item): item is string => isNonEmptyString(item))
    .map((item) => item.trim());

  return cleaned.length > 0 ? cleaned : [fallback];
}

function sanitizeText(value: string): string {
  return value
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[`*_#>|{}\[\]]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1).trimEnd()}...`;
}

function extractKeyPoint(rawText: string, fallback: string): string {
  const cleaned = sanitizeText(rawText).replace(/https?:\/\/\S+/g, "").trim();
  if (!cleaned) return fallback;

  const sentenceCandidates = cleaned
    .split(/(?:\.|\!|\?)\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const sentence = sentenceCandidates.find((candidate) => candidate.length >= 20) ?? cleaned;
  return truncateText(sentence, 150);
}

function recommendationReason(recommendation: "BUY" | "SELL" | "HOLD", isOwned: boolean): string {
  if (!isOwned) {
    return "This stock is listed as a new idea because upside signals look stronger than downside risk.";
  }

  switch (recommendation) {
    case "BUY":
      return "Current signals suggest potential upside is stronger than near-term downside.";
    case "SELL":
      return "Current signals suggest downside risk may outweigh upside for existing holders.";
    case "HOLD":
      return "Signals are mixed, so keeping the position and waiting for clearer direction is safer.";
  }
}

function buildBeginnerSummary(params: {
  symbol: string;
  recommendation: "BUY" | "SELL" | "HOLD";
  isOwned: boolean;
  price: number | null;
  confidence: number;
  riskLevel: number;
  sourceText: string;
}): string {
  const { symbol, recommendation, isOwned, price, confidence, riskLevel, sourceText } = params;
  const priceText = typeof price === "number" && Number.isFinite(price) && price > 0
    ? `$${price.toFixed(2)}`
    : "its current level";
  const keyPoint = extractKeyPoint(
    sourceText,
    `${symbol} has mixed recent signals and needs careful risk control.`
  );

  return [
    `What is happening: ${symbol} is trading near ${priceText}. ${keyPoint}.`,
    `Simple logic: ${recommendationReason(recommendation, isOwned)}`,
    `Risk check: Risk is ${riskLevel}/10 and confidence is ${confidence}%.`,
  ].join("\n");
}

function buildBeginnerAction(params: {
  symbol: string;
  recommendation: "BUY" | "SELL" | "HOLD";
  isOwned: boolean;
  rawAction: string;
}): string {
  const { symbol, recommendation, isOwned, rawAction } = params;
  const cleanedAction = sanitizeText(rawAction);
  const actionSuggestsSell = /\b(sell|exit|trim|reduce|short)\b/i.test(cleanedAction);
  const actionSuggestsHold = /\b(?:hold|wait)\b/i.test(cleanedAction);

  if (!isOwned) {
    if (
      cleanedAction.length >= 25 &&
      !actionSuggestsSell &&
      !actionSuggestsHold
    ) {
      return truncateText(cleanedAction, 190);
    }
    return `Consider a small starter position in ${symbol} and add only if momentum and fundamentals keep improving.`;
  }

  if (cleanedAction.length >= 25) {
    return truncateText(cleanedAction, 190);
  }

  switch (recommendation) {
    case "BUY":
      return `If ${symbol} stays strong, scale in gradually instead of buying all at once.`;
    case "SELL":
      return `Consider trimming ${symbol} in stages and protect capital with a clear exit level.`;
    case "HOLD":
      return `Hold ${symbol} for now and wait for clearer earnings or trend confirmation before making a move.`;
  }
}

function buildStructuredThesis(params: {
  symbol: string;
  recommendation: "BUY" | "SELL" | "HOLD";
  isOwned: boolean;
  price: number | null;
  confidence: number;
  riskLevel: number;
  sourceText: string;
}): string {
  const { symbol, recommendation, isOwned, price, confidence, riskLevel, sourceText } = params;
  const priceText = typeof price === "number" && Number.isFinite(price) && price > 0
    ? `$${price.toFixed(2)}`
    : "recent levels";
  const keyPoint = extractKeyPoint(
    sourceText,
    `${symbol} has limited structured data in this run, so position sizing should be conservative.`
  );

  const riskPlan = recommendation === "SELL"
    ? "Reduce exposure in steps and avoid averaging down until risk improves."
    : recommendation === "HOLD"
      ? "Keep position size stable and re-check after major catalysts."
      : "Use staged entries and keep a clear downside stop level.";

  const ownershipContext = isOwned
    ? "This recommendation is for an existing holding."
    : "This recommendation is for a new idea, not an existing holding.";

  return [
    "Market Snapshot",
    `- ${symbol} is trading near ${priceText}.`,
    `- Key observation: ${keyPoint}.`,
    "",
    "Decision Logic",
    `- Recommendation: ${recommendation}.`,
    `- Rationale: ${recommendationReason(recommendation, isOwned)}`,
    `- Context: ${ownershipContext}`,
    "",
    "Risk Plan",
    `- Risk level: ${riskLevel}/10 with ${confidence}% confidence.`,
    `- Execution: ${riskPlan}`,
  ].join("\n");
}

function formatInsightList(value: unknown, fallback: string): string[] {
  const items = toStringArray(value, fallback)
    .map((item) => sanitizeText(item))
    .filter((item) => item.length > 0)
    .map((item) => truncateText(item, 190));

  return items.length > 0 ? items : [fallback];
}

function extractPriceFromText(text: string): number | null {
  const match = text.match(/\$\s?([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]+)?)/);
  if (!match?.[1]) return null;

  const parsed = parseFloat(match[1].replace(/,/g, ""));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function isValidHttpUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function getDefaultAction(symbol: string, recommendation: "BUY" | "SELL" | "HOLD"): string {
  switch (recommendation) {
    case "BUY":
      return `Consider a staged entry in ${symbol} with clear risk limits.`;
    case "SELL":
      return `Consider reducing exposure to ${symbol} and re-evaluating downside risk.`;
    case "HOLD":
      return `Hold ${symbol} and monitor upcoming catalysts before changing the position.`;
  }
}

function normalizeRecommendation(value: unknown, isOwned: boolean): "BUY" | "SELL" | "HOLD" {
  // Non-portfolio ideas must be buy opportunities only.
  if (!isOwned) return "BUY";
  if (!isNonEmptyString(value)) return "HOLD";

  const recommendation = value.trim().toUpperCase();
  if (recommendation === "BUY" || recommendation === "SELL" || recommendation === "HOLD") {
    return recommendation;
  }
  return "HOLD";
}

interface NormalizeOptions {
  symbol: string;
  gatheredData: string;
  isOwned: boolean;
  riskTolerance: number;
}

function normalizeAnalysisResult(rawResult: unknown, options: NormalizeOptions): AnalysisResult {
  const { symbol, gatheredData, isOwned, riskTolerance } = options;
  const fallbackSymbol = symbol.toUpperCase();
  const defaultRisk = clamp(Math.round(riskTolerance / 10) || 5, 1, 10);
  const condensedGatheredData = gatheredData.replace(/\s+/g, " ").trim();

  const result = typeof rawResult === "object" && rawResult !== null
    ? rawResult as Partial<AnalysisResult>
    : {};
  const beginnerView = typeof result.beginnerView === "object" && result.beginnerView !== null
    ? result.beginnerView as Partial<AnalysisResult["beginnerView"]>
    : {};
  const proView = typeof result.proView === "object" && result.proView !== null
    ? result.proView as Partial<AnalysisResult["proView"]>
    : {};

  const recommendation = normalizeRecommendation(result.recommendation, isOwned);

  const parsedPrice = typeof result.price === "number" && Number.isFinite(result.price) && result.price > 0
    ? result.price
    : extractPriceFromText(gatheredData);
  const confidence = clamp(Math.round(typeof result.confidence === "number" ? result.confidence : 55), 1, 100);
  const riskLevel = clamp(Math.round(typeof result.riskLevel === "number" ? result.riskLevel : defaultRisk), 1, 10);
  const summarySource = [
    toTrimmedString(beginnerView.summary, ""),
    condensedGatheredData,
  ].filter(Boolean).join(" ");
  const thesisSource = [
    toTrimmedString(proView.thesis, ""),
    summarySource,
  ].filter(Boolean).join(" ");

  const rawSources = Array.isArray(proView.sources)
    ? proView.sources
    : [];

  let sources = rawSources
    .filter((source): source is { title?: unknown; url?: unknown; timestamp?: unknown } => typeof source === "object" && source !== null)
    .map((source) => {
      const title = toTrimmedString(source.title, "Source");
      const url = toTrimmedString(source.url, "");
      const timestamp = isNonEmptyString(source.timestamp) ? source.timestamp.trim() : undefined;
      return { title, url, timestamp };
    })
    .filter((source) => isValidHttpUrl(source.url));

  if (sources.length === 0) {
    const fallbackUrls = [...new Set(gatheredData.match(/https?:\/\/[^\s)]+/g) ?? [])].slice(0, 2);
    sources = fallbackUrls.map((url, index) => ({ title: `Source ${index + 1}`, url }));
  }

  return {
    // Keep symbol tied to the symbol we actually requested to avoid model alias/hallucinated IDs
    // (e.g., APPL001) causing duplicate or mismatched cards.
    symbol: fallbackSymbol,
    price: parsedPrice ?? 0,
    recommendation,
    confidence,
    riskLevel,
    isUrgent: Boolean(result.isUrgent),
    beginnerView: {
      summary: buildBeginnerSummary({
        symbol: fallbackSymbol,
        recommendation,
        isOwned,
        price: parsedPrice,
        confidence,
        riskLevel,
        sourceText: summarySource,
      }),
      action: buildBeginnerAction({
        symbol: fallbackSymbol,
        recommendation,
        isOwned,
        rawAction: toTrimmedString(beginnerView.action, getDefaultAction(fallbackSymbol, recommendation)),
      }),
    },
    proView: {
      thesis: buildStructuredThesis({
        symbol: fallbackSymbol,
        recommendation,
        isOwned,
        price: parsedPrice,
        confidence,
        riskLevel,
        sourceText: thesisSource,
      }),
      technicalIndicators: formatInsightList(
        proView.technicalIndicators,
        "No technical indicator details were generated in this run."
      ),
      fundamentalRatios: formatInsightList(
        proView.fundamentalRatios,
        "No fundamental ratio details were generated in this run."
      ),
      historicalCorrelations: formatInsightList(
        proView.historicalCorrelations,
        "No historical correlation details were generated in this run."
      ),
      sources,
    },
    timestamp: new Date().toISOString(),
  };
}

export function useMarketAgents() {
  const [status, setStatus] = useState<AgentStatus>("idle");
  const [results, setResults] = useState<AnalysisResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  // --- CORE PIPELINE (Internal) ---
  const runAnalysisPipeline = async (
    symbol: string,
    riskTolerance: number,
    options: { isOwned?: boolean } = {}
  ): Promise<AnalysisResult> => {
    const { isOwned = false } = options;
    const ai = getAiClient();
    
    // 1. GATHER
    const gathererPrompt = `
      Find the current price, recent news (last 7 days), and key data for ${symbol}.
      
      If ${symbol} is a STOCK: Get P/E, Market Cap, Analyst Ratings, and recent earnings.
      If ${symbol} is an ETF/INDEX (like VTI, SPY, QQQ): Get Top Holdings, Sector Allocation, Expense Ratio, and recent market sentiment.
      
      IMPORTANT: 
      - Ignore any crypto or blockchain assets unless specifically asked for. Focus on the equity/fund.
      - YOU MUST FIND DATA. If specific metrics are unavailable, find the closest proxies (e.g. "Tech Sector" sentiment for QQQ).
      - Return a summary of the raw data.
    `;
    
    const gathererResponse = await ai.models.generateContent({
      model: MODELS.GATHERER,
      contents: gathererPrompt,
      config: { tools: [{ googleSearch: {} }] },
    });
    const gatheredData = gathererResponse.text;

    // 2. HISTORIAN
    const historianPrompt = `
      You are The Historian. Analyze data for ${symbol}:
      ${gatheredData}
      Compare to historical trends. Risk tolerance: ${riskTolerance}/100.
      Provide detailed analysis.
    `;
    const historianResponse = await ai.models.generateContent({
      model: MODELS.HISTORIAN,
      contents: historianPrompt,
    });
    const historicalContext = historianResponse.text;

    // 3. AUDITOR
    const auditorPrompt = `
      You are The Auditor. Fact-check this analysis for ${symbol}:
      ${historicalContext}
      Raw Data: ${gatheredData}
      1. Check consistency.
      2. Verify sources.
      3. Remove hallucinations.
      4. NO CRYPTO.
      Provide vetted analysis.
    `;
    const auditorResponse = await ai.models.generateContent({
      model: MODELS.AUDITOR,
      contents: auditorPrompt,
    });
    const vettedAnalysis = auditorResponse.text;

    // 4. SYNTHESIZER
    const synthesizerPrompt = `
      You are The Synthesizer. Format analysis for ${symbol} into JSON.
      
      Raw Data: ${gatheredData}
      Vetted Analysis: ${vettedAnalysis}
      Risk Tolerance: ${riskTolerance}/100
      User Owns Position: ${isOwned ? "YES" : "NO"}

      Instructions:
      - You MUST provide the information for ALL mentioned stocks.
      - If User Owns Position is YES: recommendation can be BUY, SELL, or HOLD.
      - If User Owns Position is NO: recommendation MUST be BUY. NEVER SELL. NEVER HOLD.
      - beginnerView.summary must be beginner-friendly plain English and use simple logic: "because X, therefore Y".
      - beginnerView.summary must be exactly 3 short lines:
        1) What is happening
        2) Simple logic
        3) Risk check
      - beginnerView.action must be one clear sentence with simple words and no jargon.
      - proView.thesis must be cleanly formatted with section headers and bullet points (no wall of text).
      - Do NOT use "WATCH".
      - Ensure sources are valid URLs.
      - OUTPUT PURE JSON ONLY. NO MARKDOWN. NO CODE BLOCKS.
      - Do NOT put JSON strings inside the summary or thesis fields. Write plain text.
      - IF DATA IS MISSING: Make a best effort estimate or general statement based on the symbol's known sector/status. DO NOT LEAVE FIELDS EMPTY.

      JSON Structure:
      {
        "symbol": "${symbol}",
        "price": number,
        "recommendation": "BUY" | "SELL" | "HOLD",
        "confidence": number,
        "riskLevel": number,
        "isUrgent": boolean,
        "beginnerView": { "summary": "string", "action": "string" },
        "proView": {
          "thesis": "string",
          "technicalIndicators": ["string"],
          "fundamentalRatios": ["string"],
          "historicalCorrelations": ["string"],
          "sources": [{ "title": "string", "url": "string", "timestamp": "string" }]
        }
      }
    `;

    const synthesizerResponse = await ai.models.generateContent({
      model: MODELS.SYNTHESIZER,
      contents: synthesizerPrompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            symbol: { type: Type.STRING },
            price: { type: Type.NUMBER },
            recommendation: { type: Type.STRING, enum: ["BUY", "SELL", "HOLD"] },
            confidence: { type: Type.NUMBER },
            riskLevel: { type: Type.NUMBER },
            isUrgent: { type: Type.BOOLEAN },
            beginnerView: {
              type: Type.OBJECT,
              properties: { summary: { type: Type.STRING }, action: { type: Type.STRING } }
            },
            proView: {
              type: Type.OBJECT,
              properties: {
                thesis: { type: Type.STRING },
                technicalIndicators: { type: Type.ARRAY, items: { type: Type.STRING } },
                fundamentalRatios: { type: Type.ARRAY, items: { type: Type.STRING } },
                historicalCorrelations: { type: Type.ARRAY, items: { type: Type.STRING } },
                sources: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: { title: { type: Type.STRING }, url: { type: Type.STRING }, timestamp: { type: Type.STRING } }
                  }
                }
              }
            }
          }
        },
      },
    });

    let result: AnalysisResult;
    try {
      const parsedResult = cleanAndParseJSON(synthesizerResponse.text);
      result = normalizeAnalysisResult(parsedResult, { symbol, gatheredData, isOwned, riskTolerance });
    } catch (e) {
      console.error("Failed to parse synthesizer response", e);
      throw new Error(`Failed to parse analysis for ${symbol}`);
    }
    return result;
  };

  // --- PUBLIC ACTIONS ---

  const analyzeStock = useCallback(async (
    symbol: string,
    riskTolerance: number,
    portfolio: { symbol: string }[] = []
  ) => {
    setStatus("gathering");
    setError(null);
    setResults([]);

    try {
      const ownedSymbols = new Set(portfolio.map((item) => item.symbol.toUpperCase()));
      const normalizedSymbol = symbol.trim().toUpperCase();
      const result = await runAnalysisPipeline(normalizedSymbol, riskTolerance, {
        isOwned: ownedSymbols.has(normalizedSymbol)
      });
      setResults([result]);
      setStatus("complete");
    } catch (err) {
      handleError(err);
    }
  }, []);

  const scanMarket = useCallback(async (riskTolerance: number, portfolio: { symbol: string }[] = []) => {
    setStatus("gathering");
    setError(null);
    setResults([]);

    try {
      const ai = getAiClient();
      const portfolioSymbols = toValidTickerList(portfolio.map((p) => p.symbol));
      const portfolioSymbolsText = portfolioSymbols.join(", ");
      
      // 1. SCAN
      const scanPrompt = `
        Scan the US Stock Market (NO CRYPTO) for investment opportunities.
        
        Criteria:
        1. ALWAYS include the user's portfolio holdings: [${portfolioSymbolsText}] - we need to provide an update on these.
        2. Include 3 to 5 additional strong "BUY" opportunities (Large Cap, Small Cap, or ETFs).
        
        Return ONLY a JSON array of stock symbols strings.
        It MUST include all portfolio holdings plus the 3 to 5 additional opportunities.
        Example: ["AAPL", "NVDA", "MSFT", "LLY", "SPY", "AMZN"]
        DO NOT return any conversational text. JUST the JSON array.
      `;

      const scanResponse = await ai.models.generateContent({
        model: MODELS.GATHERER,
        contents: scanPrompt,
        config: {
          tools: [{ googleSearch: {} }],
        }
      });

      let scannedSymbols: string[] = [];
      try {
        const parsed = cleanAndParseJSON(scanResponse.text);
        scannedSymbols = extractSymbolsFromScanPayload(parsed);
      } catch (e) {
        console.error("Failed to parse scan response", e);
      }

      // Fallback: regex extraction for non-JSON or malformed payloads.
      if (scannedSymbols.length === 0) {
        const regexMatches = scanResponse.text.match(/\b[A-Z]{1,6}(?:\.[A-Z])?\b/g) ?? [];
        scannedSymbols = regexMatches;
      }

      const fallbackAdditionalUniverse = [
        "MSFT", "AMZN", "GOOGL", "META", "JPM", "LLY", "XOM", "COST", "UNH", "SPY", "QQQ", "VTI"
      ];

      const additionalPool = toValidTickerList([
        ...scannedSymbols,
        ...fallbackAdditionalUniverse
      ]).filter((symbol) => !portfolioSymbols.includes(symbol));

      const minimumAdditional = 3;
      const maximumAdditional = 5;
      const initialAdditionalCandidates = additionalPool.slice(0, maximumAdditional);
      const symbolsToAnalyze = [...portfolioSymbols, ...initialAdditionalCandidates];

      if (symbolsToAnalyze.length === 0) {
        throw new Error("No valid symbols found in scan.");
      }
      
      // 2. ANALYZE EACH (Parallel with error handling)
      setStatus("historian"); 
      const ownedSymbols = new Set(portfolioSymbols);

      const analyzeSymbolWithRetry = async (sym: string, retries = 1): Promise<AnalysisResult | null> => {
        for (let attempt = 0; attempt <= retries; attempt++) {
          try {
            return await runAnalysisPipeline(sym, riskTolerance, {
              isOwned: ownedSymbols.has(sym),
            });
          } catch (e) {
            if (attempt === retries) {
              console.error(`Failed to analyze ${sym}`, e);
            }
          }
        }
        return null;
      };
      
      const analysisPromises = symbolsToAnalyze.map((sym) => analyzeSymbolWithRetry(sym, 1));
      
      let analysisResults = (await Promise.all(analysisPromises)).filter((r): r is AnalysisResult => r !== null);

      const analyzedSymbols = new Set(analysisResults.map((result) => result.symbol.toUpperCase()));

      // Retry any missing portfolio symbol so holdings are always prioritized in output.
      for (const portfolioSymbol of portfolioSymbols) {
        if (!analyzedSymbols.has(portfolioSymbol)) {
          const retryResult = await analyzeSymbolWithRetry(portfolioSymbol, 1);
          if (retryResult) {
            analysisResults.push(retryResult);
            analyzedSymbols.add(retryResult.symbol.toUpperCase());
          }
        }
      }

      let additionalCount = analysisResults.filter(
        (result) => !ownedSymbols.has(result.symbol.toUpperCase())
      ).length;

      // If we still don't have at least 3 non-portfolio ideas, keep trying next candidates.
      let fallbackIndex = maximumAdditional;
      while (additionalCount < minimumAdditional && fallbackIndex < additionalPool.length) {
        const symbol = additionalPool[fallbackIndex];
        fallbackIndex += 1;

        if (analyzedSymbols.has(symbol)) {
          continue;
        }

        const nextResult = await analyzeSymbolWithRetry(symbol, 1);
        if (nextResult) {
          analysisResults.push(nextResult);
          analyzedSymbols.add(nextResult.symbol.toUpperCase());
          additionalCount += 1;
        }
      }

      const missingPortfolioSymbols = portfolioSymbols.filter(
        (symbol) => !analysisResults.some((result) => result.symbol.toUpperCase() === symbol)
      );
      if (missingPortfolioSymbols.length > 0) {
        throw new Error(
          `Could not analyze all portfolio holdings right now (${missingPortfolioSymbols.join(", ")}). Please scan again.`
        );
      }

      if (additionalCount < minimumAdditional) {
        throw new Error(
          `Only ${additionalCount} additional opportunities were available. Please scan again to get at least ${minimumAdditional}.`
        );
      }

      // Guarantee unique symbols in output even if upstream analysis returns duplicates.
      const uniqueResults = new Map<string, AnalysisResult>();
      for (const result of analysisResults) {
        const key = result.symbol.toUpperCase();
        const existing = uniqueResults.get(key);
        if (!existing || result.confidence > existing.confidence) {
          uniqueResults.set(key, result);
        }
      }
      analysisResults = Array.from(uniqueResults.values());
      
      if (analysisResults.length === 0) {
        throw new Error("All analyses failed. Please try again.");
      }

      // Portfolio holdings first, then additional symbols.
      analysisResults = analysisResults.sort((a, b) => {
        const aOwned = ownedSymbols.has(a.symbol.toUpperCase());
        const bOwned = ownedSymbols.has(b.symbol.toUpperCase());
        if (aOwned !== bOwned) return aOwned ? -1 : 1;
        return a.symbol.localeCompare(b.symbol);
      });

      setResults(analysisResults);
      setStatus("complete");

    } catch (err) {
      handleError(err);
    }
  }, []);

  const handleError = (err: unknown) => {
    console.error("Agent Pipeline Error:", err);
    const errorMessage = err instanceof Error ? err.message : String(err);
    
    if (errorMessage.includes("403") || errorMessage.includes("permission")) {
      setError("API Key Permission Denied. Please ensure you have selected a valid paid API key.");
    } else if (errorMessage.includes("503") || errorMessage.includes("overloaded")) {
      setError("AI Models are currently overloaded (503). Please wait a moment and try again.");
    } else {
      setError(errorMessage);
    }
    setStatus("error");
  };

  return {
    status,
    results,
    error,
    analyzeStock,
    scanMarket
  };
}

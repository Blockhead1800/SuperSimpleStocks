import { GoogleGenAI, Type } from "@google/genai";

export const API_KEY_STORAGE_KEY = "lumina_gemini_api_key";

const getGeminiApiKey = () => {
  if (typeof window === "undefined") return undefined;
  const savedKey = window.localStorage.getItem(API_KEY_STORAGE_KEY);
  return savedKey?.trim() || undefined;
};

// Helper to get a fresh AI client so key updates are picked up immediately.
export const getAiClient = () => {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error(
      "Missing Gemini API key. Add your key in Settings > API Key."
    );
  }
  return new GoogleGenAI({ apiKey });
};

export const MODELS = {
  GATHERER: "gemini-3-flash-preview", // Fast, supports search
  HISTORIAN: "gemini-3-flash-preview", // Fast reasoning
  AUDITOR: "gemini-3-flash-preview", // Fast checking
  SYNTHESIZER: "gemini-3.1-pro-preview", // High quality formatting
};

export type AgentStatus = "idle" | "gathering" | "historian" | "auditing" | "synthesizing" | "complete" | "error";

export interface AnalysisResult {
  symbol: string;
  price: number;
  recommendation: "BUY" | "SELL" | "HOLD" | "WATCH" | "AVOID";
  confidence: number;
  riskLevel: number; // 1-10
  isUrgent?: boolean;
  beginnerView: {
    summary: string;
    action: string;
  };
  proView: {
    thesis: string;
    technicalIndicators: string[];
    fundamentalRatios: string[];
    historicalCorrelations: string[];
    sources: { title: string; url: string; timestamp?: string }[];
  };
  timestamp: string;
  liveData?: {
    provider: "Finnhub";
    quality: "ok" | "partial" | "unavailable";
    snapshotTime?: string;
  };
}

export interface MarketOpportunity {
  symbol: string;
  name: string;
  reason: string;
  score: number; // 1-10 relevance
}

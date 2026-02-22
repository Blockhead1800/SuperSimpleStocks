/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as React from "react";
import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { LayoutDashboard, PieChart, Settings, Bell, Menu, X, Sparkles, ChevronLeft, ChevronRight } from "lucide-react";
import { RiskSlider } from "@/components/risk-slider";
import { AgentVisualizer } from "@/components/agent-visualizer";
import { AnalysisDisplay } from "@/components/analysis-display";
import { PortfolioView, PortfolioItem } from "@/components/portfolio-view";
import { useMarketAgents } from "@/hooks/use-agents";
import { API_KEY_STORAGE_KEY } from "@/lib/gemini";
import {
  FINNHUB_API_KEY_STORAGE_KEY,
  setFinnhubApiKey,
  clearFinnhubApiKey,
} from "@/lib/finnhub";
import { cn } from "@/lib/utils";
import brandIcon from "../Icon/Icon.png";

type View = "dashboard" | "portfolio" | "alerts" | "settings";
type SearchFrequency = "12h" | "24h" | "3d" | "1w" | "never";

export default function App() {
  const [symbol, setSymbol] = useState("");
  const [riskTolerance, setRiskTolerance] = useState(50);
  const { status, results, error, analyzeStock, scanMarket } = useMarketAgents();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentView, setCurrentView] = useState<View>("dashboard");
  const [hasApiKey, setHasApiKey] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [apiKeySavedNotice, setApiKeySavedNotice] = useState("");
  const [hasFinnhubKey, setHasFinnhubKey] = useState(false);
  const [finnhubKeyInput, setFinnhubKeyInput] = useState("");
  const [finnhubKeySavedNotice, setFinnhubKeySavedNotice] = useState("");
  const [searchFrequency, setSearchFrequency] = useState<SearchFrequency>("24h");
  const [currentResultIndex, setCurrentResultIndex] = useState(0);
  
  // Portfolio State
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([
    { id: "1", symbol: "AAPL", shares: 10, avgCost: 150.00 },
    { id: "2", symbol: "NVDA", shares: 5, avgCost: 400.00 },
  ]);

  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  useEffect(() => {
    const saved = window.localStorage.getItem(API_KEY_STORAGE_KEY)?.trim() || "";
    const savedFinnhub = window.localStorage.getItem(FINNHUB_API_KEY_STORAGE_KEY)?.trim() || "";
    setHasApiKey(Boolean(saved));
    setApiKeyInput(saved);
    setHasFinnhubKey(Boolean(savedFinnhub));
    setFinnhubKeyInput(savedFinnhub);
  }, []);

  const saveApiKey = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedKey = apiKeyInput.trim();
    if (trimmedKey) {
      window.localStorage.setItem(API_KEY_STORAGE_KEY, trimmedKey);
      setHasApiKey(true);
      setApiKeySavedNotice("API key saved.");
      return;
    }
    window.localStorage.removeItem(API_KEY_STORAGE_KEY);
    setHasApiKey(false);
    setApiKeySavedNotice("API key removed.");
  };

  const saveFinnhubKey = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedKey = finnhubKeyInput.trim();
    if (trimmedKey) {
      setFinnhubApiKey(trimmedKey);
      setHasFinnhubKey(true);
      setFinnhubKeySavedNotice("Finnhub API key saved.");
      return;
    }
    clearFinnhubApiKey();
    setHasFinnhubKey(false);
    setFinnhubKeySavedNotice("Finnhub API key removed.");
  };

  const removeFinnhubKey = () => {
    clearFinnhubApiKey();
    setHasFinnhubKey(false);
    setFinnhubKeyInput("");
    setFinnhubKeySavedNotice("Finnhub API key removed.");
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (symbol.trim()) {
      setCurrentView("dashboard");
      analyzeStock(symbol.toUpperCase(), riskTolerance, portfolio);
    }
  };

  const handleDiscovery = () => {
    setCurrentView("dashboard");
    setSymbol(""); 
    scanMarket(riskTolerance, portfolio);
  };

  const addToPortfolio = (symbol: string, shares: number, avgCost: number) => {
    const newItem: PortfolioItem = {
      id: Math.random().toString(36).substr(2, 9),
      symbol,
      shares,
      avgCost,
    };
    setPortfolio([...portfolio, newItem]);
  };

  const removeFromPortfolio = (id: string) => {
    setPortfolio(portfolio.filter(item => item.id !== id));
  };
  const isAgentsRunning =
    status === "gathering" ||
    status === "historian" ||
    status === "auditing" ||
    status === "synthesizing";
  const hasResults = results.length > 0;
  const displayedResult = hasResults
    ? results[Math.min(currentResultIndex, results.length - 1)]
    : null;

  const showPreviousResult = React.useCallback(() => {
    if (results.length <= 1) return;
    setCurrentResultIndex((prev) => (prev - 1 + results.length) % results.length);
  }, [results.length]);

  const showNextResult = React.useCallback(() => {
    if (results.length <= 1) return;
    setCurrentResultIndex((prev) => (prev + 1) % results.length);
  }, [results.length]);

  useEffect(() => {
    setCurrentResultIndex(0);
  }, [results.length, status]);

  useEffect(() => {
    if (
      currentView !== "dashboard" ||
      status !== "complete" ||
      isAgentsRunning ||
      results.length <= 1
    ) {
      return;
    }

    const handleKeyNavigation = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tagName = target?.tagName;
      if (
        target?.isContentEditable ||
        tagName === "INPUT" ||
        tagName === "TEXTAREA" ||
        tagName === "SELECT"
      ) {
        return;
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        showPreviousResult();
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        showNextResult();
      }
    };

    window.addEventListener("keydown", handleKeyNavigation);
    return () => window.removeEventListener("keydown", handleKeyNavigation);
  }, [currentView, status, isAgentsRunning, results.length, showPreviousResult, showNextResult]);

  return (
    <div className="h-screen overflow-hidden bg-background text-foreground flex">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed lg:static inset-y-0 left-0 z-50 w-64 bg-card border-r transform transition-transform duration-200 ease-in-out",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        <div className="p-6 border-b">
          <div className="flex items-center justify-center">
            <img
              src={brandIcon}
              alt="Super Simple Stocks logo"
              className="w-48 h-22 rounded-xl object-cover"
            />
          </div>
        </div>
        
        <nav className="p-4 space-y-2">
          <button 
            onClick={() => { setCurrentView("dashboard"); setIsSidebarOpen(false); }}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors font-medium",
              currentView === "dashboard" ? "bg-primary/10 text-primary" : "hover:bg-muted text-muted-foreground"
            )}
          >
            <LayoutDashboard className="w-5 h-5" />
            Dashboard
          </button>
          <button 
            onClick={() => { setCurrentView("portfolio"); setIsSidebarOpen(false); }}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors font-medium",
              currentView === "portfolio" ? "bg-primary/10 text-primary" : "hover:bg-muted text-muted-foreground"
            )}
          >
            <PieChart className="w-5 h-5" />
            Portfolio
          </button>
          <button 
            onClick={() => { setCurrentView("alerts"); setIsSidebarOpen(false); }}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors font-medium",
              currentView === "alerts" ? "bg-primary/10 text-primary" : "hover:bg-muted text-muted-foreground"
            )}
          >
            <Bell className="w-5 h-5" />
            Alerts
          </button>
          <button 
            onClick={() => { setCurrentView("settings"); setIsSidebarOpen(false); }}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors font-medium",
              currentView === "settings" ? "bg-primary/10 text-primary" : "hover:bg-muted text-muted-foreground"
            )}
          >
            <Settings className="w-5 h-5" />
            Settings
          </button>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Header */}
        <header className="h-16 border-b bg-card/50 backdrop-blur-sm flex items-center justify-between px-6 sticky top-0 z-30">
          <button 
            className="lg:hidden p-2 -ml-2 hover:bg-muted rounded-md"
            onClick={() => setIsSidebarOpen(true)}
          >
            <Menu className="w-6 h-6" />
          </button>
          
          <div className="flex-1 max-w-xl mx-auto lg:mx-0 lg:mr-auto pl-4 lg:pl-0 flex gap-2 justify-end lg:justify-start">
            <button
              onClick={handleDiscovery}
              className="px-6 py-2 bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-full text-sm font-medium flex items-center gap-2 transition-colors whitespace-nowrap"
              title="Find a trending opportunity"
            >
              <Sparkles className="w-4 h-4 text-primary" />
              <span>Scan Market</span>
            </button>
            <span
              className={cn(
                "px-3 py-2 rounded-full text-xs font-medium border whitespace-nowrap hidden md:inline-flex items-center",
                hasFinnhubKey
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800"
                  : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800"
              )}
            >
              {hasFinnhubKey ? "Finnhub connected" : "Finnhub not connected"}
            </span>
          </div>

        </header>

        {/* Scrollable Content */}
        <div className={cn(
          "flex-1 p-4 lg:p-8",
          currentView === "dashboard" ? "overflow-hidden" : "overflow-y-auto"
        )}>
          <div className="max-w-4xl mx-auto space-y-8">
            {currentView === "dashboard" && (
              <>
                {/* Intro / Empty State */}
                {results.length === 0 && status === "idle" && (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-12"
                  >
                    <div className="text-center py-8">
                      <h1 className="text-4xl font-bold tracking-tight mb-4">
                        Super Simple Stocks
                      </h1>
                      <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
                        Beginner friendly stock analysis powered by a 4-step AI workflow.
                      </p>
                      
                      {!hasApiKey && (
                        <div className="max-w-md mx-auto mb-8 p-4 bg-amber-50 border border-amber-200 rounded-xl dark:bg-amber-950/20 dark:border-amber-900/50">
                          <p className="text-sm text-amber-800 dark:text-amber-400 mb-3">
                            To use advanced reasoning and real-time search, add your API key in Settings.
                          </p>
                        </div>
                      )}

                      <div className="max-w-md mx-auto bg-card border rounded-xl p-6 shadow-sm text-left space-y-6">
                        <RiskSlider 
                          value={riskTolerance} 
                          onChange={setRiskTolerance} 
                        />
                        
                        <div className="pt-4 border-t">
                          <button
                            onClick={handleDiscovery}
                            className="w-full py-3 bg-primary text-primary-foreground rounded-lg font-medium flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
                          >
                            <Sparkles className="w-4 h-4" />
                            Find Stock Ideas
                          </button>
                          <p className="text-xs text-center text-muted-foreground mt-2">
                            US stocks only (no crypto)
                          </p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Active Analysis View */}
                {(status !== "idle" || results.length > 0) && (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 lg:gap-6">
                    {/* Left Column: Controls & Status */}
                    <div className="space-y-4 min-h-0">
                      <div className="bg-card border rounded-xl p-4 shadow-sm">
                        <RiskSlider 
                          value={riskTolerance} 
                          onChange={setRiskTolerance}
                          disabled={status !== "idle" && status !== "complete"} 
                        />
                      </div>
                      
                      <AgentVisualizer status={status} />
                    </div>

                    {/* Right Column: Results */}
                    <div className="lg:col-span-2 space-y-4 min-h-0">
                      {isAgentsRunning && (
                        <div className="rounded-xl border bg-card p-8 min-h-[320px] flex items-center justify-center text-center">
                          <p className="text-sm md:text-base text-muted-foreground max-w-xl">
                            Thanks for watching the ad while the agents are working to keep the app free and accessible to all.
                          </p>
                        </div>
                      )}

                      {error && (
                        <div className="bg-destructive/10 border border-destructive/20 text-destructive p-4 rounded-lg flex items-center gap-3">
                          <div className="p-2 bg-destructive/10 rounded-full">
                            <X className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="font-medium">Analysis Failed</p>
                            <p className="text-sm opacity-90">{error}</p>
                          </div>
                        </div>
                      )}

                      {hasResults && status === "complete" && !isAgentsRunning && displayedResult && (
                        <div className="space-y-4">
                          <div className="bg-card border rounded-xl px-4 py-3 flex items-center justify-between">
                            <button
                              onClick={showPreviousResult}
                              disabled={results.length <= 1}
                              className={cn(
                                "inline-flex items-center gap-2 px-3 py-1.5 rounded-md border text-sm transition-colors",
                                results.length <= 1
                                  ? "opacity-40 cursor-not-allowed"
                                  : "hover:bg-muted"
                              )}
                              title="Previous stock (Left Arrow)"
                            >
                              <ChevronLeft className="w-4 h-4" />
                              <span className="hidden sm:inline">Prev</span>
                            </button>

                            <div className="text-center">
                              <div className="text-xs sm:text-sm font-semibold tracking-wide">
                                {displayedResult.symbol}
                              </div>
                              <div className="text-[11px] sm:text-xs text-muted-foreground">
                                {currentResultIndex + 1} of {results.length}
                              </div>
                            </div>

                            <button
                              onClick={showNextResult}
                              disabled={results.length <= 1}
                              className={cn(
                                "inline-flex items-center gap-2 px-3 py-1.5 rounded-md border text-sm transition-colors",
                                results.length <= 1
                                  ? "opacity-40 cursor-not-allowed"
                                  : "hover:bg-muted"
                              )}
                              title="Next stock (Right Arrow)"
                            >
                              <span className="hidden sm:inline">Next</span>
                              <ChevronRight className="w-4 h-4" />
                            </button>
                          </div>

                          <motion.div
                            key={displayedResult.symbol}
                            initial={{ opacity: 0, x: 12 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            <AnalysisDisplay
                              result={displayedResult}
                              isOwned={portfolio.some(
                                (item) => item.symbol.toUpperCase() === displayedResult.symbol.toUpperCase()
                              )}
                            />
                          </motion.div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}

            {currentView === "portfolio" && (
              <PortfolioView 
                portfolio={portfolio}
                onAdd={addToPortfolio}
                onRemove={removeFromPortfolio}
              />
            )}

            {currentView === "alerts" && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-2xl mx-auto"
              >
                <div className="bg-card border rounded-xl p-8 text-center shadow-sm">
                  <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                    <Bell className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h2 className="text-xl font-bold mb-2">No Active Alerts</h2>
                  <p className="text-muted-foreground">
                    You're all caught up! We'll notify you when significant market events match your criteria.
                  </p>
                </div>
              </motion.div>
            )}

            {currentView === "settings" && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-2xl mx-auto space-y-6"
              >
                <div className="bg-card border rounded-xl p-6 shadow-sm">
                  <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                    <Settings className="w-5 h-5" />
                    Super Simple Stocks Settings
                  </h2>
                  
                  <div className="space-y-6">
                    <div className="flex items-center justify-between pb-6 border-b">
                      <div>
                        <h3 className="font-medium">Auto-Scan Frequency</h3>
                        <p className="text-sm text-muted-foreground">How often to check for new opportunities</p>
                      </div>
                      <select 
                        value={searchFrequency}
                        onChange={(e) => setSearchFrequency(e.target.value as SearchFrequency)}
                        className="bg-background border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                      >
                        <option value="12h">Every 12 Hours</option>
                        <option value="24h">Every 24 Hours</option>
                        <option value="3d">Every 3 Days</option>
                        <option value="1w">Weekly</option>
                        <option value="never">Never (Manual Only)</option>
                      </select>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium">Gemini API Key</h3>
                        <p className="text-sm text-muted-foreground">
                          {hasApiKey ? "Saved locally in this browser." : "No key saved yet."}
                        </p>
                      </div>
                    </div>
                    <form onSubmit={saveApiKey} className="space-y-2">
                      <input
                        type="password"
                        value={apiKeyInput}
                        onChange={(e) => setApiKeyInput(e.target.value)}
                        placeholder="Paste your Gemini API key"
                        autoComplete="new-password"
                        className="w-full bg-background border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                      />
                      <div className="flex items-center gap-3">
                        <button
                          type="submit"
                          className="px-3 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:opacity-90"
                        >
                          Save Key
                        </button>
                        {apiKeySavedNotice && (
                          <span className="text-xs text-muted-foreground">{apiKeySavedNotice}</span>
                        )}
                      </div>
                    </form>

                    <div className="flex items-center justify-between pt-4 border-t">
                      <div>
                        <h3 className="font-medium">Finnhub API Key</h3>
                        <p className="text-sm text-muted-foreground">
                          {hasFinnhubKey ? "Saved locally in this browser." : "No key saved yet."}
                        </p>
                      </div>
                    </div>
                    <form onSubmit={saveFinnhubKey} className="space-y-2">
                      <input
                        type="password"
                        value={finnhubKeyInput}
                        onChange={(e) => setFinnhubKeyInput(e.target.value)}
                        placeholder="Paste your Finnhub API key"
                        autoComplete="new-password"
                        className="w-full bg-background border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                      />
                      <p className="text-xs text-muted-foreground">
                        Get a free key from{" "}
                        <a
                          href="https://finnhub.io/dashboard"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline hover:text-primary"
                        >
                          finnhub.io/dashboard
                        </a>
                        . Stored only in this browser for local use.
                      </p>
                      <div className="flex items-center gap-3">
                        <button
                          type="submit"
                          className="px-3 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:opacity-90"
                        >
                          Save Key
                        </button>
                        <button
                          type="button"
                          onClick={removeFinnhubKey}
                          className="px-3 py-2 text-sm border rounded-md hover:bg-muted"
                        >
                          Remove Key
                        </button>
                        {finnhubKeySavedNotice && (
                          <span className="text-xs text-muted-foreground">{finnhubKeySavedNotice}</span>
                        )}
                      </div>
                    </form>
                  </div>
                </div>
              </motion.div>
            )}

          </div>
        </div>
      </main>
    </div>
  );
}

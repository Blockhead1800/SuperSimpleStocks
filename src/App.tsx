/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as React from "react";
import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Moon, Sun, LayoutDashboard, PieChart, Settings, Bell, Menu, X, Sparkles } from "lucide-react";
import { RiskSlider } from "@/components/risk-slider";
import { AgentVisualizer } from "@/components/agent-visualizer";
import { AnalysisDisplay } from "@/components/analysis-display";
import { PortfolioView, PortfolioItem } from "@/components/portfolio-view";
import { useMarketAgents } from "@/hooks/use-agents";
import { API_KEY_STORAGE_KEY } from "@/lib/gemini";
import { cn } from "@/lib/utils";

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
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [searchFrequency, setSearchFrequency] = useState<SearchFrequency>("24h");
  
  // Portfolio State
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([
    { id: "1", symbol: "AAPL", shares: 10, avgCost: 150.00 },
    { id: "2", symbol: "NVDA", shares: 5, avgCost: 400.00 },
  ]);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  useEffect(() => {
    const saved = window.localStorage.getItem(API_KEY_STORAGE_KEY)?.trim() || "";
    setHasApiKey(Boolean(saved));
    setApiKeyInput(saved);
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

  return (
    <div className="min-h-screen bg-background text-foreground flex">
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
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-lg">L</span>
            </div>
            <span className="font-bold text-xl tracking-tight">Lumina</span>
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
      <main className="flex-1 flex flex-col min-h-screen overflow-hidden">
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
          </div>

          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="p-2 rounded-full hover:bg-muted transition-colors ml-2"
            title="Toggle Dark Mode"
          >
            {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-8">
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
                        Institutional-Grade AI Analysis
                      </h1>
                      <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
                        Our 4-agent autonomous pipeline gathers, analyzes, audits, and synthesizes real-time data for you.
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
                            disabled={status === "gathering"}
                          >
                            <Sparkles className="w-4 h-4" />
                            {status === "gathering" ? "Scanning Market..." : "Auto-Scan for Opportunities"}
                          </button>
                          <p className="text-xs text-center text-muted-foreground mt-2">
                            Find trending stocks (No Crypto)
                          </p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Active Analysis View */}
                {(status !== "idle" || results.length > 0) && (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column: Controls & Status */}
                    <div className="space-y-6">
                      <div className="bg-card border rounded-xl p-6 shadow-sm">
                        <RiskSlider 
                          value={riskTolerance} 
                          onChange={setRiskTolerance}
                          disabled={status !== "idle" && status !== "complete"} 
                        />
                      </div>
                      
                      <AgentVisualizer status={status} />
                    </div>

                    {/* Right Column: Results */}
                    <div className="lg:col-span-2 space-y-6">
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

                      {results.length > 0 && status === "complete" && (
                        <div className="space-y-8">
                          {results.map((res) => (
                            <motion.div
                              key={res.symbol}
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                            >
                              <AnalysisDisplay
                                result={res}
                                isOwned={portfolio.some(
                                  (item) => item.symbol.toUpperCase() === res.symbol.toUpperCase()
                                )}
                              />
                            </motion.div>
                          ))}
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
                    Application Settings
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

                    <div className="flex items-center justify-between pb-6 border-b">
                      <div>
                        <h3 className="font-medium">Dark Mode</h3>
                        <p className="text-sm text-muted-foreground">Toggle application theme</p>
                      </div>
                      <button
                        onClick={() => setIsDarkMode(!isDarkMode)}
                        className={cn(
                          "w-12 h-6 rounded-full transition-colors relative",
                          isDarkMode ? "bg-primary" : "bg-muted"
                        )}
                      >
                        <div className={cn(
                          "w-4 h-4 bg-white rounded-full absolute top-1 transition-all",
                          isDarkMode ? "left-7" : "left-1"
                        )} />
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium">API Key</h3>
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
                        placeholder="Paste Gemini API key"
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

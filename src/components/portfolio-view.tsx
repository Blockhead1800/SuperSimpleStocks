import * as React from "react";
import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus, Trash2, TrendingUp, TrendingDown, Minus, ExternalLink } from "lucide-react";
import { AnalysisResult } from "@/lib/gemini";
import { cn } from "@/lib/utils";

export interface PortfolioItem {
  id: string;
  symbol: string;
  shares: number;
  avgCost: number;
  lastAnalysis?: AnalysisResult;
  isAnalyzing?: boolean;
}

interface PortfolioViewProps {
  portfolio: PortfolioItem[];
  onAdd: (symbol: string, shares: number, avgCost: number) => void;
  onRemove: (id: string) => void;
}

export function PortfolioView({ portfolio, onAdd, onRemove }: PortfolioViewProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newSymbol, setNewSymbol] = useState("");
  const [newShares, setNewShares] = useState("");
  const [newCost, setNewCost] = useState("");

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (newSymbol && newShares && newCost) {
      onAdd(newSymbol.toUpperCase(), parseFloat(newShares), parseFloat(newCost));
      setNewSymbol("");
      setNewShares("");
      setNewCost("");
      setIsAdding(false);
    }
  };

  const getRecommendationColor = (rec?: string) => {
    switch (rec) {
      case "BUY": return "text-emerald-600 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-400";
      case "SELL": return "text-rose-600 bg-rose-50 border-rose-200 dark:bg-rose-950/30 dark:border-rose-800 dark:text-rose-400";
      case "HOLD": return "text-amber-600 bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-400";
      default: return "text-muted-foreground bg-muted border-border";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Your Portfolio</h2>
          <p className="text-muted-foreground">Active monitoring and AI analysis</p>
        </div>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Position
        </button>
      </div>

      <AnimatePresence>
        {isAdding && (
          <motion.form
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            onSubmit={handleAdd}
            className="bg-card border rounded-xl p-4 grid gap-4 grid-cols-1 md:grid-cols-4 items-end"
          >
            <div>
              <label className="text-xs font-medium text-muted-foreground">Symbol</label>
              <input
                type="text"
                placeholder="AAPL"
                className="w-full px-3 py-2 rounded-md border bg-background"
                value={newSymbol}
                onChange={(e) => setNewSymbol(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Shares</label>
              <input
                type="number"
                placeholder="10"
                className="w-full px-3 py-2 rounded-md border bg-background"
                value={newShares}
                onChange={(e) => setNewShares(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Avg Cost</label>
              <input
                type="number"
                placeholder="150.00"
                className="w-full px-3 py-2 rounded-md border bg-background"
                value={newCost}
                onChange={(e) => setNewCost(e.target.value)}
                required
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="px-4 py-2 border rounded-md hover:bg-muted"
              >
                Cancel
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      <div className="grid gap-4">
        {portfolio.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed rounded-xl text-muted-foreground">
            No positions yet. Add a stock to start monitoring.
          </div>
        ) : (
          portfolio.map((item) => (
            <motion.div
              key={item.id}
              layout
              className="bg-card border rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex flex-col md:flex-row justify-between gap-4">
                <div className="flex items-start justify-between md:justify-start gap-4 flex-1">
                  <div>
                    <h3 className="text-lg font-bold">{item.symbol}</h3>
                    <div className="text-sm text-muted-foreground">
                      {item.shares} shares @ ${item.avgCost.toFixed(2)}
                    </div>
                  </div>
                  
                  {item.lastAnalysis && (
                    <div className={cn(
                      "px-3 py-1 rounded-full border text-xs font-bold flex items-center gap-1",
                      getRecommendationColor(item.lastAnalysis.recommendation)
                    )}>
                      {item.lastAnalysis.recommendation === "BUY" && <TrendingUp className="w-3 h-3" />}
                      {item.lastAnalysis.recommendation === "SELL" && <TrendingDown className="w-3 h-3" />}
                      {item.lastAnalysis.recommendation === "HOLD" && <Minus className="w-3 h-3" />}
                      {item.lastAnalysis.recommendation}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-4 flex-1 justify-end">
                  {item.lastAnalysis ? (
                    <div className="text-right flex-1">
                      <div className="text-sm font-medium">
                        Target: {item.lastAnalysis.beginnerView?.action || "N/A"}
                      </div>
                      <div className="text-xs text-muted-foreground truncate max-w-[200px] ml-auto">
                        {item.lastAnalysis.beginnerView?.summary || "No summary"}
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground flex-1 text-right">
                      No analysis yet
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onRemove(item.id)}
                      className="p-2 rounded-md hover:bg-destructive/10 text-destructive transition-colors"
                      title="Remove Position"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
              
              {item.lastAnalysis?.proView?.sources && (
                <div className="mt-4 pt-4 border-t flex gap-2 overflow-x-auto pb-2">
                  {item.lastAnalysis.proView.sources.slice(0, 2).map((source, i) => (
                    <a
                      key={i}
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 whitespace-nowrap bg-muted/50 px-2 py-1 rounded"
                    >
                      <ExternalLink className="w-3 h-3" />
                      {source.title.substring(0, 30)}...
                    </a>
                  ))}
                </div>
              )}
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}

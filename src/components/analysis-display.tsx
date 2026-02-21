import * as React from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronDown, ChevronUp, ExternalLink, AlertTriangle, TrendingUp, TrendingDown, Minus, BookOpen, ShieldCheck } from "lucide-react";
import { AnalysisResult } from "@/lib/gemini";
import { cn } from "@/lib/utils";

interface AnalysisDisplayProps {
  result: AnalysisResult;
  isOwned?: boolean;
}

export function AnalysisDisplay({ result, isOwned = false }: AnalysisDisplayProps) {
  const [showPro, setShowPro] = React.useState(false);
  const displayRecommendation = isOwned ? result.recommendation : "BUY";

  const getRecommendationColor = (rec: string) => {
    switch (rec) {
      case "BUY": return "text-emerald-600 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-400";
      case "SELL": return "text-rose-600 bg-rose-50 border-rose-200 dark:bg-rose-950/30 dark:border-rose-800 dark:text-rose-400";
      case "WATCH": return "text-blue-600 bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800 dark:text-blue-400";
      case "AVOID": return "text-orange-600 bg-orange-50 border-orange-200 dark:bg-orange-950/30 dark:border-orange-800 dark:text-orange-400";
      default: return "text-zinc-600 bg-zinc-100 border-zinc-200 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-300"; // Changed from amber to zinc
    }
  };

  const getRecommendationIcon = (rec: string) => {
    switch (rec) {
      case "BUY": return TrendingUp;
      case "SELL": return TrendingDown;
      case "WATCH": return BookOpen;
      case "AVOID": return AlertTriangle;
      default: return Minus;
    }
  };

  const RecIcon = getRecommendationIcon(displayRecommendation);
  const technicalIndicators = result.proView?.technicalIndicators || [];
  const fundamentalRatios = result.proView?.fundamentalRatios || [];
  const historicalCorrelations = result.proView?.historicalCorrelations || [];
  const sources = result.proView?.sources || [];

  return (
    <div className="w-full space-y-4">
      {/* Header Card */}
      <div className={cn(
        "bg-card border rounded-xl p-6 shadow-sm transition-all",
        result.isUrgent && "border-destructive/50 shadow-destructive/20 ring-1 ring-destructive/20"
      )}>
        {/* Urgent banner removed per user request */}

        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              {result.symbol}
              <span className="text-sm font-normal text-muted-foreground bg-muted px-2 py-1 rounded-md">
                ${Number.isFinite(result.price) && result.price > 0 ? result.price.toFixed(2) : "N/A"}
              </span>
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Analyzed at {new Date(result.timestamp).toLocaleTimeString()}
            </p>
          </div>
          <div className={cn(
            "flex flex-col items-center px-4 py-2 rounded-lg border",
            getRecommendationColor(displayRecommendation)
          )}>
            <span className="text-xs font-bold uppercase tracking-wider opacity-80">Recommendation</span>
            <div className="flex items-center gap-1">
              <RecIcon className="w-5 h-5" />
              <span className="text-xl font-black tracking-tight">{displayRecommendation}</span>
            </div>
          </div>
        </div>

        {/* Beginner View */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-muted/30 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                Summary
              </h3>
              <p className="text-sm leading-relaxed">
                {result.beginnerView?.summary || "No summary available."}
              </p>
            </div>
            
            <div className="bg-muted/30 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" />
                Recommended Action
              </h3>
              <p className="text-sm font-medium leading-relaxed">
                {result.beginnerView?.action || "No action recommended."}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 text-sm font-medium">
            <span className="text-muted-foreground">Confidence:</span>
            <div className="h-2 w-24 bg-secondary rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary" 
                style={{ width: `${result.confidence}%` }}
              />
            </div>
            <span>{result.confidence}%</span>
          </div>
        </div>
      </div>

      {/* Pro View Toggle */}
      <div className="border rounded-xl overflow-hidden bg-card shadow-sm">
        <button
          onClick={() => setShowPro(!showPro)}
          className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="font-semibold">Pro Analysis</span>
            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">Institutional Grade</span>
          </div>
          {showPro ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        <AnimatePresence>
          {showPro && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-t bg-muted/10"
            >
              <div className="p-6 space-y-6">
                {/* Thesis */}
                <div>
                  <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-2">Investment Thesis</h4>
                  <p className="text-sm leading-relaxed whitespace-pre-line">
                    {result.proView?.thesis || "Detailed thesis not available."}
                  </p>
                </div>

                {/* Grid of Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-2">Technical Indicators</h4>
                    <ul className="space-y-1">
                      {technicalIndicators.length > 0 ? technicalIndicators.map((item, i) => (
                        <li key={i} className="text-sm flex items-start gap-2">
                          <span className="text-primary mt-1.5">•</span>
                          {item}
                        </li>
                      )) : (
                        <li className="text-sm text-muted-foreground italic">
                          No technical indicator details were provided.
                        </li>
                      )}
                    </ul>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-2">Fundamental Ratios</h4>
                    <ul className="space-y-1">
                      {fundamentalRatios.length > 0 ? fundamentalRatios.map((item, i) => (
                        <li key={i} className="text-sm flex items-start gap-2">
                          <span className="text-primary mt-1.5">•</span>
                          {item}
                        </li>
                      )) : (
                        <li className="text-sm text-muted-foreground italic">
                          No fundamental ratio details were provided.
                        </li>
                      )}
                    </ul>
                  </div>
                </div>

                {/* Historical Correlations */}
                <div>
                  <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-2">Historical Correlations</h4>
                  <div className="bg-background border rounded-lg p-4">
                    <ul className="space-y-2">
                      {historicalCorrelations.length > 0 ? historicalCorrelations.map((item, i) => (
                        <li key={i} className="text-sm flex items-start gap-2 text-muted-foreground">
                          <BookOpen className="w-4 h-4 shrink-0 mt-0.5" />
                          {item}
                        </li>
                      )) : (
                        <li className="text-sm text-muted-foreground italic">
                          No historical correlation details were provided.
                        </li>
                      )}
                    </ul>
                  </div>
                </div>

                {/* Sources - Radical Transparency */}
                <div>
                  <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4" />
                    Verified Sources
                  </h4>
                  {sources.length > 0 ? (
                    <div className="grid gap-2">
                      {sources.map((source, i) => (
                      <a 
                        key={i} 
                        href={source.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center justify-between p-3 rounded-lg border bg-background hover:bg-muted/50 transition-colors group"
                      >
                        <div className="flex flex-col">
                          <span className="text-sm font-medium group-hover:underline decoration-primary/50 underline-offset-4">
                            {source.title}
                          </span>
                          {source.timestamp && (
                            <span className="text-xs text-muted-foreground">{source.timestamp}</span>
                          )}
                        </div>
                        <ExternalLink className="w-3 h-3 text-muted-foreground group-hover:text-primary" />
                      </a>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground italic">
                      No verified sources were provided for this run.
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

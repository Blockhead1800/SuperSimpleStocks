import * as React from "react";
import { motion } from "motion/react";
import { ExternalLink, AlertTriangle, TrendingUp, TrendingDown, Minus, BookOpen, ShieldCheck, RefreshCcw } from "lucide-react";
import { AnalysisResult } from "@/lib/gemini";
import { cn } from "@/lib/utils";

interface AnalysisDisplayProps {
  result: AnalysisResult;
  isOwned?: boolean;
}

export function AnalysisDisplay({ result, isOwned = false }: AnalysisDisplayProps) {
  const [showAdvanced, setShowAdvanced] = React.useState(false);
  const displayRecommendation = isOwned ? result.recommendation : "BUY";

  React.useEffect(() => {
    setShowAdvanced(false);
  }, [result.symbol]);

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
  const technicalPreview = technicalIndicators.slice(0, 2);
  const fundamentalPreview = fundamentalRatios.slice(0, 2);
  const historicalPreview = historicalCorrelations.slice(0, 2);
  const sourcesPreview = sources.slice(0, 2);
  const liveDataQuality = result.liveData?.quality;
  const liveDataTimestamp = result.liveData?.snapshotTime;

  return (
    <div className="w-full">
      <div className="relative h-[min(62vh,560px)] min-h-[320px] [perspective:1600px]">
        <motion.div
          className="relative h-full w-full [transform-style:preserve-3d]"
          animate={{ rotateY: showAdvanced ? 180 : 0 }}
          transition={{ duration: 0.45, ease: "easeInOut" }}
        >
          {/* Front: Simple View */}
          <div className={cn(
            "absolute inset-0 [backface-visibility:hidden] bg-card border rounded-xl p-4 sm:p-5 shadow-sm",
            "flex flex-col gap-3 overflow-hidden",
            result.isUrgent && "border-destructive/50 shadow-destructive/20 ring-1 ring-destructive/20"
          )}>
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
                  {result.symbol}
                  <span className="text-xs sm:text-sm font-normal text-muted-foreground bg-muted px-2 py-1 rounded-md">
                    ${Number.isFinite(result.price) && result.price > 0 ? result.price.toFixed(2) : "N/A"}
                  </span>
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                  Updated {new Date(result.timestamp).toLocaleTimeString()}
                </p>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto">
                <div className={cn(
                  "flex flex-col items-center px-3 py-1.5 rounded-lg border",
                  getRecommendationColor(displayRecommendation)
                )}>
                  <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">SSS Call</span>
                  <div className="flex items-center gap-1">
                    <RecIcon className="w-4 h-4" />
                    <span className="text-base font-black tracking-tight">{displayRecommendation}</span>
                  </div>
                </div>
                <button
                  onClick={() => setShowAdvanced(true)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-2 rounded-md border text-xs font-medium hover:bg-muted transition-colors"
                  title="Flip card to advanced analysis"
                >
                  Advanced
                  <RefreshCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 flex-1 min-h-0">
              <div className="bg-muted/30 p-3 rounded-lg min-h-0">
                <h3 className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5" />
                  Summary
                </h3>
                <p className="text-xs sm:text-sm leading-relaxed overflow-hidden [display:-webkit-box] [-webkit-line-clamp:8] [-webkit-box-orient:vertical]">
                  {result.beginnerView?.summary || "No summary available."}
                </p>
              </div>

              <div className="bg-muted/30 p-3 rounded-lg min-h-0">
                <h3 className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Recommended Action
                </h3>
                <p className="text-xs sm:text-sm font-medium leading-relaxed overflow-hidden [display:-webkit-box] [-webkit-line-clamp:8] [-webkit-box-orient:vertical]">
                  {result.beginnerView?.action || "No action recommended."}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 text-xs sm:text-sm font-medium">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Confidence</span>
                <div className="h-2 w-24 bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary"
                    style={{ width: `${result.confidence}%` }}
                  />
                </div>
                <span>{result.confidence}%</span>
              </div>
              {liveDataQuality && (
                <span className={cn(
                  "inline-flex items-center px-2 py-1 rounded-md border text-[10px] sm:text-xs",
                  liveDataQuality === "unavailable"
                    ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800"
                    : "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800"
                )}>
                  {liveDataQuality === "unavailable" ? "Reduced context" : "Live data"}
                  {liveDataTimestamp ? ` • ${new Date(liveDataTimestamp).toLocaleTimeString()}` : ""}
                </span>
              )}
            </div>
          </div>

          {/* Back: Advanced View */}
          <div className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)] bg-card border rounded-xl p-4 sm:p-5 shadow-sm flex flex-col gap-3 overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h3 className="text-base sm:text-lg font-semibold">Advanced Analysis</h3>
                <p className="text-xs text-muted-foreground">Deeper research for {result.symbol}</p>
              </div>
              <button
                onClick={() => setShowAdvanced(false)}
                className="inline-flex items-center gap-1.5 px-2.5 py-2 rounded-md border text-xs font-medium hover:bg-muted transition-colors"
                title="Flip card back to simple analysis"
              >
                Simple
                <RefreshCcw className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="bg-muted/20 border rounded-lg p-3 min-h-0">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                    Investment Thesis
                  </h4>
                  <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-line overflow-hidden [display:-webkit-box] [-webkit-line-clamp:18] [-webkit-box-orient:vertical]">
                    {result.proView?.thesis || "Detailed reasoning is not available yet."}
                  </p>
                </div>

                <div className="space-y-2 min-h-0">
                  <div className="bg-muted/20 border rounded-lg p-3">
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Technical</h4>
                    <ul className="space-y-1">
                      {technicalPreview.length > 0 ? technicalPreview.map((item, i) => (
                        <li key={i} className="text-xs sm:text-sm text-muted-foreground overflow-hidden [display:-webkit-box] [-webkit-line-clamp:2] [-webkit-box-orient:vertical]">
                          • {item}
                        </li>
                      )) : (
                        <li className="text-xs text-muted-foreground italic">No technical details yet.</li>
                      )}
                    </ul>
                  </div>

                  <div className="bg-muted/20 border rounded-lg p-3">
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Fundamentals</h4>
                    <ul className="space-y-1">
                      {fundamentalPreview.length > 0 ? fundamentalPreview.map((item, i) => (
                        <li key={i} className="text-xs sm:text-sm text-muted-foreground overflow-hidden [display:-webkit-box] [-webkit-line-clamp:2] [-webkit-box-orient:vertical]">
                          • {item}
                        </li>
                      )) : (
                        <li className="text-xs text-muted-foreground italic">No fundamental details yet.</li>
                      )}
                    </ul>
                  </div>

                  <div className="bg-muted/20 border rounded-lg p-3">
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">History</h4>
                    <ul className="space-y-1">
                      {historicalPreview.length > 0 ? historicalPreview.map((item, i) => (
                        <li key={i} className="text-xs sm:text-sm text-muted-foreground overflow-hidden [display:-webkit-box] [-webkit-line-clamp:2] [-webkit-box-orient:vertical]">
                          • {item}
                        </li>
                      )) : (
                        <li className="text-xs text-muted-foreground italic">No historical details yet.</li>
                      )}
                    </ul>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Verified Sources
                </h4>
                {sourcesPreview.length > 0 ? (
                  <div className="grid gap-1.5">
                    {sourcesPreview.map((source, i) => (
                      <a
                        key={i}
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between p-2 rounded-md border bg-background hover:bg-muted/50 transition-colors group"
                      >
                        <span className="text-xs sm:text-sm font-medium overflow-hidden [display:-webkit-box] [-webkit-line-clamp:1] [-webkit-box-orient:vertical]">
                          {source.title}
                        </span>
                        <ExternalLink className="w-3 h-3 text-muted-foreground group-hover:text-primary shrink-0" />
                      </a>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground italic">No verified sources were included in this run.</div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

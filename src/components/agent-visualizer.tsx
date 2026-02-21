import * as React from "react";
import { CheckCircle2, Loader2, Search, BookOpen, ShieldCheck, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { AgentStatus } from "@/lib/gemini";

interface AgentVisualizerProps {
  status: AgentStatus;
}

export function AgentVisualizer({ status }: AgentVisualizerProps) {
  const steps = [
    { id: "gathering", label: "Step 1: Gather", icon: Search, description: "Market data + recent headlines" },
    { id: "historian", label: "Step 2: Compare", icon: BookOpen, description: "Check similar past patterns" },
    { id: "auditing", label: "Step 3: Verify", icon: ShieldCheck, description: "Cross-check claims + sources" },
    { id: "synthesizing", label: "Step 4: Build", icon: FileText, description: "Create final stock plan" },
  ];

  const getCurrentStepIndex = () => {
    if (status === "idle") return -1;
    if (status === "complete") return 4;
    return steps.findIndex(s => s.id === status);
  };

  const currentIndex = getCurrentStepIndex();

  return (
    <div className="w-full bg-card border rounded-xl p-4 shadow-sm">
      <h3 className="text-sm font-semibold mb-3">Agent Progress</h3>
      <div className="space-y-3">
        {steps.map((step, index) => {
          const isActive = index === currentIndex;
          const isCompleted = index < currentIndex;

          return (
            <div key={step.id} className="relative flex items-start gap-3">
              {/* Connector Line */}
              {index !== steps.length - 1 && (
                <div className={cn(
                  "absolute left-[13px] top-7 w-0.5 h-7 -z-10 transition-colors duration-500",
                  isCompleted ? "bg-primary" : "bg-muted"
                )} />
              )}

              <div className={cn(
                "w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-colors duration-300",
                isActive ? "bg-primary text-primary-foreground" :
                isCompleted ? "bg-primary text-primary-foreground" :
                "bg-muted text-muted-foreground"
              )}>
                {isActive ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : isCompleted ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  <step.icon className="w-3.5 h-3.5" />
                )}
              </div>

              <div className="flex-1 pt-0.5 min-w-0">
                <div className="flex justify-between items-center">
                  <h4 className={cn(
                    "font-medium text-xs transition-colors",
                    isActive ? "text-primary" : 
                    isCompleted ? "text-foreground" : 
                    "text-muted-foreground"
                  )}>
                    {step.label}
                  </h4>
                  {isActive && (
                    <span className="text-[10px] text-primary animate-pulse font-medium">Working</span>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5 overflow-hidden [display:-webkit-box] [-webkit-line-clamp:1] [-webkit-box-orient:vertical]">
                  {step.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

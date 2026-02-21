import * as React from "react";
import { motion, AnimatePresence } from "motion/react";
import { CheckCircle2, Circle, Loader2, Search, BookOpen, ShieldCheck, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { AgentStatus } from "@/lib/gemini";

interface AgentVisualizerProps {
  status: AgentStatus;
}

export function AgentVisualizer({ status }: AgentVisualizerProps) {
  const steps = [
    { id: "gathering", label: "Step 1: Gather Data", icon: Search, description: "Checking live price action and news..." },
    { id: "historian", label: "Step 2: Compare History", icon: BookOpen, description: "Looking for similar past setups..." },
    { id: "auditing", label: "Step 3: Verify Facts", icon: ShieldCheck, description: "Validating claims with trusted sources..." },
    { id: "synthesizing", label: "Step 4: Build a Plan", icon: FileText, description: "Creating a simple, clear stock view..." },
  ];

  const getCurrentStepIndex = () => {
    if (status === "idle") return -1;
    if (status === "complete") return 4;
    return steps.findIndex(s => s.id === status);
  };

  const currentIndex = getCurrentStepIndex();

  return (
    <div className="w-full bg-card border rounded-xl p-6 shadow-sm">
      <h3 className="text-lg font-semibold mb-4">Super Simple Stocks Analysis Steps</h3>
      <div className="space-y-6">
        {steps.map((step, index) => {
          const isActive = index === currentIndex;
          const isCompleted = index < currentIndex;
          const isPending = index > currentIndex;

          return (
            <div key={step.id} className="relative flex items-start gap-4">
              {/* Connector Line */}
              {index !== steps.length - 1 && (
                <div className={cn(
                  "absolute left-[15px] top-8 w-0.5 h-12 -z-10 transition-colors duration-500",
                  isCompleted ? "bg-primary" : "bg-muted"
                )} />
              )}

              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors duration-300",
                isActive ? "bg-primary text-primary-foreground" :
                isCompleted ? "bg-primary text-primary-foreground" :
                "bg-muted text-muted-foreground"
              )}>
                {isActive ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : isCompleted ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : (
                  <step.icon className="w-4 h-4" />
                )}
              </div>

              <div className="flex-1 pt-1">
                <div className="flex justify-between items-center">
                  <h4 className={cn(
                    "font-medium text-sm transition-colors",
                    isActive ? "text-primary" : 
                    isCompleted ? "text-foreground" : 
                    "text-muted-foreground"
                  )}>
                    {step.label}
                  </h4>
                  {isActive && (
                    <span className="text-xs text-primary animate-pulse font-medium">Working...</span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {step.description}
                </p>
                
                <AnimatePresence>
                  {isActive && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-2 text-xs bg-muted/50 p-2 rounded border border-border font-mono"
                    >
                      <span className="text-primary">Step_{index + 1}</span>: Reviewing market data...
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

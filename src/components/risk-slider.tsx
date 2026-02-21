import * as React from "react";
import { cn } from "@/lib/utils";
import { motion } from "motion/react";

interface RiskSliderProps {
  value: number;
  onChange: (value: number) => void;
  className?: string;
  disabled?: boolean;
}

export function RiskSlider({ value, onChange, className, disabled }: RiskSliderProps) {
  const labels = ["Conservative", "Moderate", "Aggressive"];
  
  return (
    <div className={cn("w-full space-y-4", className)}>
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium text-muted-foreground">Risk Tolerance</span>
        <span className={cn(
          "text-sm font-bold px-2 py-1 rounded-md transition-colors",
          value < 33 ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400" :
          value < 66 ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400" :
          "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400"
        )}>
          {value < 33 ? labels[0] : value < 66 ? labels[1] : labels[2]} ({value}%)
        </span>
      </div>
      
      <div className="relative h-6 w-full flex items-center">
        <div className="absolute w-full h-2 bg-secondary rounded-full overflow-hidden">
          <motion.div 
            className={cn(
              "h-full rounded-full",
              value < 33 ? "bg-emerald-500" :
              value < 66 ? "bg-amber-500" :
              "bg-rose-500"
            )}
            initial={{ width: 0 }}
            animate={{ width: `${value}%` }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          />
        </div>
        <input
          type="range"
          min="0"
          max="100"
          step="1"
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value))}
          disabled={disabled}
          className="absolute w-full h-full opacity-0 cursor-pointer z-10"
          aria-label="Risk Tolerance Slider"
        />
        <motion.div
          className="absolute h-6 w-6 bg-background border-2 border-primary rounded-full shadow-md pointer-events-none z-0 flex items-center justify-center"
          animate={{ left: `calc(${value}% - 12px)` }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          <div className="w-2 h-2 bg-primary rounded-full" />
        </motion.div>
      </div>
      
      <div className="flex justify-between text-xs text-muted-foreground px-1">
        <span>Safe</span>
        <span>Balanced</span>
        <span>High Growth</span>
      </div>
    </div>
  );
}

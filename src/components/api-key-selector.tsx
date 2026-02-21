import * as React from "react";
import { motion } from "motion/react";
import { ShieldAlert, Key } from "lucide-react";

interface ApiKeySelectorProps {
  onKeySelected: () => void;
}

export function ApiKeySelector({ onKeySelected }: ApiKeySelectorProps) {
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleConnect = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // @ts-ignore - aistudio is injected by the platform
      if (window.aistudio && window.aistudio.openSelectKey) {
        // @ts-ignore
        await window.aistudio.openSelectKey();
        
        // Check if key was actually selected
        // @ts-ignore
        const hasKey = await window.aistudio.hasSelectedApiKey();
        if (hasKey) {
          onKeySelected();
        } else {
          // This might happen if user closed dialog without selecting
          setError("No API key selected. Please try again.");
        }
      } else {
        setError("AI Studio environment not detected. Are you running in the preview?");
      }
    } catch (err) {
      console.error("Failed to select key:", err);
      setError("Failed to connect API key. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-card border rounded-2xl shadow-xl max-w-md w-full p-8 text-center"
      >
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <Key className="w-8 h-8 text-primary" />
        </div>
        
        <h2 className="text-2xl font-bold mb-3">Connect Super Simple Stocks</h2>
        <p className="text-muted-foreground mb-8">
          Connect your Gemini API key now. You can also add a Finnhub key in Settings for stronger live market data.
        </p>

        {error && (
          <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg mb-6 flex items-center gap-2 justify-center">
            <ShieldAlert className="w-4 h-4" />
            {error}
          </div>
        )}

        <button
          onClick={handleConnect}
          disabled={isLoading}
          className="w-full py-3 px-4 bg-primary text-primary-foreground font-medium rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isLoading ? "Connecting..." : "Choose API Key"}
        </button>
        
        <p className="text-xs text-muted-foreground mt-6">
          <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="underline hover:text-primary">
            Learn more about Gemini API billing
          </a>
        </p>
      </motion.div>
    </div>
  );
}

import { useState } from 'react';
import { ExternalLink, HelpCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { SolanaWalletButton } from '@/components/SolanaWalletButton';

interface X402PanelProps {
  onClose: () => void;
}

export function X402Panel({ onClose }: X402PanelProps) {
  const [showHelp, setShowHelp] = useState(false);

  return (
    <>
      <div className="mt-3 p-3 rounded-lg bg-secondary/50 border border-border/50 animate-in slide-in-from-top-2 duration-200">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-medium">x402 Payments</p>
          <button
            onClick={() => setShowHelp(true)}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <HelpCircle className="h-3.5 w-3.5" />
          </button>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          Connect your Solana wallet to enable instant payments
        </p>
        
        <div className="space-y-2">
          <div className="flex justify-center">
            <SolanaWalletButton variant="panel" />
          </div>
        </div>
      </div>

      {/* How it works modal */}
      <Dialog open={showHelp} onOpenChange={setShowHelp}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>How x402 Works</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            <p className="text-muted-foreground">
              x402 enables instant micropayments using the Solana blockchain. Connect your wallet to pay per prompt without needing to top up your balance first.
            </p>
            <div className="space-y-3">
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">1</div>
                <p className="text-muted-foreground flex-1">Connect your Phantom or Solflare wallet</p>
              </div>
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">2</div>
                <p className="text-muted-foreground flex-1">Approve payments when you send prompts</p>
              </div>
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">3</div>
                <p className="text-muted-foreground flex-1">Pay only for what you use, no minimums</p>
              </div>
            </div>
            <a 
              href="#" 
              className="inline-flex items-center gap-1 text-primary text-sm hover:underline"
            >
              Learn more <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
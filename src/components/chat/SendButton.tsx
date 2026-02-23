import { ArrowUp, Square } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatPrice } from '@/lib/pricing';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface SendButtonProps {
  price: number;
  breakdown: string;
  hasContent: boolean;
  disabled?: boolean;
  isGenerating?: boolean;
  onClick: () => void;
  onStop?: () => void;
}

export function SendButton({ price, breakdown, hasContent, disabled, isGenerating, onClick, onStop }: SendButtonProps) {
  // Determine glow intensity based on price
  const getGlowClass = () => {
    if (!hasContent || isGenerating) return '';
    if (price < 0.01) return 'glow-sm';
    if (price < 0.05) return 'glow-md';
    if (price < 0.5) return 'glow-lg';
    return 'glow-intense';
  };

  const handleClick = () => {
    if (isGenerating && onStop) {
      onStop();
    } else {
      onClick();
    }
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={handleClick}
          disabled={disabled && !isGenerating}
          className={cn(
            "flex items-center justify-center gap-2 rounded-xl transition-all duration-300 ease-out",
            isGenerating ? [
              "bg-destructive/90 text-destructive-foreground hover:bg-destructive",
              "h-10 w-10",
            ] : [
              "bg-primary text-primary-foreground",
              "hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed",
              hasContent ? "h-10 px-3 min-w-[72px]" : "h-10 w-10",
              getGlowClass(),
            ]
          )}
        >
          {isGenerating ? (
            <Square className="h-4 w-4 flex-shrink-0 fill-current" />
          ) : (
            <>
              <ArrowUp className="h-4 w-4 flex-shrink-0" />
              {hasContent && price > 0 && (
                <span className="text-xs font-medium whitespace-nowrap animate-in fade-in slide-in-from-left-2 duration-200">
                  {formatPrice(price)}
                </span>
              )}
            </>
          )}
        </button>
      </TooltipTrigger>
      {(hasContent || isGenerating) && (
        <TooltipContent side="top" className="max-w-xs">
          <p className="text-xs">{isGenerating ? 'Click to stop generation' : breakdown}</p>
        </TooltipContent>
      )}
    </Tooltip>
  );
}
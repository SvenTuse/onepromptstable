import { CreditCard, Wallet } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type PaymentButtonSize = "default" | "sm" | "lg" | "icon" | "xs";

interface PaymentMethodButtonsProps {
  className?: string;
  size?: PaymentButtonSize;
  cardLabel?: string;
  x402Label?: string;
  fill?: boolean;
  onCardClick?: () => void;
  onX402Click?: () => void;
}

function SparkleEffect() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      <span className="absolute w-1 h-1 bg-white rounded-full animate-sparkle-1 top-1 right-2 opacity-0" />
      <span className="absolute w-0.5 h-0.5 bg-white rounded-full animate-sparkle-2 top-3 right-4 opacity-0" />
      <span className="absolute w-1 h-1 bg-white rounded-full animate-sparkle-3 bottom-1 left-3 opacity-0" />
      <span className="absolute w-0.5 h-0.5 bg-white rounded-full animate-sparkle-4 top-2 left-2 opacity-0" />
    </div>
  );
}

export function PaymentMethodButtons({
  className,
  size = "sm",
  cardLabel = "Card",
  x402Label = "x402",
  fill = false,
  onCardClick,
  onX402Click,
}: PaymentMethodButtonsProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Button
        type="button"
        variant="champagne-solid"
        size={size}
        className={cn("gap-1.5", fill && "flex-1")}
        onClick={onCardClick}
      >
        <CreditCard className="h-3.5 w-3.5" />
        {cardLabel}
      </Button>

      <Button
        type="button"
        variant="dark-sparkle"
        size={size}
        className={cn("gap-1.5", fill && "flex-1")}
        onClick={onX402Click}
      >
        <SparkleEffect />
        <Wallet className="h-3.5 w-3.5" />
        {x402Label}
      </Button>
    </div>
  );
}

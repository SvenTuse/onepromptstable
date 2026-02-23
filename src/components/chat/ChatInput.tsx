import { useState, useRef, useEffect, useCallback } from 'react';
import { Paperclip, Mic, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ModeSelector } from './ModeSelector';
import { SendButton } from './SendButton';
import { AttachmentChip, Attachment } from './AttachmentChip';
import { GenerationMode, calculatePrice, estimateTokens, MODE_PRICING } from '@/lib/pricing';
import { cn } from '@/lib/utils';
import { PaymentMethodButtons } from '@/components/payments/PaymentMethodButtons';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { TopUpModal } from '@/components/profile/TopUpModal';
import { X402Panel } from '@/components/profile/X402Panel';
import { useSolanaPayment } from '@/contexts/SolanaPaymentContext';
interface ChatInputProps {
  onSend: (message: string, mode: GenerationMode, attachments: Attachment[], cost: number) => boolean | Promise<boolean>;
  balance: number;
  disabled?: boolean;
  notice?: string;
  isGenerating?: boolean;
  onStopGeneration?: () => void;
}

export function ChatInput({ onSend, balance, disabled, notice, isGenerating, onStopGeneration }: ChatInputProps) {
  const { walletAddress, usdcBalance } = useSolanaPayment();
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<GenerationMode>('default');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [modeOpen, setModeOpen] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [maxMode, setMaxMode] = useState(false);
  const [showTopUp, setShowTopUp] = useState(false);
  const [showX402, setShowX402] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Calculate attachment tokens
  const attachmentTokens = attachments.reduce((sum, a) => sum + a.tokenEstimate, 0);
  
  // Debounced price calculation
  const [priceInfo, setPriceInfo] = useState(() => calculatePrice('', mode, 0, false));
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setPriceInfo(calculatePrice(input, mode, attachmentTokens, (mode === 'reasoning' || mode === 'data-analytics' || mode === 'code') && maxMode));
    }, 150);
    return () => clearTimeout(timer);
  }, [input, mode, attachmentTokens, maxMode]);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  }, [input]);

  const hasContent = input.trim().length > 0 || attachments.length > 0;
  // Payment priority: allow send if Solana wallet can cover OR internal balance can cover (or free mode)
  const canPayWithSolana = !!(walletAddress && usdcBalance >= priceInfo.price);
  const canPayWithBalance = balance >= priceInfo.price;
  const canPay = priceInfo.price === 0 || canPayWithSolana || canPayWithBalance;
  const insufficientBalance = !canPay;
  const needsConfirmation = priceInfo.price > MODE_PRICING[mode].confirmationThreshold;

  const handleSend = useCallback(async () => {
    if (!hasContent || insufficientBalance || disabled) return;

    if (needsConfirmation && !showConfirm) {
      setShowConfirm(true);
      return;
    }

    // reasoning UI mode maps to 'simple' or 'max' for the backend
    const backendMode =
      mode === 'reasoning'      ? (maxMode ? 'max'                  : 'simple')               :
      mode === 'data-analytics' ? (maxMode ? 'data-analytics-max'   : 'data-analytics-simple') :
      mode === 'code'           ? (maxMode ? 'code-max'             : 'code-simple')           :
      mode === 'deep-research'  ? (maxMode ? 'deep-research-max'    : 'deep-research-simple') :
      mode;

    // Clear input immediately when sending (before async operation completes)
    const messageToSend = input;
    const attachmentsToSend = [...attachments];
    setInput('');
    setAttachments([]);
    setShowConfirm(false);

    // Send message asynchronously
    const result = onSend(messageToSend, backendMode as GenerationMode, attachmentsToSend, priceInfo.price);
    const accepted = result instanceof Promise ? await result : result;
    
    // If send failed, restore input (optional - you might want to keep it cleared)
    if (!accepted) {
      // Optionally restore input on failure:
      // setInput(messageToSend);
      // setAttachments(attachmentsToSend);
    }
  }, [input, mode, maxMode, attachments, hasContent, insufficientBalance, disabled, needsConfirmation, showConfirm, priceInfo.price, onSend]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newAttachments: Attachment[] = files.map(file => ({
      id: Math.random().toString(36).slice(2),
      name: file.name,
      type: file.type,
      size: file.size,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
      tokenEstimate: Math.round(file.size / 4), // Rough estimate
    }));
    setAttachments(prev => [...prev, ...newAttachments]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachment = (id: string) => {
    setAttachments(prev => prev.filter(a => a.id !== id));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="relative">
      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="absolute bottom-full left-0 right-0 mb-2 p-3 rounded-xl glass-strong shadow-lg animate-in slide-in-from-bottom-2 duration-200">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">Confirm — charge ${priceInfo.price.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground mt-0.5">This prompt exceeds the confirmation threshold</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowConfirm(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={async () => {
                const confirmBackendMode =
                  mode === 'reasoning'      ? (maxMode ? 'max'                  : 'simple')               :
                  mode === 'data-analytics' ? (maxMode ? 'data-analytics-max'   : 'data-analytics-simple') :
                  mode === 'code'           ? (maxMode ? 'code-max'             : 'code-simple')           :
                  mode;
                const result = onSend(input, confirmBackendMode as GenerationMode, attachments, priceInfo.price);
                const accepted = result instanceof Promise ? await result : result;
                if (accepted) {
                  setInput('');
                  setAttachments([]);
                  setShowConfirm(false);
                }
              }}>
                Confirm
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Input Notice */}
      {notice && (
        <div
          className={cn(
            "absolute bottom-full left-0 right-0 mb-2",
            "p-3 rounded-xl glass-strong shadow-lg border border-border/50",
            "animate-fade-in"
          )}
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-foreground leading-snug">
              {notice}
            </p>
            <PaymentMethodButtons
              className="shrink-0"
              cardLabel="Card"
              x402Label="x402"
              size="sm"
              onCardClick={() => setShowTopUp(true)}
              onX402Click={() => setShowX402(true)}
            />
          </div>
          
          {/* x402 Panel inline */}
          {showX402 && (
            <div className="mt-3">
              <X402Panel onClose={() => setShowX402(false)} />
            </div>
          )}
        </div>
      )}

      {/* Insufficient Balance Warning */}
      {insufficientBalance && hasContent && (
        <div className="absolute bottom-full left-0 right-0 mb-2 p-2 rounded-lg bg-destructive/10 border border-destructive/20 text-center">
          <p className="text-xs text-destructive">
            Insufficient balance. Please top up to continue.
          </p>
        </div>
      )}

      {/* Attachments */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {attachments.map(attachment => (
            <AttachmentChip
              key={attachment.id}
              attachment={attachment}
              onRemove={() => removeAttachment(attachment.id)}
            />
          ))}
        </div>
      )}

      {/* Input Container */}
      <div className={cn(
        "flex items-end gap-2 p-2 rounded-2xl glass-strong",
        "border border-border/50 shadow-lg",
        "transition-shadow duration-300",
        hasContent && "glow-sm"
      )}>
        {/* Attachment Button */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileSelect}
        />
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 flex-shrink-0 text-muted-foreground hover:text-foreground"
          onClick={() => fileInputRef.current?.click()}
        >
          <Paperclip className="h-5 w-5" />
        </Button>

        {/* Mode Selector */}
        <ModeSelector
          mode={mode}
          onModeChange={setMode}
          open={modeOpen}
          onOpenChange={setModeOpen}
        />

        {/* Text Input */}
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={`Message Oneprompt AI (${MODE_PRICING[mode].label})`}
          className={cn(
            "flex-1 min-h-[36px] max-h-[200px] py-2 px-1",
            "bg-transparent border-none outline-none resize-none",
            "text-sm placeholder:text-muted-foreground",
            "scrollbar-thin"
          )}
          rows={1}
          disabled={disabled}
        />

        {/* Voice Input */}
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 flex-shrink-0 text-muted-foreground hover:text-foreground"
        >
          <Mic className="h-5 w-5" />
        </Button>

        {/* Send Button */}
        <SendButton
          price={priceInfo.price}
          breakdown={priceInfo.breakdown}
          hasContent={hasContent}
          disabled={disabled || insufficientBalance}
          isGenerating={isGenerating}
          onClick={handleSend}
          onStop={onStopGeneration}
        />
      </div>

      {/* MAX Mode toggle - only for specific modes */}
      {(mode === 'reasoning' || mode === 'data-analytics' || mode === 'code') && (
        <div className="flex items-center gap-2 mt-2 ml-2">
          <TooltipProvider>
            <div className="flex items-center gap-2">
              <Switch
                id="max-mode"
                checked={maxMode}
                onCheckedChange={setMaxMode}
              />
              <label 
                htmlFor="max-mode" 
                className="text-xs font-medium text-muted-foreground cursor-pointer"
              >
                MAX Mode
              </label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[250px]">
                  <p className="text-xs">
                    Enable MAX Mode to use the best available LLM models on the market. The price will be increased accordingly.
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
          </TooltipProvider>
        </div>
      )}

      {/* Mode indicator */}
      {mode !== 'default' && (
        <div className="flex justify-center mt-2">
        <span className="text-xs text-muted-foreground">
          Using {MODE_PRICING[mode].label} mode{maxMode && ' (MAX)'}
        </span>
      </div>
    )}

    {/* Top Up Modal */}
    <TopUpModal
      open={showTopUp}
      onOpenChange={setShowTopUp}
      onTopUp={() => {}}
    />
  </div>
);
}
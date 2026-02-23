import { 
  MessageSquare, 
  Brain, 
  BarChart3, 
  Image, 
  Video, 
  Search,
  Check,
  Zap,
  Sparkles,
  Code2
} from 'lucide-react';
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { GenerationMode, MODE_PRICING } from '@/lib/pricing';
import { cn } from '@/lib/utils';

const ICONS: Record<string, React.ElementType> = {
  MessageSquare,
  Brain,
  BarChart3,
  Image,
  Video,
  Search,
  Zap,
  Sparkles,
  Code2,
};

interface ModeSelectorProps {
  mode: GenerationMode;
  onModeChange: (mode: GenerationMode) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ModeSelector({ mode, onModeChange, open, onOpenChange }: ModeSelectorProps) {
  const modes = Object.values(MODE_PRICING);

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-9 w-9 text-muted-foreground hover:text-foreground"
        >
          <Plus className="h-5 w-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        align="start" 
        className="w-80 p-2"
        sideOffset={8}
      >
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground px-2 py-1.5">
            Generation Mode
          </p>
          {modes.map((modeConfig) => {
            const Icon = ICONS[modeConfig.icon] || MessageSquare;
            const isActive = mode === modeConfig.mode;
            
            return (
              <button
                key={modeConfig.mode}
                onClick={() => {
                  onModeChange(modeConfig.mode);
                  onOpenChange(false);
                }}
                className={cn(
                  "w-full flex items-start gap-3 p-2.5 rounded-lg text-left transition-colors",
                  "hover:bg-secondary",
                  isActive && "bg-secondary"
                )}
              >
                <div className={cn(
                  "flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center",
                  isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                )}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{modeConfig.label}</span>
                    {modeConfig.mode === 'deep-research' && (
                      <span className="text-[10px] font-medium bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                        Beta
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {modeConfig.description}
                  </p>
                </div>
                {isActive && (
                  <Check className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                )}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
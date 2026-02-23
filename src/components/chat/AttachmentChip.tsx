import { X, File, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Attachment {
  id: string;
  name: string;
  type: string;
  size: number;
  preview?: string;
  tokenEstimate: number;
}

interface AttachmentChipProps {
  attachment: Attachment;
  onRemove: () => void;
}

export function AttachmentChip({ attachment, onRemove }: AttachmentChipProps) {
  const isImage = attachment.type.startsWith('image/');
  const Icon = isImage ? ImageIcon : File;

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className={cn(
      "inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg",
      "bg-secondary/80 border border-border/50",
      "text-sm group"
    )}>
      {attachment.preview ? (
        <img 
          src={attachment.preview} 
          alt={attachment.name}
          className="w-6 h-6 rounded object-cover"
        />
      ) : (
        <Icon className="h-4 w-4 text-muted-foreground" />
      )}
      <span className="text-foreground/80 truncate max-w-[120px]">
        {attachment.name}
      </span>
      <span className="text-xs text-muted-foreground">
        ~{attachment.tokenEstimate} tokens
      </span>
      <button
        onClick={onRemove}
        className="text-muted-foreground hover:text-foreground transition-colors"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
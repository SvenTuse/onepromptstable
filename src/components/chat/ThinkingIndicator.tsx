interface ThinkingIndicatorProps {
  text?: string;
}

export function ThinkingIndicator({ text }: ThinkingIndicatorProps) {
  return (
    <div className="fade-in flex w-full justify-start px-4 py-2">
      <span className="thinking-text text-sm font-medium">
        Thinking{text && <span className="ml-2 text-muted-foreground">{text}</span>}
      </span>
    </div>
  );
}

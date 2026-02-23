import { useState, useEffect, useRef, useCallback } from 'react';

// Global stop signal for typewriter
let globalStopSignal = false;
let onStopCallback: (() => void) | null = null;

export function stopAllTypewriters() {
  globalStopSignal = true;
  if (onStopCallback) {
    onStopCallback();
  }
}

export function resetStopSignal() {
  globalStopSignal = false;
}

export function useTypewriter(text: string, speed: number = 15, enabled: boolean = true, onComplete?: () => void) {
  const [displayedText, setDisplayedText] = useState(enabled ? '' : text);
  const [isTyping, setIsTyping] = useState(enabled);
  const indexRef = useRef(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const stopTyping = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsTyping(false);
    if (onComplete) onComplete();
  }, [onComplete]);

  useEffect(() => {
    if (!enabled) {
      setDisplayedText(text);
      setIsTyping(false);
      return;
    }

    // Reset stop signal for new typing session
    globalStopSignal = false;
    setDisplayedText('');
    indexRef.current = 0;
    setIsTyping(true);

    // Register stop callback
    onStopCallback = stopTyping;

    intervalRef.current = setInterval(() => {
      if (globalStopSignal) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        setIsTyping(false);
        if (onComplete) onComplete();
        return;
      }
      
      if (indexRef.current < text.length) {
        setDisplayedText(text.slice(0, indexRef.current + 1));
        indexRef.current++;
      } else {
        if (intervalRef.current) clearInterval(intervalRef.current);
        setIsTyping(false);
        if (onComplete) onComplete();
      }
    }, speed);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      onStopCallback = null;
    };
  }, [text, speed, enabled, stopTyping, onComplete]);

  return { displayedText, isTyping, stopTyping };
}

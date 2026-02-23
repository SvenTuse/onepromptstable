// Pricing configuration for AI models
// All prices are in USD per token or per unit

export type GenerationMode = 'default' | 'reasoning' | 'data-analytics' | 'code' | 'photo' | 'video' | 'deep-research';

export interface ModelPricing {
  name: string;
  inputCostPerMillion: number;
  outputCostPerMillion: number;
  fixedFee?: number;
}

export interface ModePricing {
  mode: GenerationMode;
  label: string;
  description: string;
  icon: string;
  model: ModelPricing;
  estimatedOutputMultiplier: number;
  fixedFee: number;
  confirmationThreshold: number;
}

// Default model rates (configurable)
export const MODEL_RATES: Record<string, ModelPricing> = {
  'gpt-4.1': {
    name: 'GPT-4.1',
    inputCostPerMillion: 3,
    outputCostPerMillion: 12,
  },
  'claude-opus': {
    name: 'Claude Opus',
    inputCostPerMillion: 15,
    outputCostPerMillion: 75,
  },
  'claude-sonnet-4-5': {
    name: 'Claude Sonnet 4.5',
    inputCostPerMillion: 3000,
    outputCostPerMillion: 15000,
  },
  'o1-pro': {
    name: 'o1-pro',
    inputCostPerMillion: 150000,
    outputCostPerMillion: 600000,
  },
  'gemini-3-flash-preview': {
    name: 'Gemini 3 Flash Preview',
    inputCostPerMillion: 0.5,
    outputCostPerMillion: 3,
  },
  'gemini-2.5-pro': {
    name: 'Gemini 2.5 Pro',
    inputCostPerMillion: 1.25,
    outputCostPerMillion: 10,
  },
  'grok-code-fast-1': {
    name: 'Grok Code Fast 1',
    inputCostPerMillion: 0.2,
    outputCostPerMillion: 1.5,
  },
  'dalle': {
    name: 'DALL·E',
    inputCostPerMillion: 0,
    outputCostPerMillion: 0,
    fixedFee: 0.06,
  },
  'runway': {
    name: 'Runway Gen-3',
    inputCostPerMillion: 0,
    outputCostPerMillion: 0,
    fixedFee: 5.0,
  },
};

export const MODE_PRICING: Record<GenerationMode, ModePricing> = {
  'default': {
    mode: 'default',
    label: 'Free',
    description: 'Standard AI responses (free)',
    icon: 'MessageSquare',
    model: MODEL_RATES['gpt-4.1'],
    estimatedOutputMultiplier: 2,
    fixedFee: 0,
    confirmationThreshold: 1.0,
  },
  'reasoning': {
    mode: 'reasoning',
    label: 'Reasoning',
    description: 'Chain-of-thought reasoning · Claude Sonnet 4.5 (MAX: o1-pro)',
    icon: 'Brain',
    model: MODEL_RATES['claude-sonnet-4-5'],
    estimatedOutputMultiplier: 0,
    fixedFee: 0.021,
    confirmationThreshold: 0.5,
  },
  'data-analytics': {
    mode: 'data-analytics',
    label: 'Data Analytics',
    description: 'Data analysis · Gemini 3 Flash (MAX: Gemini 2.5 Pro)',
    icon: 'BarChart3',
    model: MODEL_RATES['gemini-3-flash-preview'],
    estimatedOutputMultiplier: 0,
    fixedFee: 0,
    confirmationThreshold: 1.0,
  },
  'code': {
    mode: 'code',
    label: 'Code',
    description: 'Code generation · Grok Code Fast (MAX: Grok + Claude pipeline)',
    icon: 'Code2',
    model: MODEL_RATES['grok-code-fast-1'],
    estimatedOutputMultiplier: 0,
    fixedFee: 0.026,
    confirmationThreshold: 0.5,
  },
  'photo': {
    mode: 'photo',
    label: 'Photo Generation',
    description: 'Single image generation ~$0.06/image',
    icon: 'Image',
    model: MODEL_RATES['dalle'],
    estimatedOutputMultiplier: 0,
    fixedFee: 0.06,
    confirmationThreshold: 0.5,
  },
  'video': {
    mode: 'video',
    label: 'Video Generation',
    description: 'Short clip generation ~$1-10/clip',
    icon: 'Video',
    model: MODEL_RATES['runway'],
    estimatedOutputMultiplier: 0,
    fixedFee: 5.0,
    confirmationThreshold: 2.0,
  },
  'deep-research': {
    mode: 'deep-research',
    label: 'Deep Research',
    description: 'Long context, documents, citations (Beta)',
    icon: 'Search',
    model: MODEL_RATES['claude-opus'],
    estimatedOutputMultiplier: 8,
    fixedFee: 0,
    confirmationThreshold: 2.0,
  },
};

/**
 * Word-based pricing for Reasoning mode.
 * isMax = false → Simple (claude-sonnet-4-5): $0.021 fixed + $0.00003 per 10 words
 * isMax = true  → MAX    (o1-pro):            $2.34  fixed + $0.0015  per 10 words
 */
export function calculateReasoningPrice(inputText: string, isMax: boolean): { price: number; breakdown: string } {
  const wordCount = inputText.trim().split(/\s+/).filter(Boolean).length || 0;
  const groups = Math.ceil(wordCount / 10);

  if (isMax) {
    const variableCost = groups * 0.0015;
    const price = 2.34 + variableCost;
    return {
      price,
      breakdown: `Reasoning MAX · Words: ${wordCount} · Fixed: $2.34 · Variable: $${variableCost.toFixed(4)} · Total: $${price.toFixed(4)}`,
    };
  }

  const variableCost = groups * 0.00003;
  const price = 0.021 + variableCost;
  return {
    price,
    breakdown: `Reasoning · Words: ${wordCount} · Fixed: $0.021 · Variable: $${variableCost.toFixed(5)} · Total: $${price.toFixed(4)}`,
  };
}

/**
 * Data Analytics pricing (UI estimate).
 * Simple (Gemini 3 Flash): fixed $0.005 + $0.00005 per 10 words.
 * MAX   (Gemini 2.5 Pro):  fixed $0.012 + $0.0001  per 10 words.
 */
export function calculateDataAnalyticsPrice(inputText: string, isMax: boolean): { price: number; breakdown: string } {
  const wordCount = inputText.trim().split(/\s+/).filter(Boolean).length || 0;
  const groups = Math.ceil(wordCount / 10);

  if (isMax) {
    const variableCost = groups * 0.0001;
    const price = 0.012 + variableCost;
    return {
      price,
      breakdown: `Data Analytics MAX · Words: ${wordCount} · Fixed: $0.012 · Variable: $${variableCost.toFixed(4)} · Total: $${price.toFixed(4)}`,
    };
  }

  const variableCost = groups * 0.00005;
  const price = 0.005 + variableCost;
  return {
    price,
    breakdown: `Data Analytics · Words: ${wordCount} · Fixed: $0.005 · Variable: $${variableCost.toFixed(5)} · Total: $${price.toFixed(4)}`,
  };
}

/**
 * Code pricing.
 * Simple (Grok Code Fast 1):  fixed $0.026  + $0.000002 per 10 words
 * MAX   (Grok + Claude pipe):  fixed $0.274  + $0.000002 per 10 words
 */
export function calculateCodePrice(inputText: string, isMax: boolean): { price: number; breakdown: string } {
  const wordCount = inputText.trim().split(/\s+/).filter(Boolean).length || 0;
  const groups = Math.ceil(wordCount / 10);
  const variableCost = groups * 0.000002;   // same rate for both tiers

  if (isMax) {
    const price = 0.274 + variableCost;
    return {
      price,
      breakdown: `Code MAX · Words: ${wordCount} · Fixed: $0.274 · Variable: $${variableCost.toFixed(6)} · Total: $${price.toFixed(4)}`,
    };
  }

  const price = 0.026 + variableCost;
  return {
    price,
    breakdown: `Code · Words: ${wordCount} · Fixed: $0.026 · Variable: $${variableCost.toFixed(6)} · Total: $${price.toFixed(4)}`,
  };
}

// ~4 characters per token is a common approximation
export function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.max(1, Math.round(text.length / 4));
}

// Estimate output tokens based on input and mode
export function estimateOutputTokens(inputTokens: number, mode: GenerationMode): number {
  const modePricing = MODE_PRICING[mode];
  
  if (modePricing.fixedFee > 0 && modePricing.estimatedOutputMultiplier === 0) {
    return 0; // Image/video modes don't use token-based pricing
  }
  
  const estimated = Math.round(inputTokens * modePricing.estimatedOutputMultiplier);
  return Math.min(8000, Math.max(256, estimated));
}

// Calculate price based on tokens and mode
export function calculatePrice(
  inputText: string,
  mode: GenerationMode,
  attachmentTokens: number = 0,
  isMaxReasoning: boolean = false
): {
  price: number;
  inputTokens: number;
  estimatedOutputTokens: number;
  model: string;
  breakdown: string;
} {
  // Default mode is free (no per-prompt charge shown in UI)
  if (mode === 'default') {
    const inputTokens = estimateTokens(inputText) + attachmentTokens;
    return {
      price: 0,
      inputTokens,
      estimatedOutputTokens: 0,
      model: MODE_PRICING.default.model.name,
      breakdown: `Free mode • Input: ${inputTokens.toLocaleString()} tokens`,
    };
  }

  // Reasoning mode: word-based pricing, model depends on MAX toggle
  if (mode === 'reasoning') {
    const { price, breakdown } = calculateReasoningPrice(inputText, isMaxReasoning);
    const inputTokens = estimateTokens(inputText) + attachmentTokens;
    return {
      price,
      inputTokens,
      estimatedOutputTokens: 0,
      model: isMaxReasoning ? 'o1-pro' : 'Claude Sonnet 4.5',
      breakdown,
    };
  }

  if (mode === 'data-analytics') {
    const { price, breakdown } = calculateDataAnalyticsPrice(inputText, isMaxReasoning);
    const inputTokens = estimateTokens(inputText) + attachmentTokens;
    return {
      price,
      inputTokens,
      estimatedOutputTokens: 0,
      model: isMaxReasoning ? 'Gemini 2.5 Pro' : 'Gemini 3 Flash Preview',
      breakdown,
    };
  }

  if (mode === 'code') {
    const { price, breakdown } = calculateCodePrice(inputText, isMaxReasoning);
    const inputTokens = estimateTokens(inputText) + attachmentTokens;
    return {
      price,
      inputTokens,
      estimatedOutputTokens: 0,
      model: isMaxReasoning ? 'Grok Code Fast 1 + Claude Sonnet 4.5' : 'Grok Code Fast 1',
      breakdown,
    };
  }

  // Other modes use token-based pricing
  const modePricing = MODE_PRICING[mode];
  const inputTokens = estimateTokens(inputText) + attachmentTokens;
  const estimatedOutputTokens = estimateOutputTokens(inputTokens, mode);
  
  const inputCost = (inputTokens / 1_000_000) * modePricing.model.inputCostPerMillion;
  const outputCost = (estimatedOutputTokens / 1_000_000) * modePricing.model.outputCostPerMillion;
  const fixedFee = modePricing.fixedFee;
  
  const price = inputCost + outputCost + fixedFee;
  
  const breakdown = `Input: ${inputTokens.toLocaleString()} tokens • Output estimate: ${estimatedOutputTokens.toLocaleString()} tokens • Model: ${modePricing.model.name} • Backend cost: $${price.toFixed(4)}`;
  
  return {
    price,
    inputTokens,
    estimatedOutputTokens,
    model: modePricing.model.name,
    breakdown,
  };
}

export function formatPrice(price: number): string {
  if (price < 0.01) {
    return `$${price.toFixed(4)}`;
  }
  return `$${price.toFixed(2)}`;
}
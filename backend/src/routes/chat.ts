import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';
import { BalanceService } from '../services/balance.service';
import { ChatHistoryService } from '../services/chat-history.service';
import { streamChatCompletion, FREE_MODEL } from '../services/openrouter';
import { calculateChargeCents, ChatMode, UNITS_PER_USD } from '../utils/pricing';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

const PRICING = {
  'anthropic/claude-sonnet-4': {
    input: 0.003,
    output: 0.015,
  },
} as const;

/** Free mode: no balance check, no charge */
const FREE_MODE = 'default';

/** Paid modes */
const SIMPLE_MODE = 'simple';
const MAX_MODE = 'max';
const DATA_ANALYTICS_SIMPLE_MODE = 'data-analytics-simple';
const DATA_ANALYTICS_MAX_MODE    = 'data-analytics-max';
const CODE_SIMPLE_MODE           = 'code-simple';
const CODE_MAX_MODE              = 'code-max';
const DEEP_RESEARCH_SIMPLE_MODE  = 'deep-research-simple';
const DEEP_RESEARCH_MAX_MODE     = 'deep-research-max';

router.post('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      message,
      temperature = 0.7,
      maxTokens = 10000,
      mode = FREE_MODE,
      sessionId: bodySessionId,
    } = req.body;

    if (!message) {
      res.status(400).json({ error: 'Message is required' });
      return;
    }

    const userId = req.user!.userId;
    const model = 'anthropic/claude-sonnet-4';
    const isFreeMode = mode === FREE_MODE;
    const isSimpleMode = mode === SIMPLE_MODE;
    const isMaxMode = mode === MAX_MODE;
    const isDataAnalyticsSimple = mode === DATA_ANALYTICS_SIMPLE_MODE;
    const isDataAnalyticsMax    = mode === DATA_ANALYTICS_MAX_MODE;
    const isCodeSimple          = mode === CODE_SIMPLE_MODE;
    const isCodeMax             = mode === CODE_MAX_MODE;
    const isDeepResearchSimple  = mode === DEEP_RESEARCH_SIMPLE_MODE;
    const isDeepResearchMax     = mode === DEEP_RESEARCH_MAX_MODE;

    // Resolve or create chat session (non-blocking; chat works without history)
    let sessionId: string | null = bodySessionId || null;
    if (!sessionId) {
      const newSession = await ChatHistoryService.createSession(
        userId,
        message.slice(0, 500) || 'New chat',
        model
      );
      sessionId = newSession?.id ?? null;
    }

    // Retrieve conversation history for context (if session exists, before saving current message)
    let conversationMessages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }> = [];
    if (sessionId) {
      try {
        // Get conversation history, leaving room for response (use 80% of maxTokens for context)
        const contextMaxTokens = Math.floor(maxTokens * 0.8);
        const history = await ChatHistoryService.getSessionContext(sessionId, userId, contextMaxTokens);
        conversationMessages = history;
      } catch (error) {
        // If history retrieval fails, continue without context (non-blocking)
        console.error('Failed to retrieve conversation history:', error);
      }
    }
    
    // Add the current user message to the conversation
    conversationMessages.push({
      role: 'user',
      content: message,
    });

    // Save current message to history (non-blocking)
    if (sessionId) {
      ChatHistoryService.saveMessage(sessionId, userId, 'user', message, {
        model,
        temperature,
        max_tokens: maxTokens,
      });
    }

    // Pre-calculate charge for paid modes and check balance
    let preCalculatedChargeCents = 0;
    if (isSimpleMode || isMaxMode || isDataAnalyticsSimple || isDataAnalyticsMax || isCodeSimple || isCodeMax || isDeepResearchSimple || isDeepResearchMax) {
      const modeType: ChatMode =
        isSimpleMode            ? 'simple'                :
        isMaxMode               ? 'max'                   :
        isDataAnalyticsSimple   ? 'data-analytics-simple' :
        isDataAnalyticsMax      ? 'data-analytics-max'    :
        isCodeSimple            ? 'code-simple'           :
        isCodeMax               ? 'code-max'              :
        isDeepResearchSimple    ? 'deep-research-simple'  :
                                  'deep-research-max';
      preCalculatedChargeCents = calculateChargeCents(modeType, message);

      const balance = await BalanceService.getBalance(userId);

      if (balance.balance_cents < preCalculatedChargeCents) {
        res.status(402).json({
          error: 'Insufficient balance',
          required_usd: preCalculatedChargeCents / UNITS_PER_USD,
          current_balance_usd: balance.balance_cents / UNITS_PER_USD,
        });
        return;
      }
    } else if (!isFreeMode) {
      // Legacy paid mode (existing anthropic/claude-sonnet-4)
      const balance = await BalanceService.getBalance(userId);
      const minRequiredUnits = 100; // $0.10 minimum for legacy paid mode

      if (balance.balance_cents < minRequiredUnits) {
        res.status(402).json({
          error: 'Insufficient balance',
          required_usd: minRequiredUnits / UNITS_PER_USD,
          current_balance_usd: balance.balance_cents / UNITS_PER_USD,
        });
        return;
      }
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    if (sessionId) {
      res.setHeader('X-Chat-Session-Id', sessionId);
    }

    let totalTokens = 0;
    let inputTokens = 0;
    let outputTokens = 0;
    let fullResponse = '';

    // Route to appropriate service based on mode
    const streamFunction = async () => {
      if (isSimpleMode) {
        // Simple mode: Openrouter anthropic/claude-sonnet-4.5
        const maxTok = 1300;
        const modelId = 'anthropic/claude-sonnet-4.5';
        console.log('[Paid LLM] model=%s max_tokens=%s', modelId, maxTok);
        return streamChatCompletion({
          messages: conversationMessages,
          temperature,
          maxTokens: maxTok,
          model: modelId,
          onChunk: (chunk: string) => {
            fullResponse += chunk;
            res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
          },
          onComplete: async (usage: any) => {
            inputTokens = usage.prompt_tokens || 0;
            outputTokens = usage.completion_tokens || 0;
            totalTokens = inputTokens + outputTokens;
            await handleCompletion();
          },
          onError: (error: Error) => {
            res.write(
              `data: ${JSON.stringify({
                error: error.message,
                type: 'stream_error',
              })}\n\n`
            );
            res.end();
          },
        });
      } else if (isMaxMode) {
        // MAX mode: Openrouter openai/o1-pro
        const maxTok = 4000;
        const modelId = 'openai/o1-pro';
        console.log('[Paid LLM] model=%s max_tokens=%s', modelId, maxTok);
        return streamChatCompletion({
          messages: conversationMessages,
          temperature: 0.7,
          maxTokens: maxTok,
          model: modelId,
          onChunk: (chunk: string) => {
            fullResponse += chunk;
            res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
          },
          onComplete: async (usage: any) => {
            inputTokens = usage.prompt_tokens || 0;
            outputTokens = usage.completion_tokens || 0;
            totalTokens = inputTokens + outputTokens;
            await handleCompletion();
          },
          onError: (error: Error) => {
            res.write(
              `data: ${JSON.stringify({
                error: error.message,
                type: 'stream_error',
              })}\n\n`
            );
            res.end();
          },
        });
      } else if (isDataAnalyticsSimple) {
        const maxTok = 9000;
        const modelId = 'google/gemini-3-flash-preview';
        console.log('[Paid LLM] model=%s max_tokens=%s', modelId, maxTok);
        return streamChatCompletion({
          messages: conversationMessages,
          temperature,
          maxTokens: maxTok,
          model: modelId,
          onChunk: (chunk: string) => {
            fullResponse += chunk;
            res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
          },
          onComplete: async (usage: any) => {
            inputTokens  = usage.prompt_tokens || 0;
            outputTokens = usage.completion_tokens || 0;
            totalTokens  = inputTokens + outputTokens;
            await handleCompletion();
          },
          onError: (error: Error) => {
            res.write(`data: ${JSON.stringify({ error: error.message, type: 'stream_error' })}\n\n`);
            res.end();
          },
        });
      } else if (isDataAnalyticsMax) {
        const maxTok = 2000;
        const modelId = 'anthropic/claude-opus-4.6';
        console.log('[Paid LLM] model=%s max_tokens=%s', modelId, maxTok);
        return streamChatCompletion({
          messages: conversationMessages,
          temperature,
          maxTokens: maxTok,
          model: modelId,
          onChunk: (chunk: string) => {
            fullResponse += chunk;
            res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
          },
          onComplete: async (usage: any) => {
            inputTokens  = usage.prompt_tokens || 0;
            outputTokens = usage.completion_tokens || 0;
            totalTokens  = inputTokens + outputTokens;
            await handleCompletion();
          },
          onError: (error: Error) => {
            res.write(`data: ${JSON.stringify({ error: error.message, type: 'stream_error' })}\n\n`);
            res.end();
          },
        });
      } else if (isCodeSimple) {
        const maxTok = 9000;
        const modelId = 'x-ai/grok-code-fast-1';
        console.log('[Paid LLM] model=%s max_tokens=%s', modelId, maxTok);
        return streamChatCompletion({
          messages: conversationMessages,
          temperature,
          maxTokens: maxTok,
          model: modelId,
          onChunk: (chunk: string) => {
            fullResponse += chunk;
            res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
          },
          onComplete: async (usage: any) => {
            inputTokens  = usage.prompt_tokens || 0;
            outputTokens = usage.completion_tokens || 0;
            totalTokens  = inputTokens + outputTokens;
            await handleCompletion();
          },
          onError: (error: Error) => {
            res.write(`data: ${JSON.stringify({ error: error.message, type: 'stream_error' })}\n\n`);
            res.end();
          },
        });
      } else if (isCodeMax) {
        // Step 1: Grok planning with "Thinking" display
        let grokPlan = '';
        let grokInputTokens = 0;
        let grokOutputTokens = 0;
        let grokWords: string[] = [];
        let grokWordBuffer = '';

        await new Promise<void>((resolve, reject) => {
          const grokPrompt = `Write a prompt-technical specification in English for Claude Sonnet so that he implements the following code and/or corrects the following errors. Analyze the task, suggest solutions so that Claude understands the task and completes the writing of the code:\n\n${message}`;

          // Build messages for Grok: use conversation history (excluding current message) + formatted prompt
          const grokMessages = conversationMessages.length > 1 
            ? [...conversationMessages.slice(0, -1), { role: 'user' as const, content: grokPrompt }]
            : [{ role: 'user' as const, content: grokPrompt }];

          console.log('[Paid LLM] model=x-ai/grok-code-fast-1 max_tokens=740');
          streamChatCompletion({
            messages: grokMessages,
            temperature: 0.3,
            maxTokens: 740,
            model: 'x-ai/grok-code-fast-1',
            onChunk: (chunk: string) => {
              grokPlan += chunk;
              // Accumulate words for "Thinking" display (5 words at a time)
              grokWordBuffer += chunk;
              const words = grokWordBuffer.split(/\s+/);
              while (words.length >= 5) {
                const fiveWords = words.splice(0, 5).join(' ');
                grokWords.push(fiveWords);
                // Send thinking event to frontend
                res.write(`data: ${JSON.stringify({ type: 'thinking', text: fiveWords })}\n\n`);
              }
              grokWordBuffer = words.join(' ');
            },
            onComplete: (usage: any) => {
              grokInputTokens  = usage.prompt_tokens || 0;
              grokOutputTokens = usage.completion_tokens || 0;
              // Send remaining words if any
              if (grokWordBuffer.trim()) {
                res.write(`data: ${JSON.stringify({ type: 'thinking', text: grokWordBuffer.trim() })}\n\n`);
              }
              resolve();
            },
            onError: (error: Error) => {
              res.write(`data: ${JSON.stringify({ error: error.message, type: 'stream_error' })}\n\n`);
              res.end();
              reject(error);
            },
          });
        });

        // Step 2: Claude coding (streamed to client)
        const claudePrompt = grokPlan;

        // Build messages for Claude: use conversation history (excluding current message) + Grok plan
        const claudeMessages = conversationMessages.length > 1
          ? [...conversationMessages.slice(0, -1), { role: 'user' as const, content: claudePrompt }]
          : [{ role: 'user' as const, content: claudePrompt }];

        console.log('[Paid LLM] model=anthropic/claude-sonnet-4.5 max_tokens=18000');
        return streamChatCompletion({
          messages: claudeMessages,
          temperature,
          maxTokens: 18000,
          model: 'anthropic/claude-sonnet-4.5',
          onChunk: (chunk: string) => {
            fullResponse += chunk;
            res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
          },
          onComplete: async (usage: any) => {
            const claudeInput  = usage.prompt_tokens || 0;
            const claudeOutput = usage.completion_tokens || 0;
            inputTokens  = grokInputTokens + claudeInput;
            outputTokens = grokOutputTokens + claudeOutput;
            totalTokens  = inputTokens + outputTokens;
            await handleCompletion();
          },
          onError: (error: Error) => {
            res.write(`data: ${JSON.stringify({ error: error.message, type: 'stream_error' })}\n\n`);
            res.end();
          },
        });
      } else if (isDeepResearchSimple) {
        const maxTok = 8192;
        const modelId = 'openai/o4-mini-deep-research';
        console.log('[Paid LLM] model=%s max_tokens=%s', modelId, maxTok);
        return streamChatCompletion({
          messages: conversationMessages,
          temperature,
          maxTokens: maxTok,
          model: modelId,
          onChunk: (chunk: string) => {
            fullResponse += chunk;
            res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
          },
          onComplete: async (usage: any) => {
            inputTokens  = usage.prompt_tokens || 0;
            outputTokens = usage.completion_tokens || 0;
            totalTokens  = inputTokens + outputTokens;
            await handleCompletion();
          },
          onError: (error: Error) => {
            res.write(`data: ${JSON.stringify({ error: error.message, type: 'stream_error' })}\n\n`);
            res.end();
          },
        });
      } else if (isDeepResearchMax) {
        const maxTok = 8192;
        const modelId = 'openai/o3-deep-research';
        console.log('[Paid LLM] model=%s max_tokens=%s', modelId, maxTok);
        return streamChatCompletion({
          messages: conversationMessages,
          temperature,
          maxTokens: maxTok,
          model: modelId,
          onChunk: (chunk: string) => {
            fullResponse += chunk;
            res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
          },
          onComplete: async (usage: any) => {
            inputTokens  = usage.prompt_tokens || 0;
            outputTokens = usage.completion_tokens || 0;
            totalTokens  = inputTokens + outputTokens;
            await handleCompletion();
          },
          onError: (error: Error) => {
            res.write(`data: ${JSON.stringify({ error: error.message, type: 'stream_error' })}\n\n`);
            res.end();
          },
        });
      } else {
        // Free mode or legacy paid mode: OpenRouter
        const openRouterModel = isFreeMode ? FREE_MODEL : model;
        return streamChatCompletion({
          messages: conversationMessages,
          temperature,
          maxTokens,
          model: openRouterModel,
          onChunk: (chunk: string) => {
            fullResponse += chunk;
            res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
          },
          onComplete: async (usage: any) => {
            inputTokens = usage.prompt_tokens || 0;
            outputTokens = usage.completion_tokens || 0;
            totalTokens = inputTokens + outputTokens;
            await handleCompletion();
          },
          onError: (error: Error) => {
            res.write(
              `data: ${JSON.stringify({
                error: error.message,
                type: 'stream_error',
              })}\n\n`
            );
            res.end();
          },
        });
      }
    };

    // Shared completion handler for all modes
    const handleCompletion = async () => {
      // Determine model name and cost for logging
      let modelName: string;
      let costCents: number;

      if (isSimpleMode) {
        modelName = 'claude-sonnet-4-5-20250929';
        costCents = preCalculatedChargeCents;
      } else if (isMaxMode) {
        modelName = 'o1-pro';
        costCents = preCalculatedChargeCents;
      } else if (isDataAnalyticsSimple) {
        modelName = 'google/gemini-3-flash-preview';
        costCents = preCalculatedChargeCents;
      } else if (isDataAnalyticsMax) {
        modelName = 'anthropic/claude-opus-4.6';
        costCents = preCalculatedChargeCents;
      } else if (isCodeSimple) {
        modelName = 'x-ai/grok-code-fast-1';
        costCents = preCalculatedChargeCents;
      } else if (isCodeMax) {
        modelName = 'x-ai/grok-code-fast-1 + anthropic/claude-sonnet-4.5';
        costCents = preCalculatedChargeCents;
      } else if (isDeepResearchSimple) {
        modelName = 'openai/o4-mini-deep-research';
        costCents = preCalculatedChargeCents;
      } else if (isDeepResearchMax) {
        modelName = 'openai/o3-deep-research';
        costCents = preCalculatedChargeCents;
      } else if (isFreeMode) {
        modelName = FREE_MODEL;
        costCents = 0;
      } else {
        // Legacy paid mode
        modelName = model;
        const pricing = PRICING[model as keyof typeof PRICING];
        const inputCost = (inputTokens / 1000) * pricing.input;
        const outputCost = (outputTokens / 1000) * pricing.output;
        costCents = Math.max(1, Math.ceil((inputCost + outputCost) * UNITS_PER_USD));
      }

      // Save to chat history
      if (sessionId) {
        ChatHistoryService.saveMessage(
          sessionId,
          userId,
          'assistant',
          fullResponse,
          {
            model: modelName,
            tokens_used: totalTokens,
            cost_cents: costCents,
            temperature,
            max_tokens: maxTokens,
          }
        );
        ChatHistoryService.updateSessionStats(sessionId);
        // Finalize sidebar title with first ~50 chars of response (like ChatGPT/Claude)
        const title = fullResponse.replace(/\s+/g, ' ').trim().slice(0, 50) || 'New chat';
        await ChatHistoryService.updateSession(sessionId, userId, { title });
      }

      // Handle charging and balance response
      if (isFreeMode) {
        const balance = await BalanceService.getBalance(userId);
        res.write(
          `data: ${JSON.stringify({
            type: 'usage',
            tokens: totalTokens,
            cost_usd: 0,
            balance_after_usd: balance.balance_cents / UNITS_PER_USD,
          })}\n\n`
        );
      } else if (isSimpleMode || isMaxMode || isDataAnalyticsSimple || isDataAnalyticsMax || isCodeSimple || isCodeMax || isDeepResearchSimple || isDeepResearchMax) {
        // New paid modes - charge using pre-calculated amount
        const idempotencyKey = uuidv4();
        const description =
          isSimpleMode            ? 'Reasoning — claude-sonnet-4-5'                          :
          isMaxMode               ? 'Reasoning MAX — o1-pro'                                 :
          isDataAnalyticsSimple   ? 'Data Analytics — gemini-3-flash-preview'                :
          isDataAnalyticsMax      ? 'Data Analytics MAX — claude-opus-4.6'                   :
          isCodeSimple            ? 'Code — grok-code-fast'                                :
          isCodeMax               ? 'Code MAX — grok-code-fast + claude-sonnet-4.5'        :
          isDeepResearchSimple    ? 'Deep Research — o4-mini-deep-research'                  :
                                    'Deep Research MAX — o3-deep-research';

        const modeForMetadata =
          isSimpleMode            ? 'simple'                :
          isMaxMode               ? 'max'                   :
          isDataAnalyticsSimple   ? 'data-analytics-simple' :
          isDataAnalyticsMax      ? 'data-analytics-max'    :
          isCodeSimple            ? 'code-simple'           :
          isCodeMax               ? 'code-max'              :
          isDeepResearchSimple    ? 'deep-research-simple'  :
                                    'deep-research-max';

        const transaction = await BalanceService.charge(
          userId,
          costCents,
          description,
          {
            model: modelName,
            mode: modeForMetadata,
            input_tokens: inputTokens,
            output_tokens: outputTokens,
            total_tokens: totalTokens,
            prompt_preview: message.substring(0, 100),
            promptWordCount: message.trim().split(/\s+/).length,
          },
          idempotencyKey
        );

        await BalanceService.logApiUsage(
          userId,
          transaction.id,
          modelName,
          totalTokens,
          costCents,
          { 
            mode: modeForMetadata,
            temperature,
            maxTokens,
            promptWordCount: message.trim().split(/\s+/).length,
          }
        );

        res.write(
          `data: ${JSON.stringify({
            type: 'usage',
            tokens: totalTokens,
            cost_usd: costCents / UNITS_PER_USD,
            balance_after_usd: transaction.balance_after_cents / UNITS_PER_USD,
          })}\n\n`
        );
      } else {
        // Legacy paid mode
        const pricing = PRICING[model as keyof typeof PRICING];
        const inputCost = (inputTokens / 1000) * pricing.input;
        const outputCost = (outputTokens / 1000) * pricing.output;
        const totalCostUsd = inputCost + outputCost;
        const totalCostUnits = Math.max(1, Math.ceil(totalCostUsd * UNITS_PER_USD));

        const transaction = await BalanceService.charge(
          userId,
          totalCostUnits,
          `API usage: ${model}`,
          {
            model,
            input_tokens: inputTokens,
            output_tokens: outputTokens,
            total_tokens: totalTokens,
            prompt_preview: message.substring(0, 100),
          }
        );

        await BalanceService.logApiUsage(
          userId,
          transaction.id,
          model,
          totalTokens,
          totalCostUnits,
          { temperature, maxTokens }
        );

        res.write(
          `data: ${JSON.stringify({
            type: 'usage',
            tokens: totalTokens,
            cost_usd: totalCostUsd,
            balance_after_usd: transaction.balance_after_cents / UNITS_PER_USD,
          })}\n\n`
        );
      }

      res.write('data: [DONE]\n\n');
      res.end();
    };

    try {
      await streamFunction();
    } catch (streamError: any) {
      if (!res.headersSent) {
        res.status(500).json({ error: streamError.message });
      } else {
        res.write(
          `data: ${JSON.stringify({
            error: streamError.message,
            type: 'stream_error',
          })}\n\n`
        );
        res.end();
      }
    }
  } catch (error: any) {
    console.error('Chat error:', error);

    if (!res.headersSent) {
      if (error.message === 'Insufficient balance') {
        res.status(402).json({ error: 'Insufficient balance' });
        return;
      }
      const message =
        error?.message && typeof error.message === 'string'
          ? error.message
          : 'Failed to process chat request';
      res.status(500).json({ error: message });
    }
  }
});

export default router;
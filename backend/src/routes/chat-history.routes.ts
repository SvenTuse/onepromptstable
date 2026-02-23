import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';
import { ChatHistoryService } from '../services/chat-history.service';

const router = Router();
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

/** GET /api/chat/sessions - list user's chat sessions */
router.get('/sessions', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const limit = Math.min(
      parseInt(String(req.query.limit), 10) || DEFAULT_LIMIT,
      MAX_LIMIT
    );
    const offset = Math.max(0, parseInt(String(req.query.offset), 10) || 0);
    const sessions = await ChatHistoryService.getUserSessions(userId, limit, offset);
    res.json({ sessions });
  } catch (err: any) {
    if (err.message === 'Chat history database is not configured') {
      res.status(503).json({ error: 'Chat history is not available' });
      return;
    }
    console.error('[ChatHistory] GET /sessions:', err);
    res.status(500).json({ error: err.message || 'Failed to list sessions' });
  }
});

/** POST /api/chat/sessions - create new session */
router.post('/sessions', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { title, model } = req.body || {};
    const session = await ChatHistoryService.createSession(userId, title, model);
    if (!session) {
      res.status(503).json({ error: 'Chat history is not available' });
      return;
    }
    res.status(201).json(session);
  } catch (err: any) {
    console.error('[ChatHistory] POST /sessions:', err);
    res.status(500).json({ error: err.message || 'Failed to create session' });
  }
});

/** GET /api/chat/sessions/:sessionId - get session details */
router.get('/sessions/:sessionId', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { sessionId } = req.params;
    const session = await ChatHistoryService.getSession(sessionId, userId);
    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }
    res.json(session);
  } catch (err: any) {
    if (err.message === 'Chat history database is not configured') {
      res.status(503).json({ error: 'Chat history is not available' });
      return;
    }
    console.error('[ChatHistory] GET /sessions/:sessionId:', err);
    res.status(500).json({ error: err.message || 'Failed to get session' });
  }
});

/** PUT /api/chat/sessions/:sessionId - update session (title, etc.) */
router.put('/sessions/:sessionId', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { sessionId } = req.params;
    const { title, model, metadata, is_archived } = req.body || {};
    const session = await ChatHistoryService.updateSession(sessionId, userId, {
      title,
      model,
      metadata,
      is_archived,
    });
    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }
    res.json(session);
  } catch (err: any) {
    if (err.message === 'Chat history database is not configured') {
      res.status(503).json({ error: 'Chat history is not available' });
      return;
    }
    console.error('[ChatHistory] PUT /sessions/:sessionId:', err);
    res.status(500).json({ error: err.message || 'Failed to update session' });
  }
});

/** DELETE /api/chat/sessions/:sessionId - delete or archive session */
router.delete('/sessions/:sessionId', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { sessionId } = req.params;
    const archiveOnly = req.query.permanent !== 'true';
    const ok = await ChatHistoryService.deleteSession(sessionId, userId, archiveOnly);
    if (!ok) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }
    res.json({ deleted: !archiveOnly, archived: archiveOnly });
  } catch (err: any) {
    if (err.message === 'Chat history database is not configured') {
      res.status(503).json({ error: 'Chat history is not available' });
      return;
    }
    console.error('[ChatHistory] DELETE /sessions/:sessionId:', err);
    res.status(500).json({ error: err.message || 'Failed to delete session' });
  }
});

/** GET /api/chat/sessions/:sessionId/messages - get messages in session */
router.get('/sessions/:sessionId/messages', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { sessionId } = req.params;
    const limit = Math.min(
      parseInt(String(req.query.limit), 10) || DEFAULT_LIMIT,
      MAX_LIMIT
    );
    const offset = Math.max(0, parseInt(String(req.query.offset), 10) || 0);
    const messages = await ChatHistoryService.getSessionMessages(sessionId, userId, limit, offset);
    res.json({ messages });
  } catch (err: any) {
    if (err.message === 'Chat history database is not configured') {
      res.status(503).json({ error: 'Chat history is not available' });
      return;
    }
    console.error('[ChatHistory] GET /sessions/:sessionId/messages:', err);
    res.status(500).json({ error: err.message || 'Failed to get messages' });
  }
});

/** GET /api/chat/sessions/:sessionId/context - get conversation context */
router.get('/sessions/:sessionId/context', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { sessionId } = req.params;
    const maxTokens = Math.min(
      parseInt(String(req.query.max_tokens), 10) || 32000,
      100000
    );
    const messages = await ChatHistoryService.getSessionContext(sessionId, userId, maxTokens);
    res.json({ messages });
  } catch (err: any) {
    if (err.message === 'Chat history database is not configured') {
      res.status(503).json({ error: 'Chat history is not available' });
      return;
    }
    console.error('[ChatHistory] GET /sessions/:sessionId/context:', err);
    res.status(500).json({ error: err.message || 'Failed to get context' });
  }
});

export default router;

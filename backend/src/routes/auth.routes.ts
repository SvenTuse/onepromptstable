import { Router, Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';

const router = Router();

router.post('/register', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, username, fullName } = req.body;

    if (!email || !password || !username) {
      res.status(400).json({ error: 'Email, password, and username are required' });
      return;
    }
    if (password.length < 8) {
      res.status(400).json({ error: 'Password must be at least 8 characters' });
      return;
    }

    const result = await AuthService.register({
      email,
      password,
      username,
      fullName,
    });
    res.status(201).json({
      message: 'Registration successful',
      user: result.user,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    if (error.message && error.message.includes('already')) {
      res.status(409).json({ error: error.message });
      return;
    }
    res.status(500).json({ error: 'Registration failed' });
  }
});

router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }
    const result = await AuthService.login({
      email,
      password,
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip,
    });
    res.json({
      message: 'Login successful',
      user: result.user,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    });
  } catch (error: any) {
    console.error('Login error:', error);
    if (error.message === 'Invalid credentials' || error.message === 'Account is deactivated') {
      res.status(401).json({ error: error.message });
      return;
    }
    res.status(500).json({ error: 'Login failed' });
  }
});

router.post('/refresh', async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      res.status(400).json({ error: 'Refresh token is required' });
      return;
    }
    const result = await AuthService.refreshAccessToken(refreshToken);
    res.json({
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    });
  } catch (error: any) {
    console.error('Token refresh error:', error);
    res.status(401).json({ error: 'Invalid or expired refresh token' });
  }
});

router.post('/logout', async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      await AuthService.logout(refreshToken);
    }
    res.json({ message: 'Logout successful' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

router.get('/me', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await AuthService.getUserById(req.user!.userId);
    if (!user) {
      res.status(401).json({ error: 'User not found' });
      return;
    }
    res.json({ user });
  } catch {
    res.status(500).json({ error: 'Failed to get user info' });
  }
});

router.post('/google', async (req: Request, res: Response): Promise<void> => {
  try {
    const { credential } = req.body;
    if (!credential) {
      res.status(400).json({ error: 'Google credential is required' });
      return;
    }
    const result = await AuthService.loginWithGoogle(
      credential,
      req.headers['user-agent'],
      req.ip
    );
    res.json({
      message: result.isNewUser ? 'Registration successful' : 'Login successful',
      user: result.user,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      isNewUser: result.isNewUser,
    });
  } catch (error: any) {
    console.error('Google auth error:', error);
    if (error.message === 'Invalid Google token') {
      res.status(401).json({ error: 'Invalid Google credentials' });
      return;
    }
    if (error.message === 'Account is deactivated') {
      res.status(401).json({ error: error.message });
      return;
    }
    res.status(500).json({ error: 'Google authentication failed' });
  }
});

export default router;


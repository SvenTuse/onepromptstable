import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { randomBytes, createHash } from 'crypto';
import pool from '../config/database';
import { BalanceService } from './balance.service';
import { GoogleService, GoogleUserInfo } from './googleService';

interface User {
  id: string;
  email: string;
  username: string;
  role: string;
}

interface RegisterData {
  email: string;
  password: string;
  username: string;
  fullName?: string;
}

interface LoginData {
  email: string;
  password: string;
  userAgent?: string;
  ipAddress?: string;
}

export class AuthService {
  private static readonly SALT_ROUNDS = 12;
  private static readonly ACCESS_TOKEN_SECRET = process.env.JWT_ACCESS_SECRET!;
  private static readonly REFRESH_TOKEN_SECRET = process.env.JWT_REFRESH_SECRET!;
  private static readonly ACCESS_TOKEN_EXPIRY = process.env.JWT_ACCESS_EXPIRY || '15m';
  private static readonly REFRESH_TOKEN_EXPIRY = process.env.JWT_REFRESH_EXPIRY || '7d';

  static async register(data: RegisterData): Promise<{ user: User; accessToken: string; refreshToken: string }> {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const emailCheck = await client.query(
        'SELECT id FROM users WHERE email = $1',
        [data.email.toLowerCase()]
      );

      if (emailCheck.rows.length > 0) {
        throw new Error('Email already registered');
      }

      const usernameCheck = await client.query(
        'SELECT id FROM users WHERE username = $1',
        [data.username.toLowerCase()]
      );

      if (usernameCheck.rows.length > 0) {
        throw new Error('Username already taken');
      }

      const passwordHash = await bcrypt.hash(data.password, this.SALT_ROUNDS);

      const userResult = await client.query(
        `INSERT INTO users (email, password_hash, username, full_name)
         VALUES ($1, $2, $3, $4)
         RETURNING id, email, username, role, created_at`,
        [data.email.toLowerCase(), passwordHash, data.username.toLowerCase(), data.fullName]
      );

      const user = userResult.rows[0];

      const accessToken = this.generateAccessToken(user);
      const refreshToken = await this.generateRefreshToken(user.id, client);

      await client.query('COMMIT');

      // Приветственный бонус новым пользователям ($1), чтобы можно было сразу пользоваться чатом
      try {
        await BalanceService.bonus(user.id, 100, 'Welcome bonus', { source: 'registration' });
      } catch (bonusError) {
        console.warn('Welcome bonus failed for user', user.id, bonusError);
      }

      return {
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          role: user.role,
        },
        accessToken,
        refreshToken,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async login(data: LoginData): Promise<{ user: User; accessToken: string; refreshToken: string }> {
    const client = await pool.connect();

    try {
      const result = await client.query(
        `SELECT id, email, username, password_hash, role, is_active
         FROM users
         WHERE email = $1`,
        [data.email.toLowerCase()]
      );

      if (result.rows.length === 0) {
        throw new Error('Invalid credentials');
      }

      const user = result.rows[0];

      if (!user.is_active) {
        throw new Error('Account is deactivated');
      }

      const isValidPassword = await bcrypt.compare(data.password, user.password_hash);
      if (!isValidPassword) {
        throw new Error('Invalid credentials');
      }

      await client.query(
        'UPDATE users SET last_login_at = NOW() WHERE id = $1',
        [user.id]
      );

      const accessToken = this.generateAccessToken(user);
      const refreshToken = await this.generateRefreshToken(
        user.id,
        client,
        data.userAgent,
        data.ipAddress
      );

      return {
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          role: user.role,
        },
        accessToken,
        refreshToken,
      };
    } finally {
      client.release();
    }
  }

  static async refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    const client = await pool.connect();

    try {
      jwt.verify(refreshToken, this.REFRESH_TOKEN_SECRET) as { userId: string; jti: string };
      const tokenHash = this.hashToken(refreshToken);

      const tokenResult = await client.query(
        `SELECT rt.id, rt.user_id, u.email, u.username, u.role, u.is_active
         FROM refresh_tokens rt
         JOIN users u ON rt.user_id = u.id
         WHERE rt.token_hash = $1
           AND rt.expires_at > NOW()
           AND rt.revoked_at IS NULL`,
        [tokenHash]
      );

      if (tokenResult.rows.length === 0) {
        throw new Error('Invalid or expired refresh token');
      }

      const { user_id, email, username, role, is_active } = tokenResult.rows[0];

      if (!is_active) {
        throw new Error('Account is deactivated');
      }

      const user = { id: user_id, email, username, role };
      const newAccessToken = this.generateAccessToken(user);
      const newRefreshToken = await this.generateRefreshToken(user_id, client);

      await client.query(
        'UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = $1',
        [tokenHash]
      );

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      };
    } finally {
      client.release();
    }
  }

  static async logout(refreshToken: string): Promise<void> {
    const tokenHash = this.hashToken(refreshToken);

    await pool.query(
      'UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = $1',
      [tokenHash]
    );
  }

  private static generateAccessToken(user: { id: string; email: string; role: string }): string {
    return jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      this.ACCESS_TOKEN_SECRET,
      { expiresIn: this.ACCESS_TOKEN_EXPIRY } as jwt.SignOptions
    );
  }

  private static async generateRefreshToken(
    userId: string,
    client: any,
    userAgent?: string,
    ipAddress?: string
  ): Promise<string> {
    const jti = randomBytes(32).toString('hex');

    const refreshToken = jwt.sign(
      { userId, jti },
      this.REFRESH_TOKEN_SECRET,
      { expiresIn: this.REFRESH_TOKEN_EXPIRY } as jwt.SignOptions
    );

    const tokenHash = this.hashToken(refreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await client.query(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at, user_agent, ip_address)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, tokenHash, expiresAt, userAgent, ipAddress]
    );

    return refreshToken;
  }

  private static hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  static verifyAccessToken(token: string): { userId: string; email: string; role: string } {
    try {
      return jwt.verify(token, this.ACCESS_TOKEN_SECRET) as any;
    } catch {
      throw new Error('Invalid access token');
    }
  }

  static async getUserById(userId: string): Promise<User | null> {
    const result = await pool.query(
      'SELECT id, email, username, role FROM users WHERE id = $1 AND is_active = true',
      [userId]
    );
    if (result.rows.length === 0) return null;
    return result.rows[0];
  }

  /**
   * Login or register user with Google OAuth
   * @param credential - Google OAuth credential (JWT token)
   * @param userAgent - Optional user agent string
   * @param ipAddress - Optional IP address
   * @returns User info and tokens
   */
  static async loginWithGoogle(
    credential: string,
    userAgent?: string,
    ipAddress?: string
  ): Promise<{ user: User; accessToken: string; refreshToken: string; isNewUser: boolean }> {
    const client = await pool.connect();

    try {
      // Verify Google token
      const googleUser: GoogleUserInfo = await GoogleService.verifyGoogleToken(credential);

      await client.query('BEGIN');

      // Check if user exists by google_id
      let userResult = await client.query(
        `SELECT id, email, username, role, is_active, google_id, provider
         FROM users
         WHERE google_id = $1`,
        [googleUser.googleId]
      );

      let user;
      let isNewUser = false;

      if (userResult.rows.length === 0) {
        // Check if user exists by email (for linking accounts)
        const emailResult = await client.query(
          `SELECT id, email, username, role, is_active, google_id, provider
           FROM users
           WHERE email = $1`,
          [googleUser.email.toLowerCase()]
        );

        if (emailResult.rows.length > 0) {
          // Link Google account to existing email account
          const existingUser = emailResult.rows[0];

          if (!existingUser.is_active) {
            throw new Error('Account is deactivated');
          }

          // Update user with Google info
          await client.query(
            `UPDATE users
             SET google_id = $1, provider = 'google', picture = $2, 
                 email_verified = true, last_login_at = NOW()
             WHERE id = $3`,
            [googleUser.googleId, googleUser.picture, existingUser.id]
          );

          user = {
            id: existingUser.id,
            email: existingUser.email,
            username: existingUser.username,
            role: existingUser.role,
          };
        } else {
          // Create new user
          isNewUser = true;

          // Generate username from email or name
          let username = googleUser.name.toLowerCase().replace(/\s+/g, '_');
          
          // Check if username exists and make it unique
          const usernameCheck = await client.query(
            'SELECT id FROM users WHERE username = $1',
            [username]
          );

          if (usernameCheck.rows.length > 0) {
            username = `${username}_${randomBytes(4).toString('hex')}`;
          }

          const newUserResult = await client.query(
            `INSERT INTO users (email, username, full_name, google_id, provider, picture, email_verified)
             VALUES ($1, $2, $3, $4, 'google', $5, true)
             RETURNING id, email, username, role`,
            [
              googleUser.email.toLowerCase(),
              username,
              googleUser.name,
              googleUser.googleId,
              googleUser.picture,
            ]
          );

          user = newUserResult.rows[0];

          // Give welcome bonus to new Google users
          try {
            await BalanceService.bonus(user.id, 100, 'Welcome bonus (Google)', { 
              source: 'google_registration' 
            });
          } catch (bonusError) {
            console.warn('Welcome bonus failed for Google user', user.id, bonusError);
          }
        }
      } else {
        // User exists, update last login and picture
        user = userResult.rows[0];

        if (!user.is_active) {
          throw new Error('Account is deactivated');
        }

        await client.query(
          `UPDATE users
           SET picture = $1, last_login_at = NOW()
           WHERE id = $2`,
          [googleUser.picture, user.id]
        );
      }

      // Generate tokens
      const accessToken = this.generateAccessToken(user);
      const refreshToken = await this.generateRefreshToken(
        user.id,
        client,
        userAgent,
        ipAddress
      );

      await client.query('COMMIT');

      return {
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          role: user.role,
        },
        accessToken,
        refreshToken,
        isNewUser,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}


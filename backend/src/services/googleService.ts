import { OAuth2Client } from 'google-auth-library';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;

if (!GOOGLE_CLIENT_ID) {
  console.warn('⚠️  GOOGLE_CLIENT_ID not set. Google OAuth will not work.');
}

const client = new OAuth2Client(GOOGLE_CLIENT_ID);

export interface GoogleUserInfo {
  googleId: string;
  email: string;
  name: string;
  picture?: string;
  emailVerified: boolean;
}

export class GoogleService {
  /**
   * Verify Google ID token and extract user information
   * @param credential - Google OAuth credential (JWT token)
   * @returns User information from Google
   */
  static async verifyGoogleToken(credential: string): Promise<GoogleUserInfo> {
    try {
      const ticket = await client.verifyIdToken({
        idToken: credential,
        audience: GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();

      if (!payload) {
        throw new Error('Invalid Google token payload');
      }

      if (!payload.sub || !payload.email) {
        throw new Error('Missing required fields in Google token');
      }

      return {
        googleId: payload.sub,
        email: payload.email,
        name: payload.name || payload.email.split('@')[0],
        picture: payload.picture,
        emailVerified: payload.email_verified || false,
      };
    } catch (error) {
      console.error('Google token verification failed:', error);
      throw new Error('Invalid Google token');
    }
  }
}

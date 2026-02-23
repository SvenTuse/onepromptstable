export interface GoogleUserInfo {
    googleId: string;
    email: string;
    name: string;
    picture?: string;
    emailVerified: boolean;
}
export declare class GoogleService {
    /**
     * Verify Google ID token and extract user information
     * @param credential - Google OAuth credential (JWT token)
     * @returns User information from Google
     */
    static verifyGoogleToken(credential: string): Promise<GoogleUserInfo>;
}
//# sourceMappingURL=googleService.d.ts.map
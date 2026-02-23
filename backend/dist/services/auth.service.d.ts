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
export declare class AuthService {
    private static readonly SALT_ROUNDS;
    private static readonly ACCESS_TOKEN_SECRET;
    private static readonly REFRESH_TOKEN_SECRET;
    private static readonly ACCESS_TOKEN_EXPIRY;
    private static readonly REFRESH_TOKEN_EXPIRY;
    static register(data: RegisterData): Promise<{
        user: User;
        accessToken: string;
        refreshToken: string;
    }>;
    static login(data: LoginData): Promise<{
        user: User;
        accessToken: string;
        refreshToken: string;
    }>;
    static refreshAccessToken(refreshToken: string): Promise<{
        accessToken: string;
        refreshToken: string;
    }>;
    static logout(refreshToken: string): Promise<void>;
    private static generateAccessToken;
    private static generateRefreshToken;
    private static hashToken;
    static verifyAccessToken(token: string): {
        userId: string;
        email: string;
        role: string;
    };
    static getUserById(userId: string): Promise<User | null>;
    /**
     * Login or register user with Google OAuth
     * @param credential - Google OAuth credential (JWT token)
     * @param userAgent - Optional user agent string
     * @param ipAddress - Optional IP address
     * @returns User info and tokens
     */
    static loginWithGoogle(credential: string, userAgent?: string, ipAddress?: string): Promise<{
        user: User;
        accessToken: string;
        refreshToken: string;
        isNewUser: boolean;
    }>;
}
export {};
//# sourceMappingURL=auth.service.d.ts.map
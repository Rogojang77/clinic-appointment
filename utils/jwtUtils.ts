import { SignJWT, jwtVerify } from 'jose';

const secret = new TextEncoder().encode(process.env.SECRET!);

// TypeScript interface for JWT payload
export interface JWTPayload {
  id: string;
  email: string;
  username: string;
  role: string;
  isAdmin: boolean;
  iat?: number;
  exp?: number;
}

/**
 * Verifies a JWT token and returns the decoded payload
 * @param token - The JWT token to verify
 * @returns The decoded payload or null if verification fails
 */
export async function verifyJWT(token: string): Promise<JWTPayload | null> {
  try {
    if (!token || typeof token !== 'string') {
      return null;
    }

    // Verify the token using jose (Edge Runtime compatible)
    const { payload } = await jwtVerify(token, secret);
    
    // Type guard to ensure payload has required fields
    // Cast to Record<string, any> to safely access properties
    const payloadRecord = payload as Record<string, any>;
    if (
      payload &&
      typeof payload === 'object' &&
      'id' in payload &&
      'email' in payload &&
      'username' in payload &&
      'role' in payload
    ) {
      // Convert jose JWTPayload to our custom JWTPayload type
      return {
        id: String(payloadRecord.id),
        email: String(payloadRecord.email),
        username: String(payloadRecord.username),
        role: String(payloadRecord.role),
        isAdmin: Boolean(payloadRecord.isAdmin),
        iat: typeof payloadRecord.iat === 'number' ? payloadRecord.iat : undefined,
        exp: typeof payloadRecord.exp === 'number' ? payloadRecord.exp : undefined,
      } as JWTPayload;
    }
    
    return null;
  } catch (error) {
    // Silently fail for expired/invalid tokens (don't log sensitive errors)
    if (error instanceof Error && error.name === 'JWTExpired') {
      return null;
    }
    return null;
  }
}

/**
 * Creates a short-lived access JWT token (15 minutes)
 * @param payload - The payload to encode in the token
 * @returns The JWT token string or null if creation fails
 */
export async function createAccessToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): Promise<string | null> {
  try {
    if (!payload || !payload.id || !payload.email) {
      throw new Error('Invalid payload: missing required fields');
    }

    const token = await new SignJWT(payload as Record<string, any>)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('15m') // Short-lived access token
      .sign(secret);
    
    return token;
  } catch (error) {
    console.error("Access token creation failed:", error);
    return null;
  }
}

/**
 * Creates a long-lived refresh JWT token (30 days)
 * @param payload - The payload to encode in the token
 * @returns The JWT token string or null if creation fails
 */
export async function createRefreshToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): Promise<string | null> {
  try {
    if (!payload || !payload.id || !payload.email) {
      throw new Error('Invalid payload: missing required fields');
    }

    const token = await new SignJWT(payload as Record<string, any>)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('30d') // Long-lived refresh token
      .sign(secret);
    
    return token;
  } catch (error) {
    console.error("Refresh token creation failed:", error);
    return null;
  }
}

/**
 * Legacy function for backward compatibility
 * Creates a JWT token with the provided payload (defaults to access token)
 * @deprecated Use createAccessToken or createRefreshToken instead
 */
export async function createJWT(payload: Omit<JWTPayload, 'iat' | 'exp'>): Promise<string | null> {
  return createAccessToken(payload);
}

/**
 * Checks if a token is expired without full verification
 * Useful for client-side checks
 * @param token - The JWT token to check
 * @returns True if token is expired or invalid, false otherwise
 */
export function isTokenExpiredSync(token: string): boolean {
  try {
    if (!token || typeof token !== 'string') {
      return true;
    }

    const parts = token.split('.');
    if (parts.length !== 3) {
      return true;
    }

    let payload;
    try {
      payload = JSON.parse(atob(parts[1]));
    } catch (parseError) {
      // Invalid base64 or JSON in token payload
      return true;
    }
    const expirationDate = payload.exp;

    if (!expirationDate || typeof expirationDate !== 'number') {
      return true;
    }

    // Check if token is expired (with 5 second buffer for clock skew)
    return expirationDate * 1000 < Date.now() - 5000;
  } catch (error) {
    return true;
  }
}

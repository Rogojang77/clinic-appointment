import { verifyJWT } from './jwtUtils';

/**
 * Checks if a token is expired by performing full JWT verification
 * This is the async version that does full cryptographic verification
 * For client-side quick checks, use isTokenExpiredSync from jwtUtils
 * @param token - The JWT token to check
 * @returns True if token is expired or invalid, false otherwise
 */
export const isTokenExpired = async (token: string): Promise<boolean> => {
  try {
    if (!token || typeof token !== 'string') {
      return true;
    }

    const payload = await verifyJWT(token);
    return payload === null; // If verification fails, token is expired/invalid
  } catch (err) {
    return true; // If verification fails, consider the token as expired
  }
};

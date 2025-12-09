import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT, JWTPayload } from './jwtUtils';

/**
 * Result of authentication check
 */
export interface AuthResult {
  success: boolean;
  payload?: JWTPayload;
  error?: string;
  statusCode?: number;
}

/**
 * Extracts Bearer token from Authorization header
 * @param request - The Next.js request object
 * @returns The token string or null if not found
 */
function extractTokenFromHeader(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  return authHeader.substring(7); // Remove 'Bearer ' prefix
}

/**
 * Authenticates a request by verifying the JWT token from Authorization header
 * @param request - The Next.js request object
 * @returns AuthResult with success status and payload or error details
 */
export async function authenticateRequest(
  request: NextRequest
): Promise<AuthResult> {
  const token = extractTokenFromHeader(request);

  if (!token) {
    return {
      success: false,
      error: 'Authentication required',
      statusCode: 401,
    };
  }

  const payload = await verifyJWT(token);

  if (!payload) {
    return {
      success: false,
      error: 'Invalid or expired token',
      statusCode: 401,
    };
  }

  return {
    success: true,
    payload,
  };
}

/**
 * Middleware helper to check if user has required role
 * @param payload - The JWT payload
 * @param requiredRole - The required role (optional)
 * @returns True if user has the required role
 */
export function hasRequiredRole(
  payload: JWTPayload,
  requiredRole?: string
): boolean {
  if (!requiredRole) {
    return true;
  }

  return payload.role === requiredRole;
}

/**
 * Middleware helper to check if user is admin
 * @param payload - The JWT payload
 * @returns True if user is admin
 */
export function isAdmin(payload: JWTPayload): boolean {
  return payload.role === 'admin' && payload.isAdmin === true;
}

/**
 * Middleware helper to check if user is super admin
 * @param payload - The JWT payload
 * @returns True if user is super admin
 */
export function isSuperAdmin(payload: JWTPayload): boolean {
  return isAdmin(payload);
}

/**
 * Creates an authentication error response
 * @param error - Error message
 * @param statusCode - HTTP status code (default: 401)
 * @returns NextResponse with error
 */
export function createAuthErrorResponse(
  error: string,
  statusCode: number = 401
): NextResponse {
  return NextResponse.json(
    { message: error, success: false },
    { status: statusCode }
  );
}

/**
 * Wrapper for API route handlers that require authentication
 * Usage:
 * ```ts
 * export async function GET(request: NextRequest) {
 *   const authResult = await authenticateRequest(request);
 *   if (!authResult.success) {
 *     return createAuthErrorResponse(authResult.error!, authResult.statusCode);
 *   }
 *   // Use authResult.payload for authenticated user data
 * }
 * ```
 */
export async function requireAuth(
  request: NextRequest
): Promise<{ payload: JWTPayload } | NextResponse> {
  const authResult = await authenticateRequest(request);
  
  if (!authResult.success) {
    return createAuthErrorResponse(
      authResult.error!,
      authResult.statusCode || 401
    );
  }

  return { payload: authResult.payload! };
}


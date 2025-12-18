import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyJWT } from "./utils/jwtUtils";
import { isSuperAdmin } from "./utils/authHelpers";

/**
 * Public routes that don't require authentication
 */
const PUBLIC_ROUTES = ["/", "/doctors"];

/**
 * Routes that require authentication
 */
const PROTECTED_ROUTES = ["/dashboard"];

/**
 * Routes that require super admin access
 */
const SUPER_ADMIN_ROUTES = ["/superadmin"];

/**
 * Check if a path matches any route pattern
 */
function matchesRoute(path: string, routes: string[]): boolean {
  return routes.some((route) => {
    if (route.endsWith(":path*")) {
      const baseRoute = route.replace(":path*", "");
      return path === baseRoute || path.startsWith(baseRoute);
    }
    return path === route || path.startsWith(`${route}/`);
  });
}

/**
 * Check if path is a public route
 */
function isPublicRoute(path: string): boolean {
  return PUBLIC_ROUTES.some((route) => {
    if (route === "/") {
      return path === "/";
    }
    return path === route || path.startsWith(`${route}/`);
  });
}

/**
 * Check if path is a protected route
 */
function isProtectedRoute(path: string): boolean {
  return PROTECTED_ROUTES.some((route) => {
    return path === route || path.startsWith(`${route}/`);
  });
}

/**
 * Check if path is a super admin route
 */
function isSuperAdminRoute(path: string): boolean {
  return SUPER_ADMIN_ROUTES.some((route) => {
    return path.startsWith(`${route}/`) || path === route;
  });
}

/**
 * Extracts Bearer token from Authorization header
 */
function extractTokenFromHeader(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  return authHeader.substring(7); // Remove 'Bearer ' prefix
}

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const token = extractTokenFromHeader(request);

  // Skip middleware for static files and Next.js internals
  if (
    path.startsWith("/_next") ||
    path.startsWith("/static") ||
    path.includes(".") ||
    path === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  // Public API routes that don't require authentication
  // Note: /api/auth/refresh uses refresh token cookie, not Authorization header
  const PUBLIC_API_ROUTES = ["/api/login", "/api/register", "/api/logout", "/api/auth/refresh"];
  const isPublicApiRoute = PUBLIC_API_ROUTES.some(route => path === route || path.startsWith(`${route}/`));

  // Handle API routes
  if (path.startsWith("/api")) {
    // Allow public API routes
    if (isPublicApiRoute) {
      return NextResponse.next();
    }

    // All other API routes require authentication
    if (!token) {
      return NextResponse.json(
        { message: "Authentication required", success: false },
        { status: 401 }
      );
    }

    // Verify token for API routes
    const payload = await verifyJWT(token);
    if (!payload) {
      const response = NextResponse.json(
        { message: "Invalid or expired token", success: false },
        { status: 401 }
      );
      response.cookies.delete("token");
      return response;
    }

    // Check super admin routes
    if (path.startsWith("/api/dashboard") || path.startsWith("/api/superadmin")) {
      if (!isSuperAdmin(payload)) {
        return NextResponse.json(
          { message: "Unauthorized: Super admin access required", success: false },
          { status: 403 }
        );
      }
    }

    // Allow authenticated API requests
    return NextResponse.next();
  }

  // Handle page routes (non-API)
  // Note: For page routes, we allow access and let client-side handle authentication
  // since browsers don't send Authorization headers for page navigation.
  // The useAuthEffect hook will handle redirects client-side.
  if (!path.startsWith("/api")) {
    // Allow all page routes - client-side will handle auth checks
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc.)
     * 
     * Note: API routes are now included and protected by middleware
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)).*)",
  ],
};

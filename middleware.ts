import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyJWT } from "./utils/jwtUtils";

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  const ispublic = path === "/" || path === "/doctors";
  const isSuperAdminRoute = path.startsWith("/superadmin");

  const token = request.cookies.get("token")?.value || "";

  if (ispublic && token && path === "/") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (!ispublic && !token) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Check SuperAdmin access
  if (isSuperAdminRoute && token) {
    try {
      const payload = await verifyJWT(token);
      if (!payload || payload.role !== 'admin' || !payload.isAdmin) {
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
    } catch (error) {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }
}

export const config = {
  matcher: [
    "/",
    "/doctors/:path*",
    "/dashboard",
    "/superadmin/:path*",
  ],
};

// export const config = {
//   matcher: ["/", "/doctors", "/dashboard","/((?!api|_next|favicon.ico).*)"],
// };

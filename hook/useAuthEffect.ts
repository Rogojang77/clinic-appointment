import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useUserStore } from "@/store/store";
import { getToken, removeToken } from "@/utils/tokenStorage";
import { isTokenExpiredSync } from "@/utils/jwtUtils";

/**
 * Hook to handle authentication checks and token validation
 * Automatically redirects to login if token is missing or expired
 */
export const useAuthEffect = () => {
  const { clearUser } = useUserStore();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const checkToken = async () => {
      const token = getToken();

      // Public routes don't need token validation
      const publicRoutes = ["/", "/doctors"];
      const isPublicRoute = publicRoutes.includes(pathname) || 
                           pathname.startsWith("/doctors/");

      if (isPublicRoute) {
        return; // Allow access to public routes
      }

      if (!token) {
        // No token found, redirect to login
        clearUser();
        const loginUrl = new URL("/", window.location.origin);
        loginUrl.searchParams.set("session", "invalid");
        loginUrl.searchParams.set("redirect", pathname);
        router.push(loginUrl.toString());
        return;
      }

      // Check if token is expired using sync check (client-side)
      if (isTokenExpiredSync(token)) {
        // Token is expired, clear user state and redirect
        clearUser();
        removeToken();
        const loginUrl = new URL("/", window.location.origin);
        loginUrl.searchParams.set("session", "expired");
        loginUrl.searchParams.set("redirect", pathname);
        router.push(loginUrl.toString());
        return;
      }

      // Token exists and appears valid (full verification happens server-side)
      // Client-side check is just for UX, server will verify on each request
    };

    checkToken();
  }, [clearUser, router, pathname]);
};

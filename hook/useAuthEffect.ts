import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useUserStore } from "@/store/store";
import { getToken, removeToken, setToken } from "@/utils/tokenStorage";
import { isTokenExpiredSync } from "@/utils/jwtUtils";
import axios from "axios";

/**
 * Hook to handle authentication checks and token validation
 * Automatically refreshes token if expired, redirects to login if refresh fails
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
        // No access token found, try to refresh using refresh token cookie
        try {
          const response = await axios.post('/api/auth/refresh', {}, {
            withCredentials: true, // Include cookies
          });

          const { accessToken } = response.data;
          if (accessToken) {
            setToken(accessToken);
            // Token refreshed successfully, user can stay on page
            return;
          }
        } catch (refreshError) {
          // Refresh failed, redirect to login
          clearUser();
          removeToken();
          // Use relative path for redirect (works correctly with current origin)
          const loginUrl = `/?session=invalid${pathname ? `&redirect=${encodeURIComponent(pathname)}` : ''}`;
          router.push(loginUrl);
          return;
        }
      }

      // Check if access token is expired using sync check (client-side)
      if (token && isTokenExpiredSync(token)) {
        // Access token expired, try to refresh using refresh token cookie
        try {
          const response = await axios.post('/api/auth/refresh', {}, {
            withCredentials: true, // Include cookies
          });

          const { accessToken } = response.data;
          if (accessToken) {
            setToken(accessToken);
            // Token refreshed successfully, user can stay on page
            return;
          }
        } catch (refreshError) {
          // Refresh failed, clear user state and redirect
          clearUser();
          removeToken();
          // Use relative path for redirect (works correctly with current origin)
          const loginUrl = `/?session=expired${pathname ? `&redirect=${encodeURIComponent(pathname)}` : ''}`;
          router.push(loginUrl);
          return;
        }
      }

      // Token exists and appears valid (full verification happens server-side)
      // Client-side check is just for UX, server will verify on each request
    };

    checkToken();
  }, [clearUser, router, pathname]);
};

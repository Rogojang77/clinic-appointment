import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUserStore } from "@/store/store";
import Cookies from "js-cookie";

export const useAuthEffect = () => {
  const { clearUser } = useUserStore();
  const router = useRouter();

  useEffect(() => {
    const checktoken = () => {
      const token = Cookies.get("token");

      if (token) {
        try {
          // Decode token to check its expiration date
          const decodedToken = JSON.parse(atob(token.split(".")[1]));
          const expirationDate = decodedToken.exp;

          // If the token is expired, clear the user and redirect with `session=invalid`
          if (expirationDate * 1000 < Date.now()) {
            clearUser();
            Cookies.remove("token");
            router.push("/?session=invalid");
          }
        } catch (error) {
          console.error("Error decoding token:", error);
          clearUser();
          Cookies.remove("token");
          router.push("/?session=invalid");
        }
      } else {
        // If no token is found, redirect to login with `session=invalid`
        router.push("/?session=invalid");
      }
    };

    checktoken();
  }, [clearUser, router]);
};

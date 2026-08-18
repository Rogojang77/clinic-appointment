import * as Yup from "yup";
import { copy } from "@/lib/copy";

export const ALLOWED_REDIRECT_PREFIXES = [
  "/dashboard",
  "/doctor",
  "/doctors",
  "/superadmin",
];

export function isRedirectAllowed(path: string | null): boolean {
  if (!path || typeof path !== "string") return false;
  const decoded = decodeURIComponent(path);
  if (!decoded.startsWith("/")) return false;
  return ALLOWED_REDIRECT_PREFIXES.some(
    (p) => decoded === p || decoded.startsWith(p + "/")
  );
}

export const signInSchema = Yup.object().shape({
  email: Yup.string().email(copy.invalidEmail).required(copy.emailRequired),
  password: Yup.string()
    .min(6, copy.passwordMinLength)
    .required(copy.passwordRequired),
});

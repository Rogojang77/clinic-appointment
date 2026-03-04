"use client";
import { Formik, Form, Field, ErrorMessage } from "formik";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import api from "@/services/api";
import * as Yup from "yup";
import { useState } from "react";
import toast from "react-hot-toast";
import { useUserStore } from "@/store/store";
import { setToken } from "@/utils/tokenStorage";
import { Eye, EyeOff } from "lucide-react";
import { copy } from "@/lib/copy";

const ALLOWED_REDIRECT_PREFIXES = ["/dashboard", "/doctor", "/doctors", "/superadmin"];

function isRedirectAllowed(path: string | null): boolean {
  if (!path || typeof path !== "string") return false;
  const decoded = decodeURIComponent(path);
  if (!decoded.startsWith("/")) return false;
  return ALLOWED_REDIRECT_PREFIXES.some((p) => decoded === p || decoded.startsWith(p + "/"));
}

const signInSchema = Yup.object().shape({
  email: Yup.string()
    .email(copy.invalidEmail)
    .required(copy.emailRequired),
  password: Yup.string()
    .min(6, copy.passwordMinLength)
    .required(copy.passwordRequired),
});

const SignIn = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { setUser } = useUserStore();

  const redirectParam = searchParams.get("redirect");
  const sessionParam = searchParams.get("session");
  const showSessionExpired = sessionParam === "expired" || sessionParam === "invalid";

  const handleSubmit = async (values: any) => {
    try {
      setIsLoading(true);
      const response = await api.post("/login", values, {
        withCredentials: true,
      });
      if (response.status === 200) {
        const { user, accessToken } = response.data;
        setUser(user);
        setToken(accessToken);
        let target = (redirectParam && isRedirectAllowed(redirectParam)) ? decodeURIComponent(redirectParam) : "/dashboard";
        if (!redirectParam && user?.role === "doctor") target = "/doctor";
        router.push(target);
        toast.success(copy.loginSuccess);
      } else {
        toast.error(response.data?.message || copy.somethingWrong);
      }
    } catch (err: any) {
      const status = err.response?.status;
      const message = err.response?.data?.message;
      if (status === 404 && (message === "User not found!" || message === "Invalid Credentials")) {
        toast.error(copy.invalidCredentials);
      } else if (status === 503) {
        toast.error(copy.serviceUnavailable);
      } else if (status === 500) {
        toast.error(copy.serverError);
      } else if (status === 400) {
        toast.error(copy.completeEmailPassword);
      } else {
        toast.error(copy.somethingWrong);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-100">
      <div className="flex justify-center items-center pb-4">
        <Image
          src="/mos2.jpg"
          alt="logo"
          width={80}
          height={80}
          className="rounded-lg "
        />
      </div>
      <div className="w-full max-w-md p-8 space-y-4 bg-white shadow-md rounded-md">
        <h2 className="text-2xl font-bold text-center text-gray-800">
          {copy.login}
        </h2>
        {showSessionExpired && (
          <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2" role="alert">
            {copy.sessionExpired}
          </p>
        )}

        <Formik
          initialValues={{ email: "", password: "" }}
          onSubmit={handleSubmit}
          validationSchema={signInSchema}
        >
          {({ isSubmitting }: { isSubmitting: any }) => (
            <Form className="space-y-6">
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-700"
                >
                  Email
                </label>
                <Field
                  type="email"
                  name="email"
                  id="email"
                  className="mt-1 block w-full p-2 border rounded-md border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <ErrorMessage
                  name="email"
                  component="p"
                  className="mt-2 text-sm text-red-500"
                />
              </div>

              <div className="relative">
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-gray-700"
                >
                  Password
                </label>
                <Field
                  type={showPassword ? "text" : "password"}
                  name="password"
                  id="password"
                  className="mt-1 block w-full p-2 border rounded-md border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-2 top-8 items-center "
                >
                  {showPassword ? <Eye /> : <EyeOff />}
                </div>
                <ErrorMessage
                  name="password"
                  component="p"
                  className="mt-2 text-sm text-red-500"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting || isLoading}
                className="w-full py-2 px-4 bg-blue-500 text-white font-semibold rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                {isSubmitting || isLoading ? copy.signingIn : copy.login}
              </button>
            </Form>
          )}
        </Formik>
      </div>
    </div>
  );
};

export default SignIn;

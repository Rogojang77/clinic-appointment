"use client";
import { Formik, Form, Field, ErrorMessage } from "formik";
import Image from "next/image";
import { useRouter } from "next/navigation";
import axios from "axios";
import * as Yup from "yup";
import { useState } from "react";
import toast from "react-hot-toast";
import { useUserStore } from "@/store/store";
import { useAuthEffect } from "@/hook/useAuthEffect";
import Cookies from "js-cookie";
import { Eye, EyeOff } from "lucide-react";

const signInSchema = Yup.object().shape({
  email: Yup.string()
    .email("Invalid email address")
    .required("Email is required"),
  password: Yup.string()
    .min(6, "Password must be at least 6 characters")
    .required("Password is required"),
});

const SignIn = () => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false); // State to toggle password visibility
  const { setUser } = useUserStore();

  const handleSubmit = async (values: any) => {
    try {
      setIsLoading(true);
      const response = await axios.post("/api/login", values);
      if (response.status === 200) {
        const { user, token } = response.data;
        setUser(user);
        // Set the token in cookies
        Cookies.set("token", token, { expires: 7 });
        router.push("/dashboard");
        toast.success("Signin Successfully!");
      } else {
        toast.error(response.statusText || "Something went wrong!");
      }
    } catch (err) {
      console.error(err);
      toast.error("Something went wrong !");
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
          Sign In
        </h2>

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
                {isSubmitting || isLoading ? "Signing in..." : "Sign In"}
              </button>
            </Form>
          )}
        </Formik>
      </div>
    </div>
  );
};

export default SignIn;

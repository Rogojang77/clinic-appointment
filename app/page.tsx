'use client';
import { Suspense } from "react";
import SignIn from "@/components/login";

export const dynamic = 'force-dynamic';

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center h-screen bg-gray-100">
          <div className="w-full max-w-md p-8 bg-white shadow-md rounded-md animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/2 mx-auto mb-6" />
            <div className="h-10 bg-gray-200 rounded mb-4" />
            <div className="h-10 bg-gray-200 rounded" />
          </div>
        </div>
      }
    >
      <SignIn />
    </Suspense>
  );
}

"use client";

import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SSOCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    // Handle any post-authentication logic here
    const handleSignInComplete = () => {
      // Redirect to dashboard after successful authentication
      router.push("/dashboard");
    };

    // Set up a timeout to redirect if the callback takes too long
    const timeout = setTimeout(() => {
      router.push("/dashboard");
    }, 10000); // 10 seconds

    return () => clearTimeout(timeout);
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 text-center">
        <div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Completing sign in...
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Please wait while we finish setting up your account.
          </p>
        </div>
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
        <AuthenticateWithRedirectCallback />
      </div>
    </div>
  );
}
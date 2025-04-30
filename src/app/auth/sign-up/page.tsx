"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseClient } from "@/helpers/supabase/client";
import Link from "next/link"; // Import Link

export default function SignUp() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    const { error: signUpError } = await supabaseClient.auth.signUp({
      // Renamed error variable
      email,
      password,
      options: {
        // Optional: Add email redirect URL if needed for verification flow
        // emailRedirectTo: `${location.origin}/auth/callback`,
      },
    });

    setLoading(false); // Set loading false

    if (signUpError) {
      setError(signUpError.message);
    } else {
      setMessage(
        "Sign up successful! Please check your email to verify your account.",
      );
      // Keep user on this page to see the message, or redirect after delay
      setTimeout(() => router.push("/auth/sign-in"), 3000);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-900 p-4">
      <div className="w-full max-w-md space-y-6 rounded-sm bg-zinc-800 p-8 shadow-md">
        <h1 className="text-center text-2xl font-bold text-zinc-100">
          Sign Up
        </h1>
        <form onSubmit={handleSignUp} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-zinc-400"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1 block w-full rounded-sm border border-zinc-600 bg-zinc-700 px-3 py-2 text-zinc-100 shadow-sm placeholder-zinc-500 focus:border-teal-500 focus:outline-none focus:ring-teal-500 sm:text-sm"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-zinc-400"
            >
              Password (min. 6 characters)
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6} // Add minLength validation
              className="mt-1 block w-full rounded-sm border border-zinc-600 bg-zinc-700 px-3 py-2 text-zinc-100 shadow-sm placeholder-zinc-500 focus:border-teal-500 focus:outline-none focus:ring-teal-500 sm:text-sm"
              placeholder="••••••••"
            />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          {message && <p className="text-sm text-emerald-400">{message}</p>}
          <button
            type="submit"
            disabled={loading}
            className="flex w-full justify-center rounded-sm border border-transparent bg-teal-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 focus:ring-offset-zinc-800 disabled:opacity-50"
          >
            {loading ? "Signing Up..." : "Sign Up"}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-zinc-400">
          Already have an account?{" "}
          <Link
            href="/auth/sign-in"
            className="font-medium text-teal-400 hover:text-teal-300"
          >
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}

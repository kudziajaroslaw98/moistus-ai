"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseClient } from "@/helpers/supabase/client";
import Link from "next/link"; // Import Link

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await supabaseClient.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false); // Set loading false regardless of outcome

    if (error) {
      setError(error.message);
    } else {
      // Redirect to the main app page or dashboard after successful login
      router.push("/dashboard"); // Redirect to dashboard
      router.refresh(); // Force refresh to ensure layout updates
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-900 p-4">
      <div className="w-full max-w-md space-y-6 rounded-sm bg-zinc-800 p-8 shadow-md">
        <h1 className="text-center text-2xl font-bold text-zinc-100">
          Sign In
        </h1>
        <form onSubmit={handleSignIn} className="space-y-4">
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
              className="mt-1 block w-full rounded-sm border border-zinc-600 bg-zinc-700 px-3 py-2 text-zinc-100 placeholder-zinc-500 shadow-sm focus:border-teal-500 focus:ring-teal-500 focus:outline-none sm:text-sm"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-zinc-400"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="mt-1 block w-full rounded-sm border border-zinc-600 bg-zinc-700 px-3 py-2 text-zinc-100 placeholder-zinc-500 shadow-sm focus:border-teal-500 focus:ring-teal-500 focus:outline-none sm:text-sm"
              placeholder="••••••••"
            />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="flex w-full justify-center rounded-sm border border-transparent bg-teal-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-teal-700 focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 focus:ring-offset-zinc-800 focus:outline-none disabled:opacity-50"
          >
            {loading ? "Signing In..." : "Sign In"}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-zinc-400">
          Don&apos;t have an account?{" "}
          <Link
            href="/auth/sign-up"
            className="font-medium text-teal-400 hover:text-teal-300"
          >
            Sign Up
          </Link>
        </p>
      </div>
    </div>
  );
}

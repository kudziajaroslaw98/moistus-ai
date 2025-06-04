"use client";

import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { createClient } from "@/helpers/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

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

    const { error: signUpError } = await createClient().auth.signUp({
      email,
      password,
      options: {},
    });

    setLoading(false);

    if (signUpError) {
      setError(signUpError.message);
    } else {
      setMessage(
        "Sign up successful! Please check your email to verify your account.",
      );
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
          <FormField id="email" label="Email">
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
            />
          </FormField>

          <FormField id="password" label="Password (min. 6 characters)">
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              placeholder="••••••••"
            />
          </FormField>

          {error && <p className="text-sm text-red-400">{error}</p>}

          {message && <p className="text-sm text-emerald-400">{message}</p>}

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Signing Up..." : "Sign Up"}
          </Button>
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

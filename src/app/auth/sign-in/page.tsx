"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseClient } from "@/helpers/supabase/client";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";

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

    setLoading(false);

    if (error) {
      setError(error.message);
    } else {
      router.push("/dashboard");
      router.refresh();
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-900 p-4">
      <div className="w-full max-w-md space-y-6 rounded-sm bg-zinc-800 p-8 shadow-md">
        <h1 className="text-center text-2xl font-bold text-zinc-100">
          Sign In
        </h1>
        <form onSubmit={handleSignIn} className="space-y-4">
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

          <FormField id="password" label="Password">
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
            />
          </FormField>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Signing In..." : "Sign In"}
          </Button>
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

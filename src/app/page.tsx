import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-[32px] row-start-2 items-center sm:items-start">
        <h1 className="text-4xl font-bold text-zinc-100">Mind Map AI App</h1>
        <p className="text-lg text-zinc-400">
          AI-powered mind mapping and information organization
        </p>
        <div className="flex gap-[24px] flex-wrap items-center justify-center">
          <Link
            className="flex items-center gap-2 hover:underline hover:underline-offset-4"
            href="/auth/sign-in"
          >
            Sign In
          </Link>
          <Link
            className="flex items-center gap-2 hover:underline hover:underline-offset-4"
            href="/auth/sign-up"
          >
            Sign Up
          </Link>

          <Link
            className="flex items-center gap-2 hover:underline hover:underline-offset-4"
            href="/dashboard"
          >
            Dashboard
          </Link>
        </div>
      </main>
    </div>
  );
}

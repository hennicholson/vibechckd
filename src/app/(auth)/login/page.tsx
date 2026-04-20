"use client";

import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Input from "@/components/Input";
import Button from "@/components/Button";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const resetSuccess = searchParams.get("reset") === "success";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Please enter your email and password");
      return;
    }

    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email: email.trim().toLowerCase(),
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid email or password");
      } else {
        router.push("/dashboard");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1 className="text-[20px] font-semibold text-text-primary tracking-[-0.02em] text-center">
        Sign in
      </h1>
      <p className="text-[13px] text-text-muted text-center mt-1 mb-6">
        Welcome back to vibechckd
      </p>

      {resetSuccess && (
        <p className="text-[12px] text-green-600 bg-green-50 border border-green-200 rounded-lg px-3 py-2 mb-4 text-center">
          Password reset successfully. Sign in with your new password.
        </p>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <div>
          <Input
            label="Password"
            type="password"
            placeholder="Your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <div className="mt-1.5 text-right">
            <Link href="/forgot-password" className="text-[12px] text-text-muted hover:text-text-primary transition-colors">
              Forgot password?
            </Link>
          </div>
        </div>

        {error && (
          <p className="text-[12px] text-negative">{error}</p>
        )}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Signing in..." : "Sign in"}
        </Button>
      </form>

      <p className="text-[13px] text-text-muted text-center mt-5">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="text-text-primary font-medium hover:underline">
          Sign up
        </Link>
      </p>

      <p className="text-[11px] text-text-muted text-center mt-3">
        New to vibechckd?{" "}
        <Link href="/register?role=client" className="text-text-secondary hover:text-text-primary transition-colors">
          Sign up as a client
        </Link>
        {" "}&middot;{" "}
        <Link href="/register?role=coder" className="text-text-secondary hover:text-text-primary transition-colors">
          Sign up as a coder
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}

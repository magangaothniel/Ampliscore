"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

function Logo() {
  return (
    <svg width="32" height="32" viewBox="0 0 64 64" fill="none">
      <defs>
        <linearGradient id="capG_login" x1="0" y1="64" x2="64" y2="0">
          <stop offset="0" stopColor="#5B21B6" />
          <stop offset="1" stopColor="#7C3AED" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill="#EDE9FE" />
      <g transform="translate(32,34) scale(0.78) translate(-32,-29)">
        <path d="M32 11 L59 23.5 L32 36 L5 23.5 Z" stroke="url(#capG_login)" strokeWidth="4.6" strokeLinejoin="round" />
        <path d="M16.5 29 L16.5 41.5 C16.5 46.8 47.5 46.8 47.5 41.5 L47.5 29" stroke="url(#capG_login)" strokeWidth="4.6" strokeLinecap="round" />
        <path d="M59 23.5 L59 39.5" stroke="url(#capG_login)" strokeWidth="4" strokeLinecap="round" />
        <circle cx="59" cy="45.6" r="4.9" fill="#7C3AED" stroke="#FFFFFF" strokeWidth="2.4" />
      </g>
    </svg>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push("/dashboard");
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: "https://ampliscore.vercel.app/auth/confirm",
      },
    });
  };

  return (
    <main className="min-h-screen bg-[#F5F3FF] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center justify-center gap-2 mb-6">
            <Logo />
            <span className="font-display text-lg font-bold text-ink-900">ampli<span className="text-brand-600">score</span></span>
          </Link>
          <h1 className="font-display text-3xl font-bold text-ink-900 tracking-tight">Welcome back</h1>
          <p className="text-sm text-ink-600 mt-1.5">Pick up where your semester left off.</p>
        </div>
        <div className="bg-white rounded-xl border border-ink-200 shadow-card p-7 md:p-8">
          <button
            onClick={handleGoogleLogin}
            disabled={googleLoading}
            className="w-full flex items-center justify-center gap-3 border border-ink-200 h-11 rounded-lg text-sm font-medium text-ink-900 hover:bg-brand-50 transition-colors mb-4 disabled:opacity-50"
          >
            <svg width="18" height="18" viewBox="0 0 18 18">
              <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 002.38-5.88c0-.57-.05-.66-.15-1.18z"/>
              <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 01-7.18-2.54H1.83v2.07A8 8 0 008.98 17z"/>
              <path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 010-3.04V5.41H1.83a8 8 0 000 7.18l2.67-2.07z"/>
              <path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 001.83 5.4L4.5 7.49a4.77 4.77 0 014.48-3.31z"/>
            </svg>
            {googleLoading ? "Redirecting..." : "Continue with Google"}
          </button>
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-purple-100" />
            <span className="text-xs text-purple-900/30">or</span>
            <div className="flex-1 h-px bg-purple-100" />
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-ink-600 mb-1.5">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="you@university.edu" required
                className="w-full px-4 h-11 rounded-lg border border-ink-200 text-sm bg-white focus:outline-none focus:border-brand-600 focus:ring-3 focus:ring-brand-100 transition-colors" />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-ink-600 mb-1.5">Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••" required
                className="w-full px-4 h-11 rounded-lg border border-ink-200 text-sm bg-white focus:outline-none focus:border-brand-600 focus:ring-3 focus:ring-brand-100 transition-colors" />
            </div>
            {error && <div className="bg-white text-bad text-sm px-4 py-3 rounded-lg border border-ink-200">{error}</div>}
            <button type="submit" disabled={loading}
              className="w-full bg-brand-600 text-white h-11 rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors disabled:opacity-50">
              {loading ? "Logging in..." : "Log in"}
            </button>
          </form>
          <p className="text-center text-sm text-ink-600 mt-6">
            <Link href="/reset-password" className="text-purple-600 hover:underline text-sm block text-center mb-4">Forgot password?</Link>
          Don't have an account?{" "}
            <Link href="/register" className="text-brand-600 font-medium hover:text-brand-700">Sign up free</Link>
          </p>
        </div>
      </div>
    </main>
  );
}

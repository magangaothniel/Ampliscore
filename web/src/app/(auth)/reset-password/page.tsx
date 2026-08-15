"use client";
import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";

function Logo() {
  return (
    <svg aria-hidden="true" width="32" height="32" viewBox="0 0 64 64" fill="none">
      <defs>
        <linearGradient id="capG_resetpassword" x1="0" y1="64" x2="64" y2="0">
          <stop offset="0" stopColor="#5B21B6" />
          <stop offset="1" stopColor="#7C3AED" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill="#EDE9FE" />
      <g transform="translate(32,34) scale(0.78) translate(-32,-29)">
        <path d="M32 11 L59 23.5 L32 36 L5 23.5 Z" stroke="url(#capG_resetpassword)" strokeWidth="4.6" strokeLinejoin="round" />
        <path d="M16.5 29 L16.5 41.5 C16.5 46.8 47.5 46.8 47.5 41.5 L47.5 29" stroke="url(#capG_resetpassword)" strokeWidth="4.6" strokeLinecap="round" />
        <path d="M59 23.5 L59 43" stroke="url(#capG_resetpassword)" strokeWidth="4" strokeLinecap="round" />
        <circle cx="59" cy="45.6" r="4.9" fill="#7C3AED" />
      </g>
    </svg>
  );
}

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: "https://ampliscore.app/update-password",
    });
    if (error) setError(error.message);
    else setSent(true);
    setLoading(false);
  };

  return (
    <main className="min-h-screen bg-brand-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center justify-center gap-2 mb-6">
            <Logo />
            <span className="text-lg font-medium text-ink-900">ampli<span className="text-brand-600">score</span></span>
          </Link>
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink-900">Reset your password</h1>
          <p className="text-sm text-ink-600 mt-1">We'll send you a link to reset it</p>
        </div>
        <div className="bg-white rounded-xl border border-ink-200 shadow-card p-8">
          {sent ? (
            <div className="text-center">
              <div className="text-4xl mb-4">📧</div>
              <h2 className="text-lg font-medium text-ink-900 mb-2">Check your email</h2>
              <p className="text-sm text-ink-600 mb-6">We sent a password reset link to <strong>{email}</strong></p>
              <Link href="/login" className="text-brand-600 text-sm font-medium hover:underline">← Back to login</Link>
            </div>
          ) : (
            <form onSubmit={handleReset} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-ink-900 mb-1.5">Email address</label>
                <input
                  type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@university.edu" required
                  className="w-full px-4 h-11 rounded-lg border border-ink-200 text-sm bg-white focus:outline-none focus:border-brand-600 focus:ring-3 focus:ring-brand-100 transition-colors"
                />
              </div>
              {error && <div className="bg-red-50 text-bad text-sm px-4 py-3 rounded-xl border border-red-100">{error}</div>}
              <button type="submit" disabled={loading}
                className="w-full bg-brand-600 text-white h-11 rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors disabled:opacity-50">
                {loading ? "Sending..." : "Send reset link"}
              </button>
              <p className="text-center text-sm text-ink-600">
                <Link href="/login" className="text-brand-600 hover:underline">← Back to login</Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}

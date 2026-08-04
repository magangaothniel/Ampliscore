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
        <path d="M59 23.5 L59 39.5" stroke="url(#capG_resetpassword)" strokeWidth="4" strokeLinecap="round" />
        <circle cx="59" cy="45.6" r="4.9" fill="#7C3AED" stroke="#FFFFFF" strokeWidth="2.4" />
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
      redirectTo: "https://ampliscore.vercel.app/update-password",
    });
    if (error) setError(error.message);
    else setSent(true);
    setLoading(false);
  };

  return (
    <main className="min-h-screen bg-[#F5F3FF] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center justify-center gap-2 mb-6">
            <Logo />
            <span className="text-lg font-medium text-[#1E1040]">ampli<span className="text-purple-600">score</span></span>
          </Link>
          <h1 className="text-2xl font-medium text-[#1E1040]">Reset your password</h1>
          <p className="text-sm text-purple-900/50 mt-1">We'll send you a link to reset it</p>
        </div>
        <div className="bg-white rounded-2xl border border-purple-100 p-8">
          {sent ? (
            <div className="text-center">
              <div className="text-4xl mb-4">📧</div>
              <h2 className="text-lg font-medium text-[#1E1040] mb-2">Check your email</h2>
              <p className="text-sm text-purple-900/50 mb-6">We sent a password reset link to <strong>{email}</strong></p>
              <Link href="/login" className="text-purple-600 text-sm font-medium hover:underline">← Back to login</Link>
            </div>
          ) : (
            <form onSubmit={handleReset} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#1E1040] mb-1.5">Email address</label>
                <input
                  type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@university.edu" required
                  className="w-full px-4 py-2.5 rounded-xl border border-purple-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-purple-50/30"
                />
              </div>
              {error && <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl border border-red-100">{error}</div>}
              <button type="submit" disabled={loading}
                className="w-full bg-purple-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-purple-700 transition-colors disabled:opacity-50">
                {loading ? "Sending..." : "Send reset link"}
              </button>
              <p className="text-center text-sm text-purple-900/50">
                <Link href="/login" className="text-purple-600 hover:underline">← Back to login</Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}

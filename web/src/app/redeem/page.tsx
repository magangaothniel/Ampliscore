"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase";

function RedeemInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [code, setCode] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);

  useEffect(() => {
    const prefill = params.get("code");
    if (prefill) setCode(prefill.toUpperCase());
    const check = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      setSignedIn(!!user);
    };
    check();
  }, [params]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true); setError("");
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push(`/login?next=/redeem?code=${encodeURIComponent(code)}`);
      return;
    }
    const res = await fetch("/api/beta/redeem", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ code }),
    });
    setSending(false);
    if (res.ok) { setDone(true); return; }
    const j = await res.json().catch(() => ({}));
    setError(j.error || "Could not redeem that code.");
  };

  if (done) {
    return (
      <main className="min-h-screen bg-brand-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white border border-ink-200 shadow-card rounded-xl p-8 text-center">
          <div className="inline-flex items-center gap-2 bg-brand-100 text-brand-700 text-xs font-semibold uppercase tracking-wide px-3 py-1.5 rounded-full mb-5">
            Pro unlocked
          </div>
          <h1 className="font-display text-2xl font-bold text-ink-900 mb-3">
            You are in
          </h1>
          <p className="text-ink-600 leading-relaxed mb-7">
            Unlimited courses, AI grade prediction, the GPA planner and at-risk
            alerts are all on. Thanks for testing this.
          </p>
          <Link
            href="/dashboard"
            className="inline-block bg-brand-600 text-white px-7 h-11 leading-[2.75rem] rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors"
          >
            Start setting up your courses
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-brand-50 px-4 py-12 md:py-16">
      <div className="max-w-md mx-auto">
        <Link href="/" className="inline-block mb-7">
          <span className="font-display text-lg font-bold text-ink-900">
            ampli<span className="text-brand-600">score</span>
          </span>
        </Link>

        <h1 className="font-display text-3xl font-bold text-ink-900 tracking-tight mb-3">
          Redeem your beta code
        </h1>
        <p className="text-ink-600 leading-relaxed mb-8">
          Enter the code from your invite email to turn on Pro for free.
        </p>

        {signedIn === false && (
          <div className="bg-white border border-ink-200 rounded-xl p-5 mb-5">
            <p className="text-sm text-ink-600 leading-relaxed">
              You need an account first.{" "}
              <Link href={`/register?next=/redeem?code=${encodeURIComponent(code)}`} className="text-brand-600 font-medium hover:text-brand-700">
                Create one
              </Link>{" "}
              then come back here, or{" "}
              <Link href="/login" className="text-brand-600 font-medium hover:text-brand-700">
                log in
              </Link>
              .
            </p>
          </div>
        )}

        <form onSubmit={submit} className="bg-white border border-ink-200 shadow-card rounded-xl p-6 md:p-7">
          <label className="block text-xs font-semibold uppercase tracking-wide text-ink-600 mb-1.5">
            Your code
          </label>
          <input
            required
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="AMPLI-XXXXXX"
            className="w-full px-4 h-12 rounded-lg border border-ink-200 text-base font-mono tracking-wide bg-white focus:outline-none focus:border-brand-600 focus:ring-3 focus:ring-brand-100 transition-colors"
          />
          {error && <p className="text-sm text-bad mt-3">{error}</p>}
          <button
            type="submit"
            disabled={sending}
            className="w-full mt-5 bg-brand-600 text-white h-11 rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors disabled:opacity-50"
          >
            {sending ? "Checking..." : "Redeem code"}
          </button>
          <p className="text-xs text-ink-600 text-center mt-4 leading-relaxed">
            Each code works once. If yours does not work, reply to your invite
            email and it will be sorted out.
          </p>
        </form>
      </div>
    </main>
  );
}

export default function RedeemPage() {
  return <Suspense><RedeemInner /></Suspense>;
}

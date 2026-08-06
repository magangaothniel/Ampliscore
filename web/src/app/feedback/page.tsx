"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";

export default function FeedbackPage() {
  const [f, setF] = useState({
    liked: "", disliked: "", wanted: "", would_continue: "", why: "",
    ease_rating: 0, accuracy_ok: null as boolean | null, used_mobile: null as boolean | null,
  });
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) setEmail(user.email);
    };
    load();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.would_continue) { setError("Pick whether you would keep using it."); return; }
    setSending(true); setError("");
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch("/api/feedback", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
      },
      body: JSON.stringify({ ...f, email }),
    });
    setSending(false);
    if (res.ok) { setDone(true); return; }
    const j = await res.json().catch(() => ({}));
    setError(j.error || "Could not send that. Please try again.");
  };

  const Label = ({ children }: { children: React.ReactNode }) => (
    <label className="block text-sm font-medium text-ink-900 mb-2">{children}</label>
  );
  const Area = (k: keyof typeof f, ph: string) => (
    <textarea
      value={f[k] as string}
      onChange={(e) => setF({ ...f, [k]: e.target.value })}
      rows={3}
      maxLength={2000}
      placeholder={ph}
      className="w-full px-4 py-2.5 rounded-lg border border-ink-200 text-sm bg-white focus:outline-none focus:border-brand-600 focus:ring-3 focus:ring-brand-100 transition-colors"
    />
  );
  const Choice = (k: keyof typeof f, val: any, label: string) => (
    <button
      type="button"
      onClick={() => setF({ ...f, [k]: val })}
      className={`flex-1 h-11 rounded-lg text-sm font-medium border transition-colors ${
        f[k] === val
          ? "bg-brand-600 text-white border-brand-600"
          : "bg-white text-ink-600 border-ink-200 hover:border-brand-300"
      }`}
    >
      {label}
    </button>
  );

  if (done) {
    return (
      <main className="min-h-screen bg-brand-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white border border-ink-200 shadow-card rounded-xl p-8 text-center">
          <h1 className="font-display text-2xl font-bold text-ink-900 mb-3">Thank you</h1>
          <p className="text-ink-600 leading-relaxed mb-7">
            This is the part that actually decides what gets built next. Your
            Pro access stays on either way.
          </p>
          <Link href="/dashboard" className="inline-block bg-brand-600 text-white px-7 h-11 leading-[2.75rem] rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors">
            Back to Ampliscore
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-brand-50 px-4 py-12 md:py-16">
      <div className="max-w-lg mx-auto">
        <Link href="/" className="inline-block mb-7">
          <span className="font-display text-lg font-bold text-ink-900">
            ampli<span className="text-brand-600">score</span>
          </span>
        </Link>

        <h1 className="font-display text-3xl font-bold text-ink-900 tracking-tight mb-3">
          How was it?
        </h1>
        <p className="text-ink-600 leading-relaxed mb-8">
          Five minutes, and blunt is better than polite. Nothing here is
          required except the last question.
        </p>

        <form onSubmit={submit} className="bg-white border border-ink-200 shadow-card rounded-xl p-6 md:p-7 space-y-6">

          <div>
            <Label>What did you like?</Label>
            {Area("liked", "Anything that worked well or that you found yourself using")}
          </div>

          <div>
            <Label>What did you not like, or what confused you?</Label>
            {Area("disliked", "Anything slow, broken, unclear, or annoying. Be specific if you can")}
          </div>

          <div>
            <Label>What is missing that you would want?</Label>
            {Area("wanted", "Features, integrations, anything you expected to find and did not")}
          </div>

          <div>
            <Label>Did the grades match what your school said?</Label>
            <div className="flex gap-2">
              {Choice("accuracy_ok", true, "Yes, they matched")}
              {Choice("accuracy_ok", false, "No, they were off")}
            </div>
          </div>

          <div>
            <Label>How easy was it to set up your courses?</Label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setF({ ...f, ease_rating: n })}
                  className={`flex-1 h-11 rounded-lg text-sm font-medium border transition-colors ${
                    f.ease_rating === n
                      ? "bg-brand-600 text-white border-brand-600"
                      : "bg-white text-ink-600 border-ink-200 hover:border-brand-300"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
            <p className="text-xs text-ink-600 mt-1.5">1 is painful, 5 is effortless</p>
          </div>

          <div>
            <Label>Did you try it on your phone?</Label>
            <div className="flex gap-2">
              {Choice("used_mobile", true, "Yes")}
              {Choice("used_mobile", false, "No")}
            </div>
          </div>

          <div className="pt-2 border-t border-ink-100">
            <Label>Would you keep using this next semester?</Label>
            <div className="flex gap-2 mb-3">
              {Choice("would_continue", "yes", "Yes")}
              {Choice("would_continue", "maybe", "Maybe")}
              {Choice("would_continue", "no", "No")}
            </div>
            {Area("why", "Why? This is the one that matters most, and no is genuinely useful")}
          </div>

          {error && <p className="text-sm text-bad">{error}</p>}

          <button
            type="submit"
            disabled={sending}
            className="w-full bg-brand-600 text-white h-11 rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors disabled:opacity-50"
          >
            {sending ? "Sending..." : "Send feedback"}
          </button>
        </form>
      </div>
    </main>
  );
}

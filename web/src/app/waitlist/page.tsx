"use client";

import { useState } from "react";
import Link from "next/link";

const PLATFORMS = [
  { id: "ios", label: "iPhone" },
  { id: "android", label: "Android" },
  { id: "web", label: "Web" },
];

const YEARS = ["Freshman", "Sophomore", "Junior", "Senior", "Graduate", "Other"];

export default function WaitlistPage() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    university: "",
    year: "",
  });
  const [platforms, setPlatforms] = useState<string[]>(["ios"]);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const toggle = (id: string) =>
    setPlatforms((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (platforms.length === 0) {
      setError("Pick at least one platform.");
      return;
    }
    setSending(true);
    setError("");
    const res = await fetch("/api/waitlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, platforms }),
    });
    setSending(false);
    if (res.ok) {
      setDone(true);
      return;
    }
    const j = await res.json().catch(() => ({}));
    setError(j.error || "Something went wrong. Please try again.");
  };

  if (done) {
    return (
      <main className="min-h-screen bg-brand-50 flex items-center justify-center px-4 py-16">
        <div className="max-w-md w-full bg-white border border-ink-200 shadow-card rounded-xl p-8 text-center">
          <h1 className="font-display text-2xl font-bold text-ink-900 mb-3">
            You are on the list
          </h1>
          <p className="text-ink-600 leading-relaxed mb-7">
            We will email you the moment Ampliscore hits the App Store and Google
            Play. No other emails, and you can leave any time.
          </p>
          <p className="text-sm text-ink-600 mb-3">
            You do not have to wait for the app. The web version works today.
          </p>
          <Link
            href="/register"
            className="inline-block bg-brand-600 text-white px-6 h-11 leading-[2.75rem] rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors"
          >
            Start tracking now
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
          Get the app first
        </h1>
        <p className="text-ink-600 leading-relaxed mb-8">
          Ampliscore is coming to iPhone and Android. Leave your email and we
          will tell you the day it lands, with a direct link to download.
        </p>

        <form onSubmit={submit} className="bg-white border border-ink-200 shadow-card rounded-xl p-6 md:p-7 space-y-5">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-ink-600 mb-1.5">
              Name
            </label>
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-4 h-11 rounded-lg border border-ink-200 text-sm bg-white focus:outline-none focus:border-brand-600 focus:ring-3 focus:ring-brand-100 transition-colors"
              placeholder="Jordan Smith"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-ink-600 mb-1.5">
              Email
            </label>
            <input
              required
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full px-4 h-11 rounded-lg border border-ink-200 text-sm bg-white focus:outline-none focus:border-brand-600 focus:ring-3 focus:ring-brand-100 transition-colors"
              placeholder="you@university.edu"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-ink-600 mb-1.5">
              University
            </label>
            <input
              required
              value={form.university}
              onChange={(e) => setForm({ ...form, university: e.target.value })}
              className="w-full px-4 h-11 rounded-lg border border-ink-200 text-sm bg-white focus:outline-none focus:border-brand-600 focus:ring-3 focus:ring-brand-100 transition-colors"
              placeholder="Kansas State University"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-ink-600 mb-1.5">
              Year
            </label>
            <select
              required
              value={form.year}
              onChange={(e) => setForm({ ...form, year: e.target.value })}
              className="w-full px-4 h-11 rounded-lg border border-ink-200 text-sm bg-white focus:outline-none focus:border-brand-600 focus:ring-3 focus:ring-brand-100 transition-colors"
            >
              <option value="">Select</option>
              {YEARS.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-ink-600 mb-2">
              Where do you want it
            </label>
            <div className="flex gap-2">
              {PLATFORMS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => toggle(p.id)}
                  className={`flex-1 h-11 rounded-lg text-sm font-medium border transition-colors ${
                    platforms.includes(p.id)
                      ? "bg-brand-600 text-white border-brand-600"
                      : "bg-white text-ink-600 border-ink-200 hover:border-brand-300"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <p className="text-sm text-bad">{error}</p>
          )}

          <button
            type="submit"
            disabled={sending}
            className="w-full bg-brand-600 text-white h-11 rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors disabled:opacity-50"
          >
            {sending ? "Adding you..." : "Join the waitlist"}
          </button>

          <p className="text-xs text-ink-600 text-center leading-relaxed">
            One email at launch. Nothing else, and no sharing your address.
          </p>
        </form>

        <p className="text-center text-sm text-ink-600 mt-6">
          Do not want to wait?{" "}
          <Link href="/register" className="text-brand-600 font-medium hover:text-brand-700">
            Use the web app today
          </Link>
        </p>
      </div>
    </main>
  );
}

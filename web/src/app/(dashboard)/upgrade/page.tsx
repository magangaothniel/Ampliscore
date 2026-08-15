"use client";
import { useState } from "react";
import Link from "next/link";

function Logo() {
  return (
    <svg aria-hidden="true" width="32" height="32" viewBox="0 0 64 64" fill="none">
      <defs>
        <linearGradient id="capG_upgrade" x1="0" y1="64" x2="64" y2="0">
          <stop offset="0" stopColor="#5B21B6" />
          <stop offset="1" stopColor="#7C3AED" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill="#EDE9FE" />
      <g transform="translate(32,34) scale(0.78) translate(-32,-29)">
        <path d="M32 11 L59 23.5 L32 36 L5 23.5 Z" stroke="url(#capG_upgrade)" strokeWidth="4.6" strokeLinejoin="round" />
        <path d="M16.5 29 L16.5 41.5 C16.5 46.8 47.5 46.8 47.5 41.5 L47.5 29" stroke="url(#capG_upgrade)" strokeWidth="4.6" strokeLinecap="round" />
        <path d="M59 23.5 L59 43" stroke="url(#capG_upgrade)" strokeWidth="4" strokeLinecap="round" />
        <circle cx="59" cy="45.6" r="4.9" fill="#7C3AED" />
      </g>
    </svg>
  );
}

const FREE_FEATURES = [
  { text: "Track up to 4 classes", included: true },
  { text: "Basic grade calculator", included: true },
  { text: "Professor ratings", included: true },
  { text: "GPA overview", included: true },
  { text: "AI grade predictor", included: false },
  { text: "Unlimited classes", included: false },
  { text: "GPA what-if planner", included: false },
  { text: "At-risk alerts", included: false },
  { text: "Transcript tracker", included: false },
];

const PRO_FEATURES = [
  { text: "Everything in Free", included: true },
  { text: "Unlimited classes", included: true },
  { text: "AI grade predictor", included: true },
  { text: "GPA what-if planner", included: true },
  { text: "At-risk alerts & warnings", included: true },
  { text: "Full transcript tracker", included: true },
  { text: "Semester history", included: true },
  { text: "Priority support", included: true },
];

const TESTIMONIALS = [
  { name: "Marcus T.", university: "University of Michigan", text: "The grade predictor told me I needed a 71% on my final to keep my B. I studied exactly right and hit 74%. Literally saved my GPA." },
  { name: "Priya S.", university: "UCLA", text: "I was failing Orgo and didn't even know it. Ampliscore flagged it 3 weeks before finals. I had time to fix it." },
  { name: "Jordan K.", university: "Georgia Tech", text: "RateMyProfessor is outdated. Ampliscore shows me who's actually teaching my classes this semester with real recent reviews." },
];

export default function UpgradePage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleUpgrade = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/stripe/checkout", { method: "POST" });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else setError(data.error || "Something went wrong");
    } catch {
      setError("Failed to connect to payment system");
    }
    setLoading(false);
  };

  return (
    <main className="min-h-screen bg-brand-50">

      <div className="max-w-5xl mx-auto px-6 py-12">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-purple-100 text-brand-700 text-xs font-medium px-4 py-2 rounded-full mb-4">
            ⚡ Upgrade to Pro
          </div>
          <h1 className="text-4xl font-medium text-ink-900 mb-4">
            Know exactly where you stand.<br/>
            <span className="text-brand-600">Never get blindsided again.</span>
          </h1>
          <p className="text-lg text-ink-600 max-w-xl mx-auto">
            Pro students catch failing grades 3 weeks earlier, hit their target GPA 2x more often, and spend less time stressing about finals.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16 max-w-3xl mx-auto">
          <div className="bg-white rounded-xl border border-ink-200 shadow-card p-6">
            <h2 className="text-lg font-medium text-ink-900 mb-1">Free</h2>
            <div className="font-display text-3xl font-bold tracking-tight text-ink-900 mb-1">$0<span className="text-sm text-purple-400 font-normal">/month</span></div>
            <p className="text-sm text-ink-400 mb-6">Good for getting started</p>
            <div className="space-y-3 mb-6">
              {FREE_FEATURES.map((f) => (
                <div key={f.text} className="flex items-center gap-2.5">
                  <span className={`text-sm flex-shrink-0 ${f.included ? "text-emerald-500" : "text-ink-400"}`}>{f.included ? "✓" : "✗"}</span>
                  <span className={`text-sm ${f.included ? "text-ink-900" : "text-ink-400 line-through"}`}>{f.text}</span>
                </div>
              ))}
            </div>
            <div className="border border-ink-200 text-brand-600 py-2.5 rounded-xl text-sm font-medium text-center">Current plan</div>
          </div>

          <div className="bg-brand-600 rounded-2xl p-6 relative">
            <div className="absolute top-4 right-4 bg-white/20 text-white text-xs font-medium px-3 py-1 rounded-full">Most popular</div>
            <h2 className="text-lg font-medium text-white mb-1">Pro</h2>
            <div className="text-3xl font-medium text-white mb-1">$4.99<span className="text-sm text-purple-300 font-normal">/month</span></div>
            <p className="text-sm text-purple-200 mb-6">Less than one coffee a month</p>
            <div className="space-y-3 mb-6">
              {PRO_FEATURES.map((f) => (
                <div key={f.text} className="flex items-center gap-2.5">
                  <span className="text-green-300 text-sm flex-shrink-0">✓</span>
                  <span className="text-sm text-white">{f.text}</span>
                </div>
              ))}
            </div>
            {error && <div className="bg-red-100 text-bad text-xs px-3 py-2 rounded-xl mb-3">{error}</div>}
            <button onClick={handleUpgrade} disabled={loading}
              className="w-full bg-white text-brand-700 py-3 rounded-xl text-sm font-medium hover:bg-brand-50 transition-colors disabled:opacity-50">
              {loading ? "Redirecting to checkout..." : "Upgrade to Pro — $4.99/mo"}
            </button>
            <p className="text-xs text-purple-300 text-center mt-3">Cancel anytime. No hidden fees.</p>
          </div>
        </div>

        <div className="mb-16">
          <h2 className="font-display text-2xl font-bold tracking-tight text-ink-900 text-center mb-8">What you unlock with Pro</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: "🤖", title: "AI grade predictor", desc: "See your exact final grade before you sit the exam. Know what score you need on every remaining assignment." },
              { icon: "🔔", title: "At-risk alerts", desc: "Get warned the moment a class drops below passing — weeks before it's too late to fix it." },
              { icon: "🧮", title: "GPA what-if planner", desc: "Drag a slider and watch your GPA update in real time. Plan your semester before it happens." },
              { icon: "📁", title: "Transcript tracker", desc: "Every semester, every grade, your full academic history in one place." },
            ].map((f) => (
              <div key={f.title} className="bg-white rounded-xl border border-ink-200 shadow-card p-5">
                <div className="text-2xl mb-3">{f.icon}</div>
                <h3 className="font-medium text-ink-900 mb-2 text-sm">{f.title}</h3>
                <p className="text-xs text-ink-600 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mb-16">
          <h2 className="font-display text-2xl font-bold tracking-tight text-ink-900 text-center mb-8">What students are saying</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="bg-white rounded-xl border border-ink-200 shadow-card p-5">
                <div className="text-amber-400 mb-3 text-sm">★★★★★</div>
                <p className="text-sm text-ink-600 leading-relaxed mb-4">"{t.text}"</p>
                <div>
                  <div className="text-sm font-medium text-ink-900">{t.name}</div>
                  <div className="text-xs text-ink-400">{t.university}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="max-w-2xl mx-auto mb-12">
          <h2 className="font-display text-2xl font-bold tracking-tight text-ink-900 text-center mb-8">Common questions</h2>
          <div className="space-y-4">
            {[
              { q: "Can I cancel anytime?", a: "Yes — cancel with one click from your account settings. No questions asked, no penalties." },
              { q: "What happens to my data if I cancel?", a: "Your grades and courses stay in your account forever. You just lose access to Pro features." },
              { q: "Is my payment information secure?", a: "100%. Payments are processed by Stripe, the same system used by Amazon and Google. We never see your card details." },
              { q: "Do I need Pro to use professor ratings?", a: "No — professor ratings are free for everyone. Pro unlocks the grade tracking and GPA planning features." },
            ].map((item) => (
              <div key={item.q} className="bg-white rounded-xl border border-ink-200 shadow-card p-5">
                <h3 className="font-medium text-ink-900 mb-2 text-sm">{item.q}</h3>
                <p className="text-sm text-ink-600 leading-relaxed">{item.a}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-brand-600 rounded-2xl p-8 text-center">
          <h2 className="text-2xl font-medium text-white mb-2">Ready to take control of your GPA?</h2>
          <p className="text-purple-200 text-sm mb-6">Join thousands of students who never get surprised by their grades.</p>
          <button onClick={handleUpgrade} disabled={loading}
            className="bg-white text-brand-700 px-8 py-3 rounded-xl font-medium hover:bg-brand-50 transition-colors disabled:opacity-50 text-sm">
            {loading ? "Redirecting..." : "Get Ampliscore Pro — $4.99/mo"}
          </button>
          <p className="text-purple-300 text-xs mt-3">Cancel anytime · Secure payment via Stripe</p>
        </div>
      </div>
    </main>
  );
}

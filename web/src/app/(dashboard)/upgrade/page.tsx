"use client";
import { useState } from "react";
import Link from "next/link";

function Logo() {
  return (
    <svg width="32" height="32" viewBox="0 0 36 36" fill="none">
      <rect width="36" height="36" rx="10" fill="#EDE9FE"/>
      <circle cx="18" cy="18" r="9" fill="none" stroke="#7C3AED" strokeWidth="2"/>
      <circle cx="18" cy="18" r="5" fill="#DDD6FE"/>
      <circle cx="18" cy="18" r="2.5" fill="#7C3AED"/>
      <line x1="18" y1="9" x2="18" y2="12" stroke="#7C3AED" strokeWidth="1.8" strokeLinecap="round"/>
      <line x1="18" y1="24" x2="18" y2="27" stroke="#7C3AED" strokeWidth="1.8" strokeLinecap="round"/>
      <line x1="9" y1="18" x2="12" y2="18" stroke="#7C3AED" strokeWidth="1.8" strokeLinecap="round"/>
      <line x1="24" y1="18" x2="27" y2="18" stroke="#7C3AED" strokeWidth="1.8" strokeLinecap="round"/>
      <line x1="13" y1="13" x2="15.5" y2="15.5" stroke="#7C3AED" strokeWidth="1.5" strokeLinecap="round"/>
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
    <main className="min-h-screen bg-[#F5F3FF]">
      <nav className="bg-white border-b border-purple-100 px-6 py-4 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-3">
          <Logo />
          <span className="text-lg font-medium text-[#1E1040]">ampli<span className="text-purple-600">score</span></span>
        </Link>
        <Link href="/dashboard" className="text-sm text-purple-600 hover:underline">← Back to dashboard</Link>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-12">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-purple-100 text-purple-700 text-xs font-medium px-4 py-2 rounded-full mb-4">
            ⚡ Upgrade to Pro
          </div>
          <h1 className="text-4xl font-medium text-[#1E1040] mb-4">
            Know exactly where you stand.<br/>
            <span className="text-purple-600">Never get blindsided again.</span>
          </h1>
          <p className="text-lg text-purple-900/50 max-w-xl mx-auto">
            Pro students catch failing grades 3 weeks earlier, hit their target GPA 2x more often, and spend less time stressing about finals.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16 max-w-3xl mx-auto">
          <div className="bg-white rounded-2xl border border-purple-100 p-6">
            <h2 className="text-lg font-medium text-[#1E1040] mb-1">Free</h2>
            <div className="text-3xl font-medium text-[#1E1040] mb-1">$0<span className="text-sm text-purple-400 font-normal">/month</span></div>
            <p className="text-sm text-purple-900/40 mb-6">Good for getting started</p>
            <div className="space-y-3 mb-6">
              {FREE_FEATURES.map((f) => (
                <div key={f.text} className="flex items-center gap-2.5">
                  <span className={`text-sm flex-shrink-0 ${f.included ? "text-emerald-500" : "text-purple-900/20"}`}>{f.included ? "✓" : "✗"}</span>
                  <span className={`text-sm ${f.included ? "text-[#1E1040]" : "text-purple-900/30 line-through"}`}>{f.text}</span>
                </div>
              ))}
            </div>
            <div className="border border-purple-200 text-purple-600 py-2.5 rounded-xl text-sm font-medium text-center">Current plan</div>
          </div>

          <div className="bg-purple-600 rounded-2xl p-6 relative">
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
            {error && <div className="bg-red-100 text-red-600 text-xs px-3 py-2 rounded-xl mb-3">{error}</div>}
            <button onClick={handleUpgrade} disabled={loading}
              className="w-full bg-white text-purple-700 py-3 rounded-xl text-sm font-medium hover:bg-purple-50 transition-colors disabled:opacity-50">
              {loading ? "Redirecting to checkout..." : "Upgrade to Pro — $4.99/mo"}
            </button>
            <p className="text-xs text-purple-300 text-center mt-3">Cancel anytime. No hidden fees.</p>
          </div>
        </div>

        <div className="mb-16">
          <h2 className="text-2xl font-medium text-[#1E1040] text-center mb-8">What you unlock with Pro</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: "🤖", title: "AI grade predictor", desc: "See your exact final grade before you sit the exam. Know what score you need on every remaining assignment." },
              { icon: "🔔", title: "At-risk alerts", desc: "Get warned the moment a class drops below passing — weeks before it's too late to fix it." },
              { icon: "🧮", title: "GPA what-if planner", desc: "Drag a slider and watch your GPA update in real time. Plan your semester before it happens." },
              { icon: "📁", title: "Transcript tracker", desc: "Every semester, every grade, your full academic history in one place." },
            ].map((f) => (
              <div key={f.title} className="bg-white rounded-2xl border border-purple-100 p-5">
                <div className="text-2xl mb-3">{f.icon}</div>
                <h3 className="font-medium text-[#1E1040] mb-2 text-sm">{f.title}</h3>
                <p className="text-xs text-purple-900/50 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mb-16">
          <h2 className="text-2xl font-medium text-[#1E1040] text-center mb-8">What students are saying</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="bg-white rounded-2xl border border-purple-100 p-5">
                <div className="text-amber-400 mb-3 text-sm">★★★★★</div>
                <p className="text-sm text-purple-900/70 leading-relaxed mb-4">"{t.text}"</p>
                <div>
                  <div className="text-sm font-medium text-[#1E1040]">{t.name}</div>
                  <div className="text-xs text-purple-900/40">{t.university}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="max-w-2xl mx-auto mb-12">
          <h2 className="text-2xl font-medium text-[#1E1040] text-center mb-8">Common questions</h2>
          <div className="space-y-4">
            {[
              { q: "Can I cancel anytime?", a: "Yes — cancel with one click from your account settings. No questions asked, no penalties." },
              { q: "What happens to my data if I cancel?", a: "Your grades and courses stay in your account forever. You just lose access to Pro features." },
              { q: "Is my payment information secure?", a: "100%. Payments are processed by Stripe, the same system used by Amazon and Google. We never see your card details." },
              { q: "Do I need Pro to use professor ratings?", a: "No — professor ratings are free for everyone. Pro unlocks the grade tracking and GPA planning features." },
            ].map((item) => (
              <div key={item.q} className="bg-white rounded-2xl border border-purple-100 p-5">
                <h3 className="font-medium text-[#1E1040] mb-2 text-sm">{item.q}</h3>
                <p className="text-sm text-purple-900/50 leading-relaxed">{item.a}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-purple-600 rounded-2xl p-8 text-center">
          <h2 className="text-2xl font-medium text-white mb-2">Ready to take control of your GPA?</h2>
          <p className="text-purple-200 text-sm mb-6">Join thousands of students who never get surprised by their grades.</p>
          <button onClick={handleUpgrade} disabled={loading}
            className="bg-white text-purple-700 px-8 py-3 rounded-xl font-medium hover:bg-purple-50 transition-colors disabled:opacity-50 text-sm">
            {loading ? "Redirecting..." : "Get Ampliscore Pro — $4.99/mo"}
          </button>
          <p className="text-purple-300 text-xs mt-3">Cancel anytime · Secure payment via Stripe</p>
        </div>
      </div>
    </main>
  );
}

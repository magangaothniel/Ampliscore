"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

const STEPS = ["Welcome", "Your university", "Your major", "Quick tour"];

function Logo() {
  return (
    <svg width="40" height="40" viewBox="0 0 36 36" fill="none">
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

const TOUR_STEPS = [
  { icon: "📊", title: "Track your grades", desc: "Add your courses and enter grades as you get them. Ampliscore calculates your current grade automatically." },
  { icon: "🤖", title: "Predict your final grade", desc: "Upgrade to Pro to see exactly what score you need on remaining assignments to hit your target grade." },
  { icon: "⭐", title: "Rate your professors", desc: "Share honest reviews with other students at your school. See ratings before you pick classes." },
  { icon: "🧮", title: "Plan your GPA", desc: "Use the GPA planner to run what-if scenarios. Drag sliders and see your GPA update in real time." },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [form, setForm] = useState({
    full_name: "",
    university: "",
    major: "",
    year_of_study: "",
  });
  const [tourStep, setTourStep] = useState(0);

  useEffect(() => {
    const getUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setUser(user);
      setForm(f => ({
        ...f,
        full_name: user.user_metadata?.full_name || user.user_metadata?.name || "",
      }));
    };
    getUser();
  }, []);

  const handleSaveProfile = async () => {
    if (!form.university) return;
    setSaving(true);
    const supabase = createClient();
    await supabase.from("profiles").update({
      full_name: form.full_name,
      university: form.university,
      major: form.major,
      year_of_study: form.year_of_study ? parseInt(form.year_of_study) : null,
    }).eq("id", user.id);
    setSaving(false);
    setStep(3);
  };

  const handleFinish = () => {
    router.push("/dashboard");
  };

  return (
    <main className="min-h-screen bg-[#F5F3FF] flex items-center justify-center px-4">
      <div className="w-full max-w-lg">

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {STEPS.map((s, i) => (
            <div key={s} className={`h-2 rounded-full transition-all ${i === step ? "w-8 bg-purple-600" : i < step ? "w-2 bg-purple-400" : "w-2 bg-purple-200"}`} />
          ))}
        </div>

        {/* Step 0 — Welcome */}
        {step === 0 && (
          <div className="bg-white rounded-2xl border border-purple-100 p-8 text-center">
            <Logo />
            <h1 className="text-2xl font-medium text-[#1E1040] mt-4 mb-2">
              Welcome to Ampliscore{form.full_name ? `, ${form.full_name.split(" ")[0]}` : ""}! 👋
            </h1>
            <p className="text-purple-900/50 text-sm mb-6 leading-relaxed">
              Let's set up your profile so we can personalize your experience. It takes less than a minute.
            </p>
            <div className="grid grid-cols-2 gap-3 mb-8 text-left">
              {[
                { icon: "📊", text: "Track grades in real time" },
                { icon: "🔔", text: "Get at-risk alerts" },
                { icon: "⭐", text: "Rate your professors" },
                { icon: "🧮", text: "Plan your GPA" },
              ].map(f => (
                <div key={f.text} className="flex items-center gap-2 bg-purple-50 rounded-xl p-3">
                  <span>{f.icon}</span>
                  <span className="text-xs text-purple-900/70 font-medium">{f.text}</span>
                </div>
              ))}
            </div>
            <button
              onClick={() => setStep(1)}
              className="w-full bg-purple-600 text-white py-3 rounded-xl font-medium hover:bg-purple-700 transition-colors"
            >
              Let's get started →
            </button>
          </div>
        )}

        {/* Step 1 — University */}
        {step === 1 && (
          <div className="bg-white rounded-2xl border border-purple-100 p-8">
            <div className="text-3xl mb-4">🎓</div>
            <h2 className="text-xl font-medium text-[#1E1040] mb-1">Where do you go to school?</h2>
            <p className="text-sm text-purple-900/50 mb-6">This helps us show you professor ratings from your campus.</p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#1E1040] mb-1.5">Your name</label>
                <input
                  type="text" value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  placeholder="Your full name"
                  className="w-full px-4 py-2.5 rounded-xl border border-purple-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-purple-50/30"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1E1040] mb-1.5">University *</label>
                <input
                  type="text" value={form.university}
                  onChange={(e) => setForm({ ...form, university: e.target.value })}
                  placeholder="e.g. University of Michigan"
                  className="w-full px-4 py-2.5 rounded-xl border border-purple-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-purple-50/30"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setStep(0)} className="flex-1 border border-purple-200 text-purple-700 py-2.5 rounded-xl text-sm font-medium hover:bg-purple-50">
                Back
              </button>
              <button
                onClick={() => form.university && setStep(2)}
                disabled={!form.university}
                className="flex-1 bg-purple-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-purple-700 disabled:opacity-40"
              >
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* Step 2 — Major & Year */}
        {step === 2 && (
          <div className="bg-white rounded-2xl border border-purple-100 p-8">
            <div className="text-3xl mb-4">��</div>
            <h2 className="text-xl font-medium text-[#1E1040] mb-1">What are you studying?</h2>
            <p className="text-sm text-purple-900/50 mb-6">Optional — helps us give you better recommendations.</p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#1E1040] mb-1.5">Major</label>
                <input
                  type="text" value={form.major}
                  onChange={(e) => setForm({ ...form, major: e.target.value })}
                  placeholder="e.g. Computer Science"
                  className="w-full px-4 py-2.5 rounded-xl border border-purple-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-purple-50/30"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1E1040] mb-1.5">Year of study</label>
                <select
                  value={form.year_of_study}
                  onChange={(e) => setForm({ ...form, year_of_study: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-purple-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-purple-50/30"
                >
                  <option value="">Select year</option>
                  <option value="1">Freshman (1st year)</option>
                  <option value="2">Sophomore (2nd year)</option>
                  <option value="3">Junior (3rd year)</option>
                  <option value="4">Senior (4th year)</option>
                  <option value="5">Graduate student</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setStep(1)} className="flex-1 border border-purple-200 text-purple-700 py-2.5 rounded-xl text-sm font-medium hover:bg-purple-50">
                Back
              </button>
              <button
                onClick={handleSaveProfile}
                disabled={saving}
                className="flex-1 bg-purple-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-purple-700 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Continue →"}
              </button>
            </div>
          </div>
        )}

        {/* Step 3 — Tour */}
        {step === 3 && (
          <div className="bg-white rounded-2xl border border-purple-100 p-8">
            <div className="text-center mb-6">
              <div className="text-4xl mb-2">{TOUR_STEPS[tourStep].icon}</div>
              <h2 className="text-xl font-medium text-[#1E1040] mb-2">{TOUR_STEPS[tourStep].title}</h2>
              <p className="text-sm text-purple-900/50 leading-relaxed">{TOUR_STEPS[tourStep].desc}</p>
            </div>

            {/* Tour progress */}
            <div className="flex gap-1.5 justify-center mb-6">
              {TOUR_STEPS.map((_, i) => (
                <div key={i} className={`h-1.5 rounded-full transition-all ${i === tourStep ? "w-6 bg-purple-600" : i < tourStep ? "w-3 bg-purple-400" : "w-3 bg-purple-100"}`} />
              ))}
            </div>

            <div className="flex gap-3">
              {tourStep > 0 && (
                <button onClick={() => setTourStep(t => t - 1)} className="flex-1 border border-purple-200 text-purple-700 py-2.5 rounded-xl text-sm font-medium hover:bg-purple-50">
                  Back
                </button>
              )}
              {tourStep < TOUR_STEPS.length - 1 ? (
                <button
                  onClick={() => setTourStep(t => t + 1)}
                  className="flex-1 bg-purple-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-purple-700"
                >
                  Next →
                </button>
              ) : (
                <button
                  onClick={handleFinish}
                  className="flex-1 bg-purple-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-purple-700"
                >
                  Go to my dashboard 🚀
                </button>
              )}
            </div>
          </div>
        )}

      </div>
    </main>
  );
}

import Link from "next/link";

function Logo() {
  return (
    <div className="flex items-center gap-3">
      <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
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
      <span className="text-xl font-medium text-[#1E1040]">
        ampli<span className="text-purple-600">score</span>
      </span>
    </div>
  );
}

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-[#F5F3FF]">
      <nav className="flex items-center justify-between px-8 py-5 bg-white border-b border-purple-100">
        <Logo />
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm text-purple-700 hover:text-purple-900 font-medium px-4 py-2">
            Log in
          </Link>
          <Link href="/register" className="text-sm bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors">
            Get started free
          </Link>
        </div>
      </nav>

      <section className="flex flex-col items-center text-center px-6 pt-20 pb-16">
        <div className="inline-flex items-center gap-2 bg-purple-100 text-purple-700 text-xs font-medium px-4 py-2 rounded-full mb-6">
          <span className="w-2 h-2 rounded-full bg-purple-500 inline-block" />
          Free for all students
        </div>
        <h1 className="text-5xl font-medium text-[#1E1040] max-w-2xl leading-tight mb-5">
          Know where you stand,{" "}
          <span className="text-purple-600">every semester</span>
        </h1>
        <p className="text-lg text-purple-900/60 max-w-xl mb-8 leading-relaxed">
          Track your grades, predict your final score, find the best professors,
          and plan your GPA — all in one place.
        </p>
        <div className="flex items-center gap-3">
          <Link href="/register" className="bg-purple-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-purple-700 transition-colors text-sm">
            Start tracking for free
          </Link>
          <Link href="/login" className="text-purple-700 px-6 py-3 rounded-xl font-medium border border-purple-200 hover:bg-purple-50 transition-colors text-sm bg-white">
            Log in
          </Link>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-6 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { icon: "📊", title: "Grade predictor", desc: "See your final grade before finals week. No more surprises." },
            { icon: "🔔", title: "At-risk alerts", desc: "Get notified the moment a class starts slipping below passing." },
            { icon: "⭐", title: "Professor ratings", desc: "Honest reviews from real students at your school." },
            { icon: "🧮", title: "GPA planner", desc: "Run what-if scenarios. Know exactly what you need to hit your goal." },
            { icon: "📁", title: "Transcript tracker", desc: "Every semester, every grade, all in one place." },
            { icon: "🎓", title: "500+ universities", desc: "Works for any US college or university." },
          ].map((f) => (
            <div key={f.title} className="bg-white rounded-2xl p-6 border border-purple-100">
              <div className="text-2xl mb-3">{f.icon}</div>
              <h3 className="font-medium text-[#1E1040] mb-2">{f.title}</h3>
              <p className="text-sm text-purple-900/50 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-3xl mx-auto px-6 pb-24">
        <h2 className="text-3xl font-medium text-center text-[#1E1040] mb-10">Simple pricing</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl p-6 border border-purple-100">
            <h3 className="font-medium text-[#1E1040] text-lg mb-1">Free</h3>
            <div className="text-3xl font-medium text-[#1E1040] mb-4">$0<span className="text-sm text-purple-400 font-normal">/mo</span></div>
            {["Track up to 4 classes", "Basic grade calculator", "Professor ratings"].map((f) => (
              <div key={f} className="flex items-center gap-2 text-sm text-purple-900/70 mb-2">
                <span className="text-green-500">✓</span> {f}
              </div>
            ))}
            <Link href="/register" className="block text-center mt-6 border border-purple-200 text-purple-700 py-2.5 rounded-xl text-sm font-medium hover:bg-purple-50 transition-colors">
              Get started
            </Link>
          </div>
          <div className="bg-purple-600 rounded-2xl p-6">
            <div className="inline-block bg-purple-500 text-purple-100 text-xs px-3 py-1 rounded-full mb-3">Most popular</div>
            <h3 className="font-medium text-white text-lg mb-1">Pro</h3>
            <div className="text-3xl font-medium text-white mb-4">$4.99<span className="text-sm text-purple-300 font-normal">/mo</span></div>
            {["Unlimited classes", "AI grade predictor", "GPA what-if planner", "At-risk alerts", "Transcript tracker"].map((f) => (
              <div key={f} className="flex items-center gap-2 text-sm text-purple-100 mb-2">
                <span className="text-green-300">✓</span> {f}
              </div>
            ))}
            <Link href="/register" className="block text-center mt-6 bg-white text-purple-700 py-2.5 rounded-xl text-sm font-medium hover:bg-purple-50 transition-colors">
              Start free trial
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-purple-100 bg-white py-6 text-center text-sm text-purple-400">
        © 2026 Ampliscore · Know where you stand
      </footer>
    </main>
  );
}

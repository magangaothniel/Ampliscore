import Link from "next/link";

function Logo() {
  return (
    <div className="flex items-center gap-3">
      <svg aria-hidden="true" width="36" height="36" viewBox="0 0 64 64" fill="none">
      <defs>
        <linearGradient id="capG_app" x1="0" y1="64" x2="64" y2="0">
          <stop offset="0" stopColor="#5B21B6" />
          <stop offset="1" stopColor="#7C3AED" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill="#EDE9FE" />
      <g transform="translate(32,34) scale(0.78) translate(-32,-29)">
        <path d="M32 11 L59 23.5 L32 36 L5 23.5 Z" stroke="url(#capG_app)" strokeWidth="4.6" strokeLinejoin="round" />
        <path d="M16.5 29 L16.5 41.5 C16.5 46.8 47.5 46.8 47.5 41.5 L47.5 29" stroke="url(#capG_app)" strokeWidth="4.6" strokeLinecap="round" />
        <path d="M59 23.5 L59 39.5" stroke="url(#capG_app)" strokeWidth="4" strokeLinecap="round" />
        <circle cx="59" cy="45.6" r="4.9" fill="#7C3AED" stroke="#FFFFFF" strokeWidth="2.4" />
      </g>
    </svg>
      <span className="text-xl font-medium text-[#1E1040]">
        ampli<span className="text-purple-600">score</span>
      </span>
    </div>
  );
}

export default function LandingPage() {
  /* RedesignV2 */
  return (
    <main className="min-h-screen bg-brand-50">
      <nav className="flex items-center justify-between px-6 md:px-8 py-5 bg-white border-b border-ink-200">
        <Logo />
        <div className="flex items-center gap-2">
          <Link href="/login" className="text-sm text-ink-600 hover:text-ink-900 font-medium px-4 py-2">
            Log in
          </Link>
          <Link href="/register" className="text-sm bg-brand-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-brand-700 transition-colors">
            Get started free
          </Link>
        </div>
      </nav>

      {/* Hero: headline + the actual product, not an illustration */}
      <section className="max-w-6xl mx-auto px-6 pt-16 md:pt-24 pb-20 grid md:grid-cols-2 gap-12 md:gap-16 items-center">
        <div>
          <h1 className="font-display text-4xl md:text-5xl font-bold text-ink-900 leading-[1.1] tracking-tight mb-5">
            Your GPA,
            <br />
            <span className="text-brand-600">live all semester</span>
          </h1>
          <p className="text-lg text-ink-600 leading-relaxed mb-8 max-w-md">
            You know your GPA in August, then you&apos;re blind until final grades post.
            Ampliscore shows it move in real time — enter one test score and watch
            your GPA update.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/register" className="bg-brand-600 text-white px-6 py-3 rounded-lg font-medium text-sm hover:bg-brand-700 transition-colors">
              Start tracking for free
            </Link>
            <Link href="/login" className="text-ink-900 bg-white border border-ink-200 px-6 py-3 rounded-lg font-medium text-sm hover:bg-brand-50 transition-colors">
              Log in
            </Link>
          </div>
          <p className="text-sm text-ink-400 mt-4">Free for 4 courses. No card required.</p>
        </div>

        {/* Real product view — this is what the dashboard actually shows */}
        <div className="bg-white rounded-xl border border-ink-200 shadow-card p-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-400 mb-1">Current GPA</p>
          <p className="font-display text-6xl font-bold text-brand-600 tnum leading-none mb-6">3.42</p>
          <div className="space-y-4">
            {[
              { name: "Organic Chemistry", code: "CHM 350", pct: 78, grade: "C+", tone: "warn" },
              { name: "Linear Algebra", code: "MATH 220", pct: 91, grade: "A-", tone: "good" },
              { name: "Microeconomics", code: "ECON 120", pct: 85, grade: "B", tone: "good" },
            ].map((c) => (
              <div key={c.code}>
                <div className="flex items-baseline justify-between mb-1.5">
                  <div>
                    <p className="text-sm font-medium text-ink-900">{c.name}</p>
                    <p className="text-xs text-ink-400">{c.code}</p>
                  </div>
                  <div className="text-right">
                    <p className={`font-display text-lg font-bold tnum ${c.tone === "warn" ? "text-warn" : "text-good"}`}>
                      {c.pct}%
                    </p>
                    <p className="text-xs text-ink-400 tnum">{c.grade}</p>
                  </div>
                </div>
                <div className="h-1.5 bg-ink-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${c.tone === "warn" ? "bg-warn" : "bg-good"}`}
                    style={{ width: `${c.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-ink-400 mt-6 pt-4 border-t border-ink-100">
            Your GPA updates the moment you enter a grade.
          </p>
        </div>
      </section>

      {/* What it does — plain statements, no icons, no filler */}
      <section className="max-w-5xl mx-auto px-6 pb-20">
        <h2 className="font-display text-2xl font-bold text-ink-900 mb-8">What you get</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-ink-200 rounded-xl overflow-hidden border border-ink-200">
          {[
            {
              title: "Live GPA",
              desc: "Enter a grade and your GPA updates instantly. No waiting until December to find out where you landed.",
            },
            {
              title: "What you need to score",
              desc: "Set a target grade and our AI tells you what you need on everything left, and whether it is still achievable.",
            },
            {
              title: "Warns you early",
              desc: "A course slipping toward failing shows up on your dashboard and in a Monday email.",
            },
            {
              title: "Final grade prediction",
              desc: "See the grade each class is heading toward, based on the assignments you have already turned in.",
            },
            {
              title: "Plans your GPA",
              desc: "Model next semester before you register. Know what keeps the scholarship.",
            },
            {
              title: "Rates professors",
              desc: "Reviews from students who took the class, tied to the course code.",
            },
          ].map((f) => (
            <div key={f.title} className="bg-white p-6">
              <h3 className="font-medium text-ink-900 mb-2">{f.title}</h3>
              <p className="text-sm text-ink-600 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="max-w-3xl mx-auto px-6 pb-24">
        <h2 className="font-display text-2xl font-bold text-center text-ink-900 mb-8">Pricing</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="bg-white rounded-xl p-6 border border-ink-200 shadow-card">
            <h3 className="font-medium text-ink-900 text-lg mb-1">Free</h3>
            <div className="font-display text-3xl font-bold text-ink-900 tnum mb-5">
              $0<span className="text-sm text-ink-400 font-normal font-sans">/mo</span>
            </div>
            {["Up to 4 courses", "Grade tracking and weighted categories", "Professor ratings"].map((f) => (
              <div key={f} className="flex items-start gap-2 text-sm text-ink-600 mb-2.5">
                <span className="text-good mt-0.5">✓</span> {f}
              </div>
            ))}
            <Link href="/register" className="block text-center mt-6 border border-ink-200 text-ink-900 py-2.5 rounded-lg text-sm font-medium hover:bg-brand-50 transition-colors">
              Get started
            </Link>
          </div>

          <div className="bg-brand-800 rounded-xl p-6">
            <h3 className="font-medium text-white text-lg mb-1">Pro</h3>
            <div className="font-display text-3xl font-bold text-white tnum mb-5">
              $4.99<span className="text-sm text-brand-300 font-normal font-sans">/mo</span>
            </div>
            {["Unlimited courses", "AI grade prediction", "GPA planner", "At-risk alerts", "Weekly email digest"].map((f) => (
              <div key={f} className="flex items-start gap-2 text-sm text-brand-100 mb-2.5">
                <span className="text-white mt-0.5">✓</span> {f}
              </div>
            ))}
            <Link href="/register" className="block text-center mt-6 bg-white text-brand-800 py-2.5 rounded-lg text-sm font-medium hover:bg-brand-50 transition-colors">
              Get Pro
            </Link>
            <p className="text-xs text-brand-300 text-center mt-3">Cancel anytime.</p>
          </div>
        </div>
      </section>

      {/* Beta — flat, no gradient */}
      <section className="max-w-3xl mx-auto px-6 pb-20">
        <div className="bg-white border border-ink-200 rounded-xl p-8 md:p-10 text-center shadow-card">
          <h2 className="font-display text-2xl font-bold text-ink-900 mb-3">Join the beta</h2>
          <p className="text-ink-600 mb-7 max-w-md mx-auto leading-relaxed">
            Test everything on web and mobile before launch and keep Pro access for free.
          </p>
          <a
            href="https://ampliscore.app/beta.html"
            className="inline-block bg-brand-600 text-white font-medium px-7 py-3 rounded-lg text-sm hover:bg-brand-700 transition-colors"
          >
            Apply for beta access
          </a>
        </div>
      </section>

      <footer className="border-t border-ink-200 bg-white py-8">
        <div className="max-w-5xl mx-auto px-6 flex flex-wrap items-center justify-between gap-4 text-sm">
          <p className="text-ink-400">© 2026 Ampliscore · Know where you stand</p>
          <div className="flex items-center gap-5">
            <Link href="/terms" className="text-ink-600 hover:text-ink-900">Terms</Link>
            <Link href="/privacy" className="text-ink-600 hover:text-ink-900">Privacy</Link>
            <Link href="/contact" className="text-ink-600 hover:text-ink-900">Contact</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}

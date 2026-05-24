import Link from "next/link";

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[#F5F3FF]">
      <nav className="bg-white border-b border-purple-100 px-8 py-5 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <svg width="32" height="32" viewBox="0 0 36 36" fill="none">
            <rect width="36" height="36" rx="10" fill="#EDE9FE"/>
            <circle cx="18" cy="18" r="9" fill="none" stroke="#7C3AED" strokeWidth="2"/>
            <circle cx="18" cy="18" r="5" fill="#DDD6FE"/>
            <circle cx="18" cy="18" r="2.5" fill="#7C3AED"/>
          </svg>
          <span className="text-lg font-medium text-[#1E1040]">ampli<span className="text-purple-600">score</span></span>
        </Link>
        <Link href="/" className="text-sm text-purple-600 hover:underline">← Back to home</Link>
      </nav>
      <div className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-medium text-[#1E1040] mb-2">Terms of Service</h1>
        <p className="text-sm text-purple-900/40 mb-8">Last updated: January 1, 2025</p>
        <div className="bg-white rounded-2xl border border-purple-100 p-8 space-y-6 text-sm text-purple-900/70 leading-relaxed">
          <section>
            <h2 className="text-base font-medium text-[#1E1040] mb-2">1. Acceptance of Terms</h2>
            <p>By accessing or using Ampliscore ("the Service"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Service. You must be at least 13 years old to use Ampliscore.</p>
          </section>
          <section>
            <h2 className="text-base font-medium text-[#1E1040] mb-2">2. Description of Service</h2>
            <p>Ampliscore is a grade tracking and professor rating platform for college and university students. The Service allows users to manually enter their grades, calculate their GPA, and submit ratings and reviews of professors. Ampliscore is not affiliated with, endorsed by, or connected to any university or educational institution. All grade data is entered manually by users and is not accessed from any official academic system.</p>
          </section>
          <section>
            <h2 className="text-base font-medium text-[#1E1040] mb-2">3. User Accounts</h2>
            <p>You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to provide accurate and complete information when creating your account. Ampliscore reserves the right to terminate accounts that violate these terms.</p>
          </section>
          <section>
            <h2 className="text-base font-medium text-[#1E1040] mb-2">4. User Content & Professor Reviews</h2>
            <p>You retain ownership of content you submit. By submitting content, you grant Ampliscore a license to display and distribute it within the Service. Professor ratings and reviews must represent your genuine opinion and experience. You agree not to submit false, defamatory, or misleading reviews. Reviews must be opinion-based and not stated as verified facts. Ampliscore reserves the right to remove content that violates community guidelines.</p>
          </section>
          <section>
            <h2 className="text-base font-medium text[#1E1040] mb-2">5. Prohibited Uses</h2>
            <p>You may not use the Service to: post false or defamatory content about professors or institutions; harass, threaten, or harm other users; attempt to gain unauthorized access to our systems; use the Service for any unlawful purpose; or impersonate any person or entity.</p>
          </section>
          <section>
            <h2 className="text-base font-medium text-[#1E1040] mb-2">6. Disclaimer of Warranties</h2>
            <p>Ampliscore is provided "as is" without warranties of any kind. Grade predictions and GPA calculations are estimates only and should not be relied upon as official academic records. Always verify your grades with your institution's official systems.</p>
          </section>
          <section>
            <h2 className="text-base font-medium text-[#1E1040] mb-2">7. Limitation of Liability</h2>
            <p>Ampliscore shall not be liable for any indirect, incidental, or consequential damages arising from your use of the Service. Our total liability shall not exceed the amount you paid for the Service in the past 12 months.</p>
          </section>
          <section>
            <h2 className="text-base font-medium text-[#1E1040] mb-2">8. Changes to Terms</h2>
            <p>We may update these terms from time to time. We will notify you of significant changes via email or through the Service. Continued use of the Service after changes constitutes acceptance of the new terms.</p>
          </section>
          <section>
            <h2 className="text-base font-medium text-[#1E1040] mb-2">9. Contact</h2>
            <p>For questions about these terms, contact us at <a href="mailto:legal@ampliscore.com" className="text-purple-600 hover:underline">legal@ampliscore.com</a></p>
          </section>
        </div>
      </div>
      <footer className="border-t border-purple-100 bg-white py-6 text-center text-sm text-purple-400 mt-8">
        © 2026 Ampliscore · <Link href="/privacy" className="hover:text-purple-600">Privacy Policy</Link>
      </footer>
    </main>
  );
}

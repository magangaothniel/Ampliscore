import Link from "next/link";

export default function PrivacyPage() {
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
        <h1 className="text-3xl font-medium text-[#1E1040] mb-2">Privacy Policy</h1>
        <p className="text-sm text-purple-900/40 mb-8">Last updated: January 1, 2025</p>
        <div className="bg-white rounded-2xl border border-purple-100 p-8 space-y-6 text-sm text-purple-900/70 leading-relaxed">
          <section>
            <h2 className="text-base font-medium text-[#1E1040] mb-2">1. Information We Collect</h2>
            <p>We collect information you provide directly: your name, email address, university, major, and grade data you manually enter. We also collect usage data such as pages visited and features used. We do not access any official academic records or university systems.</p>
          </section>
          <section>
            <h2 className="text-base font-medium text-[#1E1040] mb-2">2. How We Use Your Information</h2>
            <p>We use your information to provide and improve the Service, calculate your GPA and grade predictions, display professor ratings to other users at your university, send important account notifications, and respond to your support requests. We do not sell your personal data to third parties. Ever.</p>
          </section>
          <section>
            <h2 className="text-base font-medium text-[#1E1040] mb-2">3. Data Sharing</h2>
            <p>Your grade data is private and only visible to you. Professor reviews you submit are visible to other students at your university. We share data with service providers (Supabase for database hosting, Stripe for payments) only as necessary to operate the Service. We may disclose information if required by law.</p>
          </section>
          <section>
            <h2 className="text-base font-medium text-[#1E1040] mb-2">4. FERPA Compliance</h2>
            <p>Ampliscore is not subject to FERPA because we do not access or maintain official educational records. All data in our system is voluntarily entered by students themselves. We are an independent tool, not connected to any institution's systems.</p>
          </section>
          <section>
            <h2 className="text-base font-medium text-[#1E1040] mb-2">5. Data Security</h2>
            <p>We use industry-standard security measures including encryption in transit and at rest, row-level security on our database, and secure authentication. No system is 100% secure, but we take reasonable steps to protect your data.</p>
          </section>
          <section>
            <h2 className="text-base font-medium text-[#1E1040] mb-2">6. Your Rights</h2>
            <p>You have the right to access, correct, or delete your personal data at any time. You can update your profile information in account settings or delete your entire account and all associated data from the danger zone in settings. To request a data export, contact us at privacy@ampliscore.com.</p>
          </section>
          <section>
            <h2 className="text-base font-medium text-[#1E1040] mb-2">7. Cookies</h2>
            <p>We use essential cookies for authentication and session management. We do not use advertising or tracking cookies. You can disable cookies in your browser settings, but this may affect functionality.</p>
          </section>
          <section>
            <h2 className="text-base font-medium text-[#1E1040] mb-2">8. Children's Privacy</h2>
            <p>Ampliscore is intended for college students (18+). We do not knowingly collect data from anyone under 13. If you believe a minor has created an account, please contact us immediately.</p>
          </section>
          <section>
            <h2 className="text-base font-medium text-[#1E1040] mb-2">9. Contact</h2>
            <p>For privacy questions or data requests: <a href="mailto:privacy@ampliscore.com" className="text-purple-600 hover:underline">privacy@ampliscore.com</a></p>
          </section>
        </div>
      </div>
      <footer className="border-t border-purple-100 bg-white py-6 text-center text-sm text-purple-400 mt-8">
        © 2025 Ampliscore · <Link href="/terms" className="hover:text-purple-600">Terms of Service</Link>
      </footer>
    </main>
  );
}

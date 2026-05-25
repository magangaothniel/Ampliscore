import Link from "next/link";

export const metadata = {
  title: "Privacy Policy",
  description: "Ampliscore Privacy Policy",
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#F5F3FF] py-12 px-6">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <Link href="/" className="text-purple-600 text-sm hover:underline">← Back to Ampliscore</Link>
        </div>
        <div className="bg-white rounded-2xl border border-purple-100 p-8 md:p-12">
          <h1 className="text-3xl font-bold text-[#1E1040] mb-2">Privacy Policy</h1>
          <p className="text-sm text-purple-900/40 mb-8">Last updated: May 25, 2026</p>

          <div className="space-y-6 text-sm text-purple-900/70 leading-relaxed">

            <section>
              <h2 className="text-lg font-semibold text-[#1E1040] mb-2">1. Information We Collect</h2>
              <p className="mb-2">We collect the following information when you use Ampliscore:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Account information:</strong> name, email address, university</li>
                <li><strong>Academic data:</strong> courses, grades, and GPA data you voluntarily enter</li>
                <li><strong>Profile information:</strong> profile photo, year of study</li>
                <li><strong>Usage data:</strong> how you interact with the app</li>
                <li><strong>Device information:</strong> browser type, operating system</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-[#1E1040] mb-2">2. How We Use Your Information</h2>
              <ul className="list-disc pl-5 space-y-1">
                <li>To provide and improve the Service</li>
                <li>To send weekly grade summary emails (you may opt out at any time)</li>
                <li>To process payments for Pro subscriptions</li>
                <li>To respond to support requests</li>
                <li>To detect and prevent fraud or abuse</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-[#1E1040] mb-2">3. Data Sharing</h2>
              <p className="mb-2">We do not sell your personal data. We share data only with:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Supabase:</strong> database and authentication provider</li>
                <li><strong>Stripe:</strong> payment processing</li>
                <li><strong>Resend:</strong> email delivery</li>
                <li><strong>Vercel:</strong> hosting and infrastructure</li>
                <li><strong>Anthropic:</strong> AI grade predictions (Pro feature only)</li>
              </ul>
              <p className="mt-2">We never share your academic data with your university or any educational institution.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-[#1E1040] mb-2">4. Data Security</h2>
              <p>Your data is stored securely using industry-standard encryption. We use Supabase with row-level security policies to ensure users can only access their own data. All data is transmitted over HTTPS.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-[#1E1040] mb-2">5. Children's Privacy (COPPA)</h2>
              <p>Ampliscore is intended for users 13 years of age and older. We do not knowingly collect personal information from children under 13. If we become aware that we have collected data from a child under 13, we will delete it immediately.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-[#1E1040] mb-2">6. Your Rights (GDPR & CCPA)</h2>
              <p className="mb-2">Depending on your location, you may have the right to:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Access the personal data we hold about you</li>
                <li>Correct inaccurate data</li>
                <li>Request deletion of your data</li>
                <li>Opt out of marketing emails</li>
                <li>Data portability</li>
              </ul>
              <p className="mt-2">To exercise these rights, contact us at <a href="mailto:magangaothniel@gmail.com" className="text-purple-600 hover:underline">magangaothniel@gmail.com</a>.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-[#1E1040] mb-2">7. Cookies</h2>
              <p>Ampliscore uses essential cookies for authentication and session management only. We do not use advertising or tracking cookies.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-[#1E1040] mb-2">8. Data Retention</h2>
              <p>We retain your data for as long as your account is active. When you close your account, we delete your data within 30 days. Some data may be retained longer where required by law.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-[#1E1040] mb-2">9. Changes to This Policy</h2>
              <p>We may update this Privacy Policy from time to time. We will notify you of significant changes via email. Your continued use of the Service constitutes acceptance of the updated policy.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-[#1E1040] mb-2">10. Contact</h2>
              <p>For privacy questions or data requests, contact us at <a href="mailto:magangaothniel@gmail.com" className="text-purple-600 hover:underline">magangaothniel@gmail.com</a>.</p>
            </section>

          </div>
        </div>
        <p className="text-center text-xs text-purple-900/30 mt-6">
          <Link href="/terms" className="hover:underline">Terms of Service</Link> · © 2026 Ampliscore
        </p>
      </div>
    </main>
  );
}

import Link from "next/link";

export const metadata = {
  title: "Terms of Service",
  description: "Ampliscore Terms of Service",
};

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[#F5F3FF] py-12 px-6">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <Link href="/" className="text-purple-600 text-sm hover:underline">← Back to Ampliscore</Link>
        </div>
        <div className="bg-white rounded-2xl border border-purple-100 p-8 md:p-12">
          <h1 className="text-3xl font-bold text-[#1E1040] mb-2">Terms of Service</h1>
          <p className="text-sm text-purple-900/40 mb-8">Last updated: May 25, 2026</p>

          <div className="prose prose-purple max-w-none space-y-6 text-sm text-purple-900/70 leading-relaxed">

            <section>
              <h2 className="text-lg font-semibold text-[#1E1040] mb-2">1. Acceptance of Terms</h2>
              <p>By accessing or using Ampliscore ("the Service"), you agree to be bound by these Terms of Service. If you do not agree to these terms, do not use the Service. You must be at least 13 years of age to use Ampliscore. By using the Service, you represent that you are 13 years of age or older.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-[#1E1040] mb-2">2. Description of Service</h2>
              <p>Ampliscore is an academic grade tracking and GPA planning tool for college students. The Service allows users to track grades, calculate GPA estimates, rate professors, and plan academic performance. Ampliscore is not affiliated with, endorsed by, or officially connected to any university, college, or educational institution.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-[#1E1040] mb-2">3. User Accounts</h2>
              <p>You are responsible for maintaining the confidentiality of your account credentials. You are responsible for all activity that occurs under your account. You must provide accurate and complete information when creating an account. Ampliscore reserves the right to suspend or terminate accounts that violate these Terms.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-[#1E1040] mb-2">4. User Data and FERPA</h2>
              <p>Ampliscore is not a school official and does not have access to your official academic records. All grade data you enter into Ampliscore is self-reported by you. Ampliscore does not connect to or interface with any university's official systems. Your data is stored securely and is not shared with your educational institution. The Family Educational Rights and Privacy Act (FERPA) applies to educational institutions, not to third-party applications like Ampliscore where you voluntarily enter your own data.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-[#1E1040] mb-2">5. Accuracy of Information</h2>
              <p>GPA calculations, grade predictions, and academic projections provided by Ampliscore are estimates only and are not guaranteed to be accurate. Do not rely solely on Ampliscore for academic decisions. Always verify your grades and GPA with your official university records. Ampliscore is not responsible for any academic decisions made based on information displayed in the app.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-[#1E1040] mb-2">6. Professor Ratings</h2>
              <p>Professor ratings on Ampliscore are submitted by users and reflect individual opinions only. Ampliscore does not verify the accuracy of ratings or reviews. Ampliscore is not responsible for the content of user-submitted ratings. Users must not submit false, defamatory, or malicious reviews. Ampliscore reserves the right to remove any content that violates these Terms.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-[#1E1040] mb-2">7. Prohibited Conduct</h2>
              <p>You agree not to: use the Service for any unlawful purpose; submit false or misleading information; attempt to gain unauthorized access to any part of the Service; interfere with or disrupt the Service; use automated tools to scrape or collect data from the Service; impersonate any person or entity.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-[#1E1040] mb-2">8. Subscription and Payments</h2>
              <p>Ampliscore offers a free tier and a Pro subscription. Pro subscriptions are billed monthly. You may cancel at any time. Refunds are handled on a case-by-case basis. Ampliscore reserves the right to change pricing with 30 days notice. Payments are processed securely through Stripe.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-[#1E1040] mb-2">9. Intellectual Property</h2>
              <p>All content, design, and code in Ampliscore is the property of Ampliscore and is protected by copyright law. You may not copy, reproduce, or distribute any part of the Service without written permission.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-[#1E1040] mb-2">10. Disclaimer of Warranties</h2>
              <p>THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTY OF ANY KIND. AMPLISCORE DOES NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR COMPLETELY SECURE. YOUR USE OF THE SERVICE IS AT YOUR OWN RISK.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-[#1E1040] mb-2">11. Limitation of Liability</h2>
              <p>TO THE MAXIMUM EXTENT PERMITTED BY LAW, AMPLISCORE SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING FROM YOUR USE OF THE SERVICE, INCLUDING BUT NOT LIMITED TO ACADEMIC DECISIONS MADE BASED ON APP DATA.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-[#1E1040] mb-2">12. Data Deletion</h2>
              <p>You may request deletion of your account and all associated data at any time by contacting us through the app or emailing magangaothniel@gmail.com. We will process deletion requests within 30 days.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-[#1E1040] mb-2">13. Changes to Terms</h2>
              <p>Ampliscore reserves the right to modify these Terms at any time. We will notify users of material changes via email or in-app notification. Continued use of the Service after changes constitutes acceptance of the new Terms.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-[#1E1040] mb-2">14. Contact</h2>
              <p>For questions about these Terms, contact us at <a href="mailto:magangaothniel@gmail.com" className="text-purple-600 hover:underline">magangaothniel@gmail.com</a>.</p>
            </section>

          </div>
        </div>
        <p className="text-center text-xs text-purple-900/30 mt-6">
          <Link href="/privacy" className="hover:underline">Privacy Policy</Link> · © 2026 Ampliscore
        </p>
      </div>
    </main>
  );
}

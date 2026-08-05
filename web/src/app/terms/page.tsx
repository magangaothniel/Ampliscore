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
          <h1 className="text-3xl font-bold text-ink-900 mb-2">Terms of Service</h1>
          <p className="text-sm text-ink-400 mb-8">Last updated: August 4, 2026</p>

          <div className="prose prose-purple max-w-none space-y-6 text-sm text-ink-600 leading-relaxed">

            <section>
              <h2 className="text-lg font-semibold text-ink-900 mb-2">1. Acceptance of Terms</h2>
              <p>By accessing or using Ampliscore ("the Service"), you agree to be bound by these Terms of Service. If you do not agree to these terms, do not use the Service. You must be at least 13 years of age to use Ampliscore. By using the Service, you represent that you are 13 years of age or older.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-ink-900 mb-2">2. Description of Service</h2>
              <p>Ampliscore is an academic grade tracking and GPA planning tool for college students. The Service allows users to track grades, calculate GPA estimates, rate professors, and plan academic performance. Ampliscore is not affiliated with, endorsed by, or officially connected to any university, college, or educational institution.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-ink-900 mb-2">3. User Accounts</h2>
              <p>You are responsible for maintaining the confidentiality of your account credentials. You are responsible for all activity that occurs under your account. You must provide accurate and complete information when creating an account. Ampliscore reserves the right to suspend or terminate accounts that violate these Terms.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-ink-900 mb-2">4. User Data and FERPA</h2>
              <p>Ampliscore is not a school official and does not have access to your official academic records. All grade data you enter into Ampliscore is self-reported by you. Ampliscore does not connect to or interface with any university's official systems. Your data is stored securely and is not shared with your educational institution. The Family Educational Rights and Privacy Act (FERPA) applies to educational institutions, not to third-party applications like Ampliscore where you voluntarily enter your own data.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-ink-900 mb-2">5. Accuracy of Information</h2>
              <p>GPA calculations, grade predictions, and academic projections provided by Ampliscore are estimates only and are not guaranteed to be accurate. Do not rely solely on Ampliscore for academic decisions. Always verify your grades and GPA with your official university records. Ampliscore is not responsible for any academic decisions made based on information displayed in the app.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-ink-900 mb-2">6. Professor Ratings</h2>
              <p>Professor ratings on Ampliscore are submitted by users and reflect individual opinions only. Ampliscore does not verify the accuracy of ratings or reviews. Ampliscore is not responsible for the content of user-submitted ratings. Users must not submit false, defamatory, or malicious reviews. Ampliscore reserves the right to remove any content that violates these Terms.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-ink-900 mb-2">7. Prohibited Conduct</h2>
              <p>You agree not to: use the Service for any unlawful purpose; submit false or misleading information; attempt to gain unauthorized access to any part of the Service; interfere with or disrupt the Service; use automated tools to scrape or collect data from the Service; impersonate any person or entity.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-ink-900 mb-2">8. Subscription and Payments</h2>

              <h3 className="font-medium text-ink-900 mt-4 mb-1">What you get, and what it costs</h3>
              <p>Ampliscore has a free plan and a paid plan called Pro. The free plan supports up to 4 courses and does not expire. Pro costs $4.99 per month and adds unlimited courses, AI grade prediction, the GPA planner, at-risk alerts, and the weekly email summary. There is no free trial of Pro; the free plan is how you try Ampliscore.</p>

              <h3 className="font-medium text-ink-900 mt-4 mb-1">Automatic renewal</h3>
              <p>Pro renews automatically every month at $4.99 and will keep renewing until you cancel it. Your card is charged on the same day each month, starting on the day you subscribe. We do not send a reminder before each renewal. You can see your next renewal date any time in Settings.</p>

              <h3 className="font-medium text-ink-900 mt-4 mb-1">Cancelling</h3>
              <p>You can cancel at any time from Settings, which opens the Stripe billing portal. Cancelling stops future charges. It does not end your access immediately: you keep Pro until the end of the period you have already paid for, and then the account returns to the free plan. Cancelling takes a few clicks and never requires emailing us or talking to anyone.</p>

              <h3 className="font-medium text-ink-900 mt-4 mb-1">What happens to your data on the free plan</h3>
              <p>Nothing is deleted when Pro ends. Your courses, grades, and history stay exactly as they are. If you have more than 4 courses, they all remain visible and you keep access to your data, but you will not be able to add new courses until you are back under the limit or subscribe again. Pro-only features stop working until you resubscribe.</p>

              <h3 className="font-medium text-ink-900 mt-4 mb-1">Refunds</h3>
              <p>If Ampliscore is not working as described, email magangaothniel@gmail.com and we will refund you. We generally do not refund a month that has already been used, but we would rather sort out a genuine problem than keep $4.99, so ask.</p>

              <h3 className="font-medium text-ink-900 mt-4 mb-1">Failed payments</h3>
              <p>If a payment fails, Stripe will retry it over the following days. If it keeps failing, the subscription ends and the account returns to the free plan. Your data is not affected.</p>

              <h3 className="font-medium text-ink-900 mt-4 mb-1">Price changes</h3>
              <p>If the price of Pro changes, existing subscribers will be told by email at least 30 days beforehand, and the new price only applies from the renewal after that notice. You can cancel before it takes effect.</p>

              <h3 className="font-medium text-ink-900 mt-4 mb-1">Payment processing</h3>
              <p>Payments are handled by Stripe. Ampliscore never sees or stores your card number. Prices are in US dollars and do not include any tax that may apply where you live. Initiating a chargeback rather than asking for a refund may result in the account being suspended, so please email first.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-ink-900 mb-2">9. User Content and Copyright</h2>
              <p>Ampliscore lets you submit content, including professor ratings, written reviews, and tips for success. You keep ownership of what you submit. By submitting it, you grant Ampliscore a non-exclusive, royalty-free licence to display and distribute that content within the Service.</p>
              <p className="mt-2">You are responsible for what you submit. Do not submit content that is false, defamatory, harassing, or that infringes anyone&apos;s copyright or other rights. Ratings must reflect your genuine experience in a class you actually took. Reviews are automatically screened, and content containing slurs or threats is refused.</p>
              <p className="mt-2">We may remove any content at our discretion, including content reported through the report link on each review. If a review of yours is removed for breaking these rules, you will not be able to post new reviews for 14 days. Repeatedly removed content may result in losing access to reviews permanently.</p>
              <p className="mt-2">If you believe content on Ampliscore infringes your copyright, email magangaothniel@gmail.com with a description of the work, where the content appears on Ampliscore, your contact information, a statement that you believe in good faith the use is not authorised, a statement under penalty of perjury that your notice is accurate and that you are authorised to act for the owner, and your signature. We remove content that is the subject of a valid notice and terminate the accounts of repeat infringers.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-ink-900 mb-2">10. Intellectual Property</h2>
              <p>All content, design, and code in Ampliscore is the property of Ampliscore and is protected by copyright law. You may not copy, reproduce, or distribute any part of the Service without written permission.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-ink-900 mb-2">11. Disclaimer of Warranties</h2>
              <p>THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTY OF ANY KIND. AMPLISCORE DOES NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR COMPLETELY SECURE. YOUR USE OF THE SERVICE IS AT YOUR OWN RISK.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-ink-900 mb-2">12. Limitation of Liability</h2>
              <p>TO THE MAXIMUM EXTENT PERMITTED BY LAW, AMPLISCORE SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING FROM YOUR USE OF THE SERVICE, INCLUDING BUT NOT LIMITED TO ACADEMIC DECISIONS MADE BASED ON APP DATA.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-ink-900 mb-2">13. Data Deletion</h2>
              <p>You may request deletion of your account and all associated data at any time by contacting us through the app or emailing magangaothniel@gmail.com. We will process deletion requests within 30 days.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-ink-900 mb-2">14. Changes to Terms</h2>
              <p>Ampliscore reserves the right to modify these Terms at any time. We will notify users of material changes via email or in-app notification. Continued use of the Service after changes constitutes acceptance of the new Terms.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-ink-900 mb-2">15. Contact</h2>
              <p>For questions about these Terms, contact us at <a href="mailto:magangaothniel@gmail.com" className="text-purple-600 hover:underline">magangaothniel@gmail.com</a>.</p>
            </section>

          </div>
        </div>
        <p className="text-center text-xs text-ink-400 mt-6">
          <Link href="/privacy" className="hover:underline">Privacy Policy</Link> · © 2026 Ampliscore
        </p>
      </div>
    </main>
  );
}

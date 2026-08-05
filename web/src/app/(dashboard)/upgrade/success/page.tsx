"use client";
import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import { useSearchParams } from "next/navigation";

const UNLOCKED = [
  {
    title: "Unlimited courses",
    body: "Add every class you are taking, not just four.",
    href: "/courses",
    cta: "Add a course",
  },
  {
    title: "AI grade prediction",
    body: "See the grade each class is heading toward, and what you need on the work that is left.",
    href: "/courses",
    cta: "Open a course",
  },
  {
    title: "GPA planner",
    body: "Model next semester before you register and find out what keeps your target in reach.",
    href: "/gpa",
    cta: "Open the planner",
  },
  {
    title: "At-risk alerts",
    body: "A class sliding toward failing shows up on your dashboard and in your Monday email.",
    href: "/dashboard",
    cta: "See your dashboard",
  },
];

function SuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");

  // Pro is granted by the Stripe webhook, which is signature verified.
  // The browser must never write is_pro; anyone could call that themselves.
  // We only poll until the webhook has landed, so the UI stays honest.
  const [ready, setReady] = useState(false);
  const [slow, setSlow] = useState(false);
  const [name, setName] = useState("");

  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;
    let tries = 0;

    const check = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase
        .from("profiles").select("is_pro, full_name").eq("id", user.id).single();
      if (cancelled) return;
      if (profile?.full_name) setName(String(profile.full_name).split(" ")[0]);
      if (profile?.is_pro) { setReady(true); return; }
      if (++tries < 10) setTimeout(check, 1500);
      else { setReady(true); setSlow(true); }
    };
    check();
    return () => { cancelled = true; };
  }, [sessionId]);

  if (!ready) {
    return (
      <main className="min-h-screen bg-brand-50 flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="w-10 h-10 mx-auto mb-6 rounded-full border-3 border-brand-200 border-t-brand-600 animate-spin" />
          <h1 className="font-display text-xl font-bold text-ink-900 mb-2">
            Activating your subscription
          </h1>
          <p className="text-ink-600 text-sm leading-relaxed">
            Stripe is confirming your payment. This usually takes a few seconds.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-brand-50 px-4 py-12 md:py-16">
      <div className="max-w-2xl mx-auto">

        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-brand-100 text-brand-700 text-xs font-semibold uppercase tracking-wide px-3 py-1.5 rounded-full mb-5">
            Pro active
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-bold text-ink-900 tracking-tight mb-3">
            {name ? `You are on Pro, ${name}` : "You are on Pro"}
          </h1>
          <p className="text-ink-600 leading-relaxed max-w-md mx-auto">
            Thank you for backing an app built by a student. Here is what just
            unlocked.
          </p>
        </div>

        <div className="space-y-3 mb-10">
          {UNLOCKED.map((f) => (
            <div
              key={f.title}
              className="bg-white border border-ink-200 shadow-card rounded-xl p-5 flex items-start justify-between gap-4"
            >
              <div className="min-w-0">
                <h2 className="font-medium text-ink-900 mb-1">{f.title}</h2>
                <p className="text-sm text-ink-600 leading-relaxed">{f.body}</p>
              </div>
              <Link
                href={f.href}
                className="flex-shrink-0 text-sm font-medium text-brand-600 hover:text-brand-700 whitespace-nowrap pt-0.5"
              >
                {f.cta}
              </Link>
            </div>
          ))}
        </div>

        <div className="text-center mb-10">
          <Link
            href="/dashboard"
            className="inline-block bg-brand-600 text-white px-8 h-12 leading-[3rem] rounded-lg font-medium hover:bg-brand-700 transition-colors"
          >
            Go to my dashboard
          </Link>
        </div>

        {slow && (
          <div className="bg-white border border-ink-200 rounded-xl p-5 mb-6">
            <p className="text-sm text-ink-600 leading-relaxed">
              Your payment went through but the confirmation is taking longer
              than usual. Refresh in a minute. If Pro is still not showing,
              email magangaothniel@gmail.com and it will be sorted out the same
              day.
            </p>
          </div>
        )}

        <div className="bg-white border border-ink-200 rounded-xl p-5">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-600 mb-3">
            Your subscription
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-ink-600">Plan</span>
              <span className="text-ink-900 font-medium">Ampliscore Pro</span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-600">Price</span>
              <span className="text-ink-900 font-medium tnum">$4.99 / month</span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-600">Renews</span>
              <span className="text-ink-900 font-medium">Monthly, until you cancel</span>
            </div>
          </div>
          <p className="text-sm text-ink-600 leading-relaxed mt-4 pt-4 border-t border-ink-100">
            Cancel any time from{" "}
            <Link href="/settings" className="text-brand-600 font-medium hover:text-brand-700">
              Settings
            </Link>
            . Your receipt is in your email. Questions go to{" "}
            <a href="mailto:magangaothniel@gmail.com" className="text-brand-600 font-medium hover:text-brand-700">
              magangaothniel@gmail.com
            </a>
            .
          </p>
        </div>
      </div>
    </main>
  );
}

export default function SuccessPage() {
  return <Suspense><SuccessContent /></Suspense>;
}

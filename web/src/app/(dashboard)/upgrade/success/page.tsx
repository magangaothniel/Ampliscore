"use client";
import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import { useSearchParams } from "next/navigation";

function SuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");

  // Pro is granted by the Stripe webhook, which is signature verified.
  // The browser must never write is_pro; anyone could call that themselves.
  // Here we only poll until the webhook has landed, so the UI is honest.
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;
    let tries = 0;

    const check = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase
        .from("profiles").select("is_pro").eq("id", user.id).single();
      if (cancelled) return;
      if (profile?.is_pro) { setReady(true); return; }
      if (++tries < 10) setTimeout(check, 1500);
      else setReady(true); // stop spinning; webhook may still be in flight
    };
    check();
    return () => { cancelled = true; };
  }, [sessionId]);

  return (
    <main className="min-h-screen bg-brand-50 flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <h1 className="font-display text-3xl font-bold text-ink-900 mb-3">
          {ready ? "You are on Pro" : "Activating your subscription"}
        </h1>
        <p className="text-ink-600 mb-8">
          {ready
            ? "Unlimited courses, AI grade prediction, and the GPA planner are unlocked."
            : "Stripe is confirming your payment. This usually takes a few seconds."}
        </p>
        <Link href="/dashboard" className="bg-brand-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-brand-700 transition-colors">
          Go to dashboard →
        </Link>
      </div>
    </main>
  );
}

export default function SuccessPage() {
  return <Suspense><SuccessContent /></Suspense>;
}

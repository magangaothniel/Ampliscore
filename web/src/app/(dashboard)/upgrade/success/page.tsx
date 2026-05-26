"use client";
import { useEffect, Suspense } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import { useSearchParams } from "next/navigation";

function SuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");

  useEffect(() => {
    const upgradeUser = async () => {
      if (!sessionId) return;
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get stripe_customer_id from our API using the session_id
      const res = await fetch("/api/stripe/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      const data = await res.json();

      await supabase.from("profiles").update({
        is_pro: true,
        stripe_customer_id: data.customerId || null,
      }).eq("id", user.id);
    };
    upgradeUser();
  }, [sessionId]);

  return (
    <main className="min-h-screen bg-[#F5F3FF] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="text-6xl mb-6">🎉</div>
        <h1 className="text-3xl font-medium text-[#1E1040] mb-3">Welcome to Pro!</h1>
        <p className="text-purple-900/50 mb-8">You now have access to all Pro features. Go track those grades and crush your GPA.</p>
        <Link href="/dashboard" className="bg-purple-600 text-white px-8 py-3 rounded-xl font-medium hover:bg-purple-700 transition-colors">
          Go to dashboard →
        </Link>
      </div>
    </main>
  );
}

export default function SuccessPage() {
  return <Suspense><SuccessContent /></Suspense>;
}

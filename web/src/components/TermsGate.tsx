"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";

export default function TermsGate({ profile }: { profile: any }) {
  const [show, setShow] = useState(false);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    if (profile && !profile.terms_accepted) setShow(true);
  }, [profile]);

  const handleAccept = async () => {
    setAccepting(true);
    const supabase = createClient();
    await supabase.from("profiles").update({ terms_accepted: true }).eq("id", profile.id);
    setShow(false);
    setAccepting(false);
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] px-4">
      <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-xl">
        <div className="text-center mb-6">
          <div className="text-3xl mb-3">📋</div>
          <h2 className="text-xl font-semibold text-[#1E1040] mb-2">Before you get started</h2>
          <p className="text-sm text-purple-900/50">Please review and accept our Terms of Service and Privacy Policy to continue using Ampliscore.</p>
        </div>

        <div className="bg-purple-50 rounded-xl p-4 mb-6 text-xs text-purple-900/60 space-y-2">
          <p>✓ Your grade data is private and never shared with your university</p>
          <p>✓ We do not sell your personal data</p>
          <p>✓ You can delete your account and data at any time</p>
          <p>✓ GPA calculations are estimates — always verify with your school</p>
        </div>

        <p className="text-xs text-purple-900/40 text-center mb-6">
          By continuing, you agree to our{" "}
          <Link href="/terms" target="_blank" className="text-purple-600 hover:underline font-medium">Terms of Service</Link>
          {" "}and{" "}
          <Link href="/privacy" target="_blank" className="text-purple-600 hover:underline font-medium">Privacy Policy</Link>.
        </p>

        <button
          onClick={handleAccept}
          disabled={accepting}
          className="w-full bg-purple-600 text-white py-3 rounded-xl font-medium hover:bg-purple-700 transition-colors disabled:opacity-50"
        >
          {accepting ? "Saving..." : "I agree — let's go"}
        </button>
      </div>
    </div>
  );
}

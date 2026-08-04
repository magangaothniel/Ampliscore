"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    fetch("/api/errors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: error?.message || "Client render error",
        stack: error?.stack || "",
        where: typeof window !== "undefined" ? window.location.pathname : "unknown",
        source: "client",
      }),
    }).catch(() => {});
  }, [error]);

  return (
    <main className="min-h-screen bg-brand-50 flex items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-2xl font-bold text-ink-900 mb-3">
          Something broke on our end
        </h1>
        <p className="text-ink-600 mb-7 leading-relaxed">
          Your grades are safe. We have been told about this automatically and
          will look into it.
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="bg-brand-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors"
          >
            Try again
          </button>
          <Link
            href="/dashboard"
            className="border border-ink-200 text-ink-900 px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-white transition-colors"
          >
            Back to dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}

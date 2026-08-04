"use client";

import { useEffect } from "react";

export default function GlobalError({
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
        message: error?.message || "Root layout error",
        stack: error?.stack || "",
        where: typeof window !== "undefined" ? window.location.pathname : "root",
        source: "client",
      }),
    }).catch(() => {});
  }, [error]);

  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", background: "#F5F3FF", margin: 0 }}>
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ maxWidth: 420, textAlign: "center" }}>
            <h1 style={{ fontSize: 22, color: "#241A3E", marginBottom: 12 }}>
              Ampliscore could not load
            </h1>
            <p style={{ color: "#5B5470", fontSize: 15, lineHeight: 1.6, marginBottom: 24 }}>
              Your data is safe. We have been notified automatically.
            </p>
            <button
              onClick={reset}
              style={{ background: "#7C3AED", color: "#fff", border: 0, padding: "10px 24px", borderRadius: 8, fontSize: 14, cursor: "pointer" }}
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}

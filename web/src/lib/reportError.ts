/**
 * Report a server-side failure to the alerting endpoint.
 *
 * Fire and forget on purpose: alerting must never be the reason a request
 * fails. Use it inside catch blocks in API routes.
 *
 *   try { ... } catch (e) { reportError(e, "api/predict"); throw e; }
 */
export function reportError(err: unknown, where: string, userId?: string) {
  try {
    const base = process.env.NEXT_PUBLIC_APP_URL || "https://ampliscore.app";
    const e = err as any;
    fetch(`${base}/api/errors`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: e?.message ? String(e.message) : String(err),
        stack: e?.stack ? String(e.stack) : "",
        where,
        source: "server",
        userId,
      }),
    }).catch(() => {});
  } catch {
    // never let reporting break the caller
  }
}

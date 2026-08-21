"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";

type Disclosure = {
  hasActiveSubscription: boolean;
  amount: string | null;
  interval: string | null;
  unknown: boolean;
};

/**
 * One modal for both settings and profile. They previously had separate copies
 * that had already drifted apart in wording and colour, which is how the
 * subscription warning would have ended up on only one of them.
 *
 * Deletion is never blocked on having a subscription. The account is deleted
 * and the subscription cancelled in the same request, so the user is told what
 * will happen rather than sent away to do it themselves first.
 */
export default function DeleteAccountModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [confirm, setConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [billing, setBilling] = useState<Disclosure | null>(null);

  useEffect(() => {
    if (!open) return;
    setConfirm("");
    setError("");
    setBilling(null);

    (async () => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      try {
        const res = await fetch("/api/account/delete", {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (res.ok) setBilling(await res.json());
      } catch {
        // Leave billing null. The modal falls back to wording that doesn't
        // claim anything either way about a subscription.
      }
    })();
  }, [open]);

  if (!open) return null;

  async function handleDelete() {
    if (confirm !== "DELETE") return;
    setDeleting(true);
    setError("");

    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setDeleting(false);
      setError("Your session expired. Please sign in again.");
      return;
    }

    try {
      const res = await fetch("/api/account/delete", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (res.ok) {
        await supabase.auth.signOut();
        window.location.href = "/";
        return;
      }

      const body = await res.json().catch(() => ({} as any));
      setError(body.error || "Account deletion failed. Please try again or email support.");
    } catch {
      setError("Could not reach the server. Please try again.");
    }
    setDeleting(false);
  }

  const paying = billing?.hasActiveSubscription === true;
  const per = billing?.interval === "year" ? "year" : "month";

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
        <h2 className="text-lg font-medium text-ink-900 mb-2">Delete your account?</h2>

        <p className="text-sm text-ink-600 mb-3">
          This permanently deletes your courses, grades, and assignments. Your professor
          ratings stay up but are no longer linked to you. This cannot be undone.
        </p>

        {paying && (
          <div className="mb-4 rounded-xl bg-brand-50 border border-brand-100 p-3">
            <p className="text-sm text-ink-900 font-medium mb-1">
              Your Pro subscription will be cancelled
            </p>
            <p className="text-sm text-ink-600">
              You are paying ${billing?.amount} per {per}. Deleting your account cancels
              it immediately, so you will not be charged again. The rest of the {per} you
              have already paid for is not refunded.
            </p>
          </div>
        )}

        {billing?.unknown && (
          <div className="mb-4 rounded-xl bg-brand-50 border border-brand-100 p-3">
            <p className="text-sm text-ink-600">
              We could not reach Stripe to check your billing status. If you have Pro, it
              will still be cancelled as part of deleting your account.
            </p>
          </div>
        )}

        <div className="mb-4">
          <label className="block text-sm font-medium text-ink-900 mb-1.5">
            Type <span className="font-mono text-brand-600">DELETE</span> to confirm
          </label>
          <input
            type="text"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="off"
            className="w-full px-4 py-2.5 rounded-xl border border-ink-200 text-sm focus:outline-none focus:border-brand-600 focus:ring-3 focus:ring-brand-100"
          />
        </div>

        {error && <p className="text-sm text-bad mb-3">{error}</p>}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={deleting}
            className="flex-1 border border-ink-200 text-ink-900 h-11 rounded-lg text-sm font-medium hover:bg-brand-50 disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={confirm !== "DELETE" || deleting}
            className="flex-1 bg-brand-600 text-white h-11 rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-40 transition-colors"
          >
            {deleting ? "Deleting..." : "Delete account"}
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { BADGES, BADGES_BY_CODE, type Badge } from "@/lib/achievements";

/**
 * Shows every badge, earned ones in colour and the rest greyed out. Seeing what
 * is still available is the point — a shelf of locked badges gives a student
 * something to aim at, where showing only earned ones tells them nothing.
 */
export default function BadgeShelf({ celebrate = [] }: { celebrate?: Badge[] }) {
  const [earned, setEarned] = useState<Set<string> | null>(null);
  const [toast, setToast] = useState<Badge | null>(null);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("achievements")
        .select("code")
        .eq("user_id", user.id);
      setEarned(new Set((data ?? []).map((r: any) => r.code)));
    })();
  }, []);

  useEffect(() => {
    if (celebrate.length === 0) return;
    setToast(celebrate[0]);
    const t = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(t);
  }, [celebrate]);

  const count = earned?.size ?? 0;

  return (
    <div className="bg-white rounded-xl border border-ink-200 shadow-card p-6">
      <div className="flex items-baseline justify-between mb-4">
        <h2 className="font-medium text-ink-900">Badges</h2>
        <span className="text-sm text-ink-400 tnum">
          {count} of {BADGES.length}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {BADGES.map((badge) => {
          const has = earned?.has(badge.code) ?? false;
          return (
            <div
              key={badge.code}
              className={`rounded-xl border p-3 transition-colors ${
                has
                  ? "border-brand-100 bg-brand-50"
                  : "border-ink-100 bg-white opacity-55"
              }`}
            >
              <div className={`text-2xl mb-1 ${has ? "" : "grayscale"}`} aria-hidden>
                {badge.icon}
              </div>
              <p className="text-sm font-medium text-ink-900">{badge.name}</p>
              <p className="text-xs text-ink-600 mt-0.5 leading-snug">
                {badge.description}
              </p>
            </div>
          );
        })}
      </div>

      {toast && (
        <div
          role="status"
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-ink-900 text-white rounded-2xl px-5 py-3.5 shadow-lg flex items-center gap-3"
        >
          <span className="text-2xl" aria-hidden>{toast.icon}</span>
          <div>
            <p className="text-sm font-medium">Badge earned: {toast.name}</p>
            <p className="text-xs text-white/70">{toast.description}</p>
          </div>
        </div>
      )}
    </div>
  );
}

/** Named export so other screens can render a single earned badge inline. */
export function BadgeChip({ code }: { code: string }) {
  const badge = BADGES_BY_CODE[code];
  if (!badge) return null;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 border border-brand-100 px-2.5 py-1 text-xs font-medium text-ink-900">
      <span aria-hidden>{badge.icon}</span>
      {badge.name}
    </span>
  );
}

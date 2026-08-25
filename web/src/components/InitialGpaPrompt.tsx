"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase";
import { isValidPriorGpa, isValidPriorCredits } from "@/lib/gpa";

/**
 * Asks for the GPA the student is carrying into this semester.
 *
 * Without it, the dashboard number is only this semester's GPA, which for
 * anyone past their first term is not the GPA they actually have.
 *
 * Skipping is a real answer, not a delay. `gpa_prompt_seen` is set either way,
 * so this never reappears; it can be added later from settings. GPA and
 * credits are required together, because a GPA with no credit count can't be
 * weighted against the current semester.
 */
export default function InitialGpaPrompt({
  open,
  onDone,
}: {
  open: boolean;
  /** Receives the saved values, or null when skipped. */
  onDone: (saved: { prior_gpa: number; prior_credits: number } | null) => void;
}) {
  const [gpa, setGpa] = useState("");
  const [credits, setCredits] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

  const gpaOk = isValidPriorGpa(gpa);
  const creditsOk = isValidPriorCredits(credits);
  const canSave = gpaOk && creditsOk;

  async function markSeen(extra: Record<string, any> = {}) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase
      .from("profiles")
      .update({ gpa_prompt_seen: true, ...extra })
      .eq("id", user.id);
  }

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    setError("");
    try {
      await markSeen({ prior_gpa: Number(gpa), prior_credits: Number(credits) });
      onDone({ prior_gpa: Number(gpa), prior_credits: Number(credits) });
    } catch {
      setError("Could not save that. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSkip() {
    setSaving(true);
    try {
      await markSeen();
    } catch {
      // Not worth blocking them over. Worst case it asks once more.
    } finally {
      setSaving(false);
      onDone(null);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md">
        <h2 className="font-display text-xl font-bold text-ink-900 mb-1.5">
          What&apos;s your GPA right now?
        </h2>
        <p className="text-sm text-ink-600 mb-5 leading-relaxed">
          Ampliscore blends this with your current classes, so the number you see
          is your real GPA and not just this semester&apos;s.
        </p>

        <div className="grid grid-cols-2 gap-3 mb-2">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-ink-400 mb-1.5">
              Current GPA
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={gpa}
              onChange={(e) => setGpa(e.target.value)}
              placeholder="3.42"
              className={`w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-3 focus:ring-brand-100 ${
                gpa !== "" && !gpaOk ? "border-bad" : "border-ink-200 focus:border-brand-600"
              }`}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-ink-400 mb-1.5">
              Credits earned
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={credits}
              onChange={(e) => setCredits(e.target.value)}
              placeholder="45"
              className={`w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-3 focus:ring-brand-100 ${
                credits !== "" && !creditsOk ? "border-bad" : "border-ink-200 focus:border-brand-600"
              }`}
            />
          </div>
        </div>

        <p className="text-xs text-ink-400 leading-relaxed mb-5">
          Both are on your transcript or student portal. They&apos;re needed
          together, since credits are what weight the GPA.
        </p>

        {error && <p className="text-sm text-bad mb-3">{error}</p>}

        <button
          onClick={handleSave}
          disabled={!canSave || saving}
          className="w-full bg-brand-600 text-white h-11 rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-40 transition-colors"
        >
          {saving ? "Saving..." : "Save"}
        </button>

        <button
          onClick={handleSkip}
          disabled={saving}
          className="w-full text-ink-600 text-sm font-medium py-3 hover:text-ink-900 disabled:opacity-40"
        >
          I don&apos;t know it yet
        </button>

        <p className="text-xs text-ink-400 text-center">
          You can add it any time from Settings.
        </p>
      </div>
    </div>
  );
}

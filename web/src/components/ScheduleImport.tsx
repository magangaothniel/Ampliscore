"use client";
import { useState, useRef } from "react";
import { createClient } from "@/lib/supabase";

const COLORS = ["#7C3AED","#10B981","#3B82F6","#F59E0B","#EF4444","#EC4899","#8B5CF6","#14B8A6"];

type Row = {
  include: boolean;
  name: string;
  code: string;
  professor: string;
  credits: string;
  color: string;
};

export default function ScheduleImport({
  userId,
  semester,
  year,
  slotsLeft,
  onImported,
}: {
  userId: string;
  semester: string;
  year: string;
  slotsLeft: number;
  onImported: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [rows, setRows] = useState<Row[] | null>(null);
  const [saving, setSaving] = useState(false);

  const readAsBase64 = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result).split(",")[1] || "");
      r.onerror = () => reject(new Error("read failed"));
      r.readAsDataURL(file);
    });

  const handleFile = async (file: File) => {
    setError("");
    setBusy(true);
    try {
      const data = await readAsBase64(file);
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      const res = await fetch("/api/schedule-import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ mediaType: file.type, data }),
      });
      const payload = await res.json();

      if (!res.ok) {
        setError(
          payload?.error === "limit_reached"
            ? "You have used all 5 imports this month. Add courses manually below."
            : payload?.error || "Could not read that file."
        );
        return;
      }

      if (!payload.courses?.length) {
        setError("No courses found in that file. Try a clearer screenshot.");
        return;
      }

      setRows(
        payload.courses.map((c: any, i: number) => ({
          include: true,
          name: c.name || "",
          code: c.code || "",
          professor: c.professor || "",
          credits: String(c.credits ?? 3),
          color: COLORS[i % COLORS.length],
        }))
      );
    } catch {
      setError("Something went wrong reading that file.");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const update = (i: number, patch: Partial<Row>) =>
    setRows((prev) => prev!.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  const chosen = (rows || []).filter((r) => r.include && r.name.trim());
  const overLimit = chosen.length > slotsLeft;

  const save = async () => {
    if (!chosen.length || overLimit) return;
    setSaving(true);
    const supabase = createClient();
    const { error: err } = await supabase.from("courses").insert(
      chosen.map((r) => ({
        user_id: userId,
        name: r.name.trim(),
        code: r.code.trim(),
        professor: r.professor.trim(),
        credits: parseInt(r.credits) || 3,
        semester,
        year: parseInt(year),
        color: r.color,
        current_grade: 0,
      }))
    );
    setSaving(false);
    if (err) {
      setError("Those did not save. Try again.");
      return;
    }
    setRows(null);
    onImported();
  };

  // ---- review list ----
  if (rows) {
    return (
      <div className="mb-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-ink-900">
            Found {rows.length} course{rows.length !== 1 ? "s" : ""}
          </h3>
          <button
            type="button"
            onClick={() => { setRows(null); setError(""); }}
            className="text-xs text-brand-600 hover:underline"
          >
            Start over
          </button>
        </div>
        <p className="text-xs text-ink-400 mb-3 leading-relaxed">
          Check these before saving. Anything read wrong can be fixed here.
        </p>

        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
          {rows.map((r, i) => (
            <div
              key={i}
              className={`rounded-xl border p-3 transition-colors ${
                r.include ? "border-purple-200 bg-purple-50/30" : "border-ink-100 opacity-50"
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <input
                  type="checkbox"
                  checked={r.include}
                  onChange={(e) => update(i, { include: e.target.checked })}
                  className="h-4 w-4 rounded border-purple-200 text-brand-600"
                />
                <span
                  className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: r.color }}
                />
                <input
                  value={r.name}
                  onChange={(e) => update(i, { name: e.target.value })}
                  placeholder="Course name"
                  className="flex-1 min-w-0 px-2 py-1 rounded-lg border border-purple-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div className="grid grid-cols-3 gap-2 pl-8">
                <input
                  value={r.code}
                  onChange={(e) => update(i, { code: e.target.value })}
                  placeholder="Code"
                  className="px-2 py-1 rounded-lg border border-purple-200 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <input
                  value={r.professor}
                  onChange={(e) => update(i, { professor: e.target.value })}
                  placeholder="Professor"
                  className="px-2 py-1 rounded-lg border border-purple-200 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <input
                  type="number"
                  value={r.credits}
                  onChange={(e) => update(i, { credits: e.target.value })}
                  placeholder="Cr"
                  min="0"
                  className="px-2 py-1 rounded-lg border border-purple-200 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>
          ))}
        </div>

        {overLimit && (
          <p className="text-xs text-amber-700 mt-3 leading-relaxed">
            You have {slotsLeft} course slot{slotsLeft !== 1 ? "s" : ""} left on the free plan.
            Uncheck {chosen.length - slotsLeft} to continue, or upgrade for unlimited.
          </p>
        )}
        {error && <p className="text-xs text-red-600 mt-3">{error}</p>}

        <button
          type="button"
          onClick={save}
          disabled={saving || !chosen.length || overLimit}
          className="w-full mt-4 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {saving
            ? "Saving..."
            : `Add ${chosen.length} course${chosen.length !== 1 ? "s" : ""}`}
        </button>

        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px bg-ink-100" />
          <span className="text-xs text-ink-400">or add one manually</span>
          <div className="flex-1 h-px bg-ink-100" />
        </div>
      </div>
    );
  }

  // ---- upload strip ----
  return (
    <div className="mb-5">
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={busy}
        className="w-full rounded-xl border border-dashed border-purple-300 bg-purple-50/40 px-4 py-3.5 text-left hover:bg-purple-50 disabled:opacity-60 transition-colors"
      >
        <span className="block text-sm font-medium text-ink-900">
          {busy ? "Reading your schedule..." : "Import from a screenshot or PDF"}
        </span>
        <span className="block text-xs text-ink-400 mt-0.5">
          {busy
            ? "This takes a few seconds"
            : "Upload your class schedule and we will fill these in for you"}
        </span>
      </button>

      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,application/pdf"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
        }}
        className="hidden"
      />

      {error && <p className="text-xs text-red-600 mt-2">{error}</p>}

      <div className="flex items-center gap-3 mt-5">
        <div className="flex-1 h-px bg-ink-100" />
        <span className="text-xs text-ink-400">or add one manually</span>
        <div className="flex-1 h-px bg-ink-100" />
      </div>
    </div>
  );
}

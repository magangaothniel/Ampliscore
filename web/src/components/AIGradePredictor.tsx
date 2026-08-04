"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";

interface Props {
  course: any;
  categories: any[];
  assignments: any[];
  isPro: boolean;
}

export default function AIGradePredictor({ course, categories, assignments, isPro }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");
  const [targetGrade, setTargetGrade] = useState("90");
  const [limitInfo, setLimitInfo] = useState<{ used: number; cap: number } | null>(null);
  const [limitReached, setLimitReached] = useState(false);

  const runPredictor = async () => {
    setLoading(true);
    setResult("");
    setLimitReached(false);

    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setResult("Please log in again."); setLoading(false); return; }

    const categoryData = categories.map(cat => {
      const catAssignments = assignments.filter(a => a.category_id === cat.id && a.completed);
      const earned = catAssignments.reduce((s, a) => s + (a.grade || 0), 0);
      const possible = catAssignments.reduce((s, a) => s + (a.max_grade || 100), 0);
      const pct = possible > 0 ? (earned / possible) * 100 : null;
      const incomplete = assignments.filter(a => a.category_id === cat.id && !a.completed);
      return { name: cat.name, weight: cat.weight, currentPct: pct, completedCount: catAssignments.length, incompleteCount: incomplete.length };
    });



    try {
      const res = await fetch("/api/predict", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          courseName: course.name,
          courseCode: course.code || "",
          professor: course.professor || "",
          targetGrade,
          categories: categoryData,
        }),
      });

      const data = await res.json();

      if (res.status === 429 || data.error === "limit_reached") {
        setLimitReached(true);
        setLimitInfo({ used: data.used, cap: data.cap });
        setLoading(false);
        return;
      }

      if (data.error) { setResult("Something went wrong. Please try again."); setLoading(false); return; }

      setResult(data.content?.[0]?.text || "Unable to generate prediction.");
      if (data.predictions_used !== undefined) {
        setLimitInfo({ used: data.predictions_used, cap: data.cap });
      }
    } catch {
      setResult("Something went wrong. Please try again.");
    }
    setLoading(false);
  };

  if (!isPro) {
    return (
      <div className="bg-gradient-to-r from-purple-600 to-purple-700 rounded-2xl p-5 text-white">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-lg">🤖</span>
          <span className="font-semibold">AI Grade Predictor</span>
          <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full font-medium">Pro</span>
        </div>
        <p className="text-sm text-purple-100 mb-3">Get AI-powered predictions on your final grade and exactly what you need to hit your target.</p>
        <a href="/upgrade" className="inline-block bg-white text-purple-700 text-sm font-semibold px-4 py-2 rounded-xl hover:bg-purple-50 transition-colors">
          Upgrade to Pro — $4.99/mo
        </a>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-purple-100 overflow-hidden">
      <button onClick={() => { setOpen(!open); if (!open && !result) runPredictor(); }}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-purple-50/50 transition-colors">
        <div className="flex items-center gap-2">
          <span className="text-lg">🤖</span>
          <span className="font-medium text-ink-900">AI Grade Predictor</span>
          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">Pro</span>
        </div>
        <svg className={`w-4 h-4 text-purple-400 transition-transform ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="px-5 pb-5 border-t border-purple-50">
          <div className="flex items-center gap-3 mt-4 mb-4">
            <label className="text-sm text-ink-900 font-medium whitespace-nowrap">Target grade:</label>
            <input type="number" min="0" max="100" value={targetGrade}
              onChange={e => setTargetGrade(e.target.value)}
              className="w-20 px-3 py-1.5 rounded-lg border border-purple-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 text-center" />
            <span className="text-sm text-ink-600">%</span>
            <button onClick={runPredictor} disabled={loading || limitReached}
              className="ml-auto text-sm bg-purple-600 text-white px-4 py-1.5 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50">
              {loading ? "Analyzing..." : "Recalculate"}
            </button>
          </div>

          {limitInfo && !limitReached && (
            <p className="text-xs text-ink-400 mb-3">{limitInfo.used}/{limitInfo.cap} predictions used this month</p>
          )}

          {limitReached && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
              <p className="text-sm font-medium text-amber-800 mb-1">Monthly limit reached</p>
              <p className="text-xs text-amber-600">You've used all {limitInfo?.cap} predictions for this month. Resets on the 1st.</p>
            </div>
          )}

          {loading && (
            <div className="flex items-center gap-3 py-6 justify-center">
              <div className="w-5 h-5 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-ink-600">Claude is analyzing your grades...</span>
            </div>
          )}

          {result && !loading && (
            <div className="bg-[#F5F3FF] rounded-xl p-4">
              <p className="text-sm text-ink-900 leading-relaxed whitespace-pre-wrap">{result}</p>
              <p className="text-xs text-ink-400 mt-3">Powered by Claude AI · Based on your current grades</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

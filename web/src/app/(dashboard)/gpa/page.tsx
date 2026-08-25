"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { cached, invalidate } from "@/lib/cache";
import { getLetterGrade, getGradeColor, getGradePoints } from "@/lib/utils";
import { semesterGpa, cumulativeGpa, formatGpa, courseGrade } from "@/lib/gpa";

function Logo() {
  return (
    <svg aria-hidden="true" width="32" height="32" viewBox="0 0 64 64" fill="none">
      <defs>
        <linearGradient id="capG_gpa" gradientUnits="userSpaceOnUse" x1="0" y1="64" x2="64" y2="0">
          <stop offset="0" stopColor="#5B21B6" />
          <stop offset="1" stopColor="#7C3AED" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill="#EDE9FE" />
      <g transform="translate(32,34) scale(0.78) translate(-32,-29)">
        <path d="M32 11 L59 23.5 L32 36 L5 23.5 Z" stroke="url(#capG_gpa)" strokeWidth="4.6" strokeLinejoin="round" />
        <path d="M16.5 29 L16.5 41.5 C16.5 46.8 47.5 46.8 47.5 41.5 L47.5 29" stroke="url(#capG_gpa)" strokeWidth="4.6" strokeLinecap="round" />
        <path d="M59 23.5 L59 43" stroke="url(#capG_gpa)" strokeWidth="5.5" strokeLinecap="round" />
        <circle cx="59" cy="45.6" r="4.9" fill="#7C3AED" />
      </g>
    </svg>
  );
}

export default function GPAPage() {
  const router = useRouter();
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [targetGPA, setTargetGPA] = useState(3.5);
  const [whatIfGrades, setWhatIfGrades] = useState<Record<string, number>>({});
  const [newCourse, setNewCourse] = useState({ name: "", credits: "3", grade: "85" });
  const [hypothetical, setHypothetical] = useState<any[]>([]);
  const [prior, setPrior] = useState<{ gpa: number | null; credits: number | null }>({ gpa: null, credits: null });

  useEffect(() => { fetchCourses(); }, []);

  const fetchCourses = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }
    const [data, assignData, catData] = await Promise.all([
      cached(`courses:${user.id}`, async () =>
        (await supabase.from("courses").select("*").eq("user_id", user.id)).data),
      cached(`assignments:${user.id}`, async () =>
        (await supabase.from("assignments").select("*").eq("user_id", user.id)).data),
      cached(`categories:${user.id}`, async () =>
        (await supabase.from("grade_categories").select("*")).data),
    ]);

    // The planner was computing semester-only figures while the dashboard
    // showed cumulative, so the same student saw two different GPAs.
    const { data: profileRow } = await supabase
      .from("profiles").select("prior_gpa, prior_credits").eq("id", user.id).single();
    setPrior({ gpa: profileRow?.prior_gpa ?? null, credits: profileRow?.prior_credits ?? null });
    const liveCourses = (data || []).map((course: any) => {
      const cats = (catData || []).filter((c: any) => c.course_id === course.id);
      const courseAssigns = (assignData || []).filter((a: any) => a.course_id === course.id && a.completed);
      return { ...course, current_grade: courseGrade(cats, courseAssigns) };
    });
    setCourses(liveCourses);
    const initial: Record<string, number> = {};
    liveCourses.forEach((c: any) => { initial[c.id] = c.current_grade || 0; });
    setWhatIfGrades(initial);
    setLoading(false);
  };

  // Each figure blends with what the student was carrying in, so the planner
  // agrees with the dashboard. With no prior data these fall back to
  // semester-only, which is what they always were.
  const blend = (rows: { grade: number; credits: number }[]) => {
    const sem = semesterGpa(rows.map(r => ({ current_grade: r.grade, credits: r.credits })));
    const cum = cumulativeGpa(sem, prior.gpa, prior.credits);
    return cum !== null ? cum : sem.gpa;
  };

  const hasPrior = prior.gpa !== null && prior.credits !== null && prior.credits > 0;

  const currentGPA = blend(
    courses.map(c => ({ grade: c.current_grade || 0, credits: c.credits || 3 }))
  );

  const whatIfGPA = blend(
    courses.map(c => ({ grade: whatIfGrades[c.id] ?? c.current_grade ?? 0, credits: c.credits || 3 }))
  );

  const allCourses = [
    ...courses.map(c => ({ name: c.name, credits: c.credits || 3, grade: whatIfGrades[c.id] ?? c.current_grade ?? 0 })),
    ...hypothetical,
  ];
  const combinedGPA = blend(allCourses.map(c => ({ grade: c.grade, credits: c.credits })));

  const neededPerCourse = () => {
    if (hypothetical.length === 0 && courses.length === 0) return null;
    const currentPoints = courses.reduce((sum, c) => sum + getGradePoints(c.current_grade || 0) * (c.credits || 3), 0);
    const currentCredits = courses.reduce((sum, c) => sum + (c.credits || 3), 0);
    const hypCredits = hypothetical.reduce((sum, c) => sum + c.credits, 0);
    if (hypCredits === 0) return null;

    // Prior credits count toward the target too. Without them the answer is
    // badly wrong for anyone past their first semester: a 2.0 across 45 credits
    // takes far more than a good term to pull up to a 3.5.
    const priorCredits = hasPrior ? (prior.credits as number) : 0;
    const priorPoints = hasPrior ? (prior.gpa as number) * priorCredits : 0;

    const needed =
      (targetGPA * (priorCredits + currentCredits + hypCredits) - priorPoints - currentPoints) / hypCredits;
    return Math.min(4.0, Math.max(0, needed));
  };

  const needed = neededPerCourse();

  const addHypothetical = () => {
    setHypothetical([...hypothetical, {
      id: Date.now(),
      name: newCourse.name || "New Course",
      credits: parseInt(newCourse.credits),
      grade: parseFloat(newCourse.grade),
    }]);
    setNewCourse({ name: "", credits: "3", grade: "85" });
  };

  const removeHypothetical = (id: number) => {
    setHypothetical(hypothetical.filter(c => c.id !== id));
  };

  if (loading) return (
    <div className="min-h-screen bg-[#F5F3FF] flex items-center justify-center">
      <div className="text-purple-600 font-medium">Loading...</div>
    </div>
  );

  return (
    <main className="min-h-screen bg-[#F5F3FF]">

      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h1 className="font-display text-2xl md:text-3xl font-bold text-ink-900 tracking-tight">GPA Planner</h1>
          <p className="text-sm text-ink-600 mt-1">Run what-if scenarios and plan your path to your target GPA</p>
        </div>

        {/* GPA Summary */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-2xl p-5 border border-purple-100">
            <div className="text-xs font-semibold uppercase tracking-wide text-ink-400 mb-1.5">{hasPrior ? "Cumulative GPA" : "Current GPA"}</div>
            <div className="font-display text-3xl md:text-4xl font-bold tnum text-brand-600">
              {formatGpa(currentGPA)}
            </div>
          </div>
          <div className="bg-white rounded-2xl p-5 border border-purple-100">
            <div className="text-xs font-semibold uppercase tracking-wide text-ink-400 mb-1.5">What-if GPA</div>
            <div className="font-display text-3xl md:text-4xl font-bold tnum text-ink-900">
              {formatGpa(whatIfGPA)}
            </div>
          </div>
          <div className="bg-white rounded-2xl p-5 border border-purple-100">
            <div className="text-xs font-semibold uppercase tracking-wide text-ink-400 mb-1.5">Combined GPA</div>
            <div className="font-display text-3xl md:text-4xl font-bold tnum text-ink-900">
              {formatGpa(combinedGPA)}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* What-if sliders */}
          <div className="bg-white rounded-xl border border-ink-200 shadow-card overflow-hidden">
            <div className="px-5 py-4 border-b border-purple-50">
              <h2 className="font-medium text-ink-900">What if my grades were...</h2>
              <p className="text-xs text-ink-400 mt-0.5">Drag sliders to see how grades affect your GPA</p>
            </div>
            {courses.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-sm text-ink-400">No courses yet</p>
                <Link href="/courses" className="text-sm text-purple-600 hover:underline mt-1 block">Add courses first</Link>
              </div>
            ) : (
              <div className="divide-y divide-purple-50">
                {courses.map(course => {
                  const grade = whatIfGrades[course.id] ?? course.current_grade ?? 0;
                  return (
                    <div key={course.id} className="px-5 py-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-sm font-medium text-ink-900">{course.name}</div>
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-medium ${getGradeColor(grade)}`}>{grade}%</span>
                          <span className="text-xs text-ink-400">{getLetterGrade(grade)}</span>
                        </div>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={grade}
                        onChange={(e) => setWhatIfGrades({ ...whatIfGrades, [course.id]: parseInt(e.target.value) })}
                        className="w-full accent-purple-600"
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Target GPA + Hypothetical */}
          <div className="space-y-4">
            {/* Target GPA */}
            <div className="bg-white rounded-xl border border-ink-200 shadow-card p-5">
              <h2 className="font-medium text-ink-900 mb-4">Target GPA calculator</h2>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-ink-600">Target GPA</span>
                <span className="text-lg font-medium text-purple-600">{targetGPA.toFixed(1)}</span>
              </div>
              <input
                type="range"
                min="0"
                max="4"
                step="0.1"
                value={targetGPA}
                onChange={(e) => setTargetGPA(parseFloat(e.target.value))}
                className="w-full accent-purple-600 mb-4"
              />
              {needed !== null && (
                <div className={`rounded-xl p-3 text-sm ${needed <= 4.0 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-bad"}`}>
                  {needed <= 4.0
                    ? `You need an avg of ${(needed * 25).toFixed(0)}% (${getLetterGrade(needed * 25)}) across your planned courses to reach ${targetGPA.toFixed(1)} GPA`
                    : `A ${targetGPA.toFixed(1)} GPA is not achievable with your current courses — add more credits`
                  }
                </div>
              )}
            </div>

            {/* Add hypothetical courses */}
            <div className="bg-white rounded-2xl border border-purple-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-purple-50">
                <h2 className="font-medium text-ink-900">Plan future courses</h2>
                <p className="text-xs text-ink-400 mt-0.5">Add courses you plan to take</p>
              </div>
              <div className="p-5">
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <input
                    type="text"
                    value={newCourse.name}
                    onChange={(e) => setNewCourse({ ...newCourse, name: e.target.value })}
                    placeholder="Course name"
                    className="col-span-3 px-3 py-2 rounded-xl border border-purple-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-purple-50/30"
                  />
                  <select
                    value={newCourse.credits}
                    onChange={(e) => setNewCourse({ ...newCourse, credits: e.target.value })}
                    className="px-3 py-2 rounded-xl border border-purple-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-purple-50/30"
                  >
                    {[1,2,3,4,5,6].map(n => <option key={n} value={n}>{n} cr</option>)}
                  </select>
                  <input
                    type="number"
                    value={newCourse.grade}
                    onChange={(e) => setNewCourse({ ...newCourse, grade: e.target.value })}
                    placeholder="Grade %"
                    min="0" max="100"
                    className="px-3 py-2 rounded-xl border border-purple-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-purple-50/30"
                  />
                  <button
                    onClick={addHypothetical}
                    className="bg-purple-600 text-white rounded-xl text-sm font-medium hover:bg-purple-700 transition-colors"
                  >
                    + Add
                  </button>
                </div>
                {hypothetical.length > 0 && (
                  <div className="space-y-2">
                    {hypothetical.map(c => (
                      <div key={c.id} className="flex items-center justify-between bg-purple-50 rounded-xl px-3 py-2">
                        <div className="text-sm text-ink-900">{c.name}</div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-ink-400">{c.credits} cr</span>
                          <span className={`text-sm font-medium ${getGradeColor(c.grade)}`}>{c.grade}%</span>
                          <button onClick={() => removeHypothetical(c.id)} className="text-ink-400 hover:text-bad">×</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

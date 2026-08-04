"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { getLetterGrade, getGradeColor, calculateGPA, getGradePoints } from "@/lib/utils";

function Logo() {
  return (
    <svg width="32" height="32" viewBox="0 0 64 64" fill="none">
      <defs>
        <linearGradient id="capG_gpa" x1="0" y1="64" x2="64" y2="0">
          <stop offset="0" stopColor="#5B21B6" />
          <stop offset="1" stopColor="#7C3AED" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill="#EDE9FE" />
      <g transform="translate(32,34) scale(0.78) translate(-32,-29)">
        <path d="M32 11 L59 23.5 L32 36 L5 23.5 Z" stroke="url(#capG_gpa)" strokeWidth="4.6" strokeLinejoin="round" />
        <path d="M16.5 29 L16.5 41.5 C16.5 46.8 47.5 46.8 47.5 41.5 L47.5 29" stroke="url(#capG_gpa)" strokeWidth="4.6" strokeLinecap="round" />
        <path d="M59 23.5 L59 39.5" stroke="url(#capG_gpa)" strokeWidth="4" strokeLinecap="round" />
        <circle cx="59" cy="45.6" r="4.9" fill="#7C3AED" stroke="#FFFFFF" strokeWidth="2.4" />
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

  useEffect(() => { fetchCourses(); }, []);

  const fetchCourses = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }
    const { data } = await supabase.from("courses").select("*").eq("user_id", user.id);
    const { data: assignData } = await supabase.from("assignments").select("*").eq("user_id", user.id);
    const { data: catData } = await supabase.from("grade_categories").select("*");
    const liveCourses = (data || []).map((course: any) => {
      const cats = (catData || []).filter((c: any) => c.course_id === course.id);
      const courseAssigns = (assignData || []).filter((a: any) => a.course_id === course.id && a.completed);
      if (cats.length === 0) return { ...course, current_grade: 0 };
      let weighted = 0, totalWeight = 0;
      for (const cat of cats) {
        const catA = courseAssigns.filter((a: any) => a.category_id === cat.id);
        if (catA.length > 0) {
          const earned = catA.reduce((s: number, a: any) => s + (a.grade || 0), 0);
          const possible = catA.reduce((s: number, a: any) => s + (a.max_grade || 100), 0);
          weighted += (earned / possible) * 100 * cat.weight;
          totalWeight += cat.weight;
        }
      }
      const grade = totalWeight > 0 ? Math.round((weighted / totalWeight) * 10) / 10 : 0;
      return { ...course, current_grade: grade };
    });
    setCourses(liveCourses);
    const initial: Record<string, number> = {};
    liveCourses.forEach((c: any) => { initial[c.id] = c.current_grade || 0; });
    setWhatIfGrades(initial);
    setLoading(false);
  };

  const currentGPA = calculateGPA(
    courses.map(c => ({ grade: c.current_grade || 0, credits: c.credits || 3 }))
  );

  const whatIfGPA = calculateGPA(
    courses.map(c => ({ grade: whatIfGrades[c.id] ?? c.current_grade ?? 0, credits: c.credits || 3 }))
  );

  const allCourses = [
    ...courses.map(c => ({ name: c.name, credits: c.credits || 3, grade: whatIfGrades[c.id] ?? c.current_grade ?? 0 })),
    ...hypothetical,
  ];
  const combinedGPA = calculateGPA(allCourses.map(c => ({ grade: c.grade, credits: c.credits })));

  const neededPerCourse = () => {
    if (hypothetical.length === 0 && courses.length === 0) return null;
    const currentPoints = courses.reduce((sum, c) => sum + getGradePoints(c.current_grade || 0) * (c.credits || 3), 0);
    const currentCredits = courses.reduce((sum, c) => sum + (c.credits || 3), 0);
    const hypCredits = hypothetical.reduce((sum, c) => sum + c.credits, 0);
    if (hypCredits === 0) return null;
    const needed = (targetGPA * (currentCredits + hypCredits) - currentPoints) / hypCredits;
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
          <p className="text-sm text-purple-900/50 mt-1">Run what-if scenarios and plan your path to your target GPA</p>
        </div>

        {/* GPA Summary */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-2xl p-5 border border-purple-100">
            <div className="text-xs font-semibold uppercase tracking-wide text-ink-400 mb-1.5">Current GPA</div>
            <div className="font-display text-3xl md:text-4xl font-bold tnum text-brand-600">
              {currentGPA.toFixed(2)}
            </div>
          </div>
          <div className="bg-white rounded-2xl p-5 border border-purple-100">
            <div className="text-xs font-semibold uppercase tracking-wide text-ink-400 mb-1.5">What-if GPA</div>
            <div className="font-display text-3xl md:text-4xl font-bold tnum text-ink-900">
              {whatIfGPA.toFixed(2)}
            </div>
          </div>
          <div className="bg-white rounded-2xl p-5 border border-purple-100">
            <div className="text-xs font-semibold uppercase tracking-wide text-ink-400 mb-1.5">Combined GPA</div>
            <div className="font-display text-3xl md:text-4xl font-bold tnum text-ink-900">
              {combinedGPA.toFixed(2)}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* What-if sliders */}
          <div className="bg-white rounded-xl border border-ink-200 shadow-card overflow-hidden">
            <div className="px-5 py-4 border-b border-purple-50">
              <h2 className="font-medium text-[#1E1040]">What if my grades were...</h2>
              <p className="text-xs text-purple-900/40 mt-0.5">Drag sliders to see how grades affect your GPA</p>
            </div>
            {courses.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-sm text-purple-900/40">No courses yet</p>
                <Link href="/courses" className="text-sm text-purple-600 hover:underline mt-1 block">Add courses first</Link>
              </div>
            ) : (
              <div className="divide-y divide-purple-50">
                {courses.map(course => {
                  const grade = whatIfGrades[course.id] ?? course.current_grade ?? 0;
                  return (
                    <div key={course.id} className="px-5 py-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-sm font-medium text-[#1E1040]">{course.name}</div>
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-medium ${getGradeColor(grade)}`}>{grade}%</span>
                          <span className="text-xs text-purple-900/40">{getLetterGrade(grade)}</span>
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
              <h2 className="font-medium text-[#1E1040] mb-4">Target GPA calculator</h2>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-purple-900/60">Target GPA</span>
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
                <div className={`rounded-xl p-3 text-sm ${needed <= 4.0 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}`}>
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
                <h2 className="font-medium text-[#1E1040]">Plan future courses</h2>
                <p className="text-xs text-purple-900/40 mt-0.5">Add courses you plan to take</p>
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
                        <div className="text-sm text-[#1E1040]">{c.name}</div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-purple-900/40">{c.credits} cr</span>
                          <span className={`text-sm font-medium ${getGradeColor(c.grade)}`}>{c.grade}%</span>
                          <button onClick={() => removeHypothetical(c.id)} className="text-purple-900/20 hover:text-red-400">×</button>
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

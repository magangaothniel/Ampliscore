"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { getLetterGrade, getGradeColor, calculateGPA, getGradePoints } from "@/lib/utils";

function Logo() {
  return (
    <svg width="32" height="32" viewBox="0 0 36 36" fill="none">
      <rect width="36" height="36" rx="10" fill="#EDE9FE"/>
      <circle cx="18" cy="18" r="9" fill="none" stroke="#7C3AED" strokeWidth="2"/>
      <circle cx="18" cy="18" r="5" fill="#DDD6FE"/>
      <circle cx="18" cy="18" r="2.5" fill="#7C3AED"/>
      <line x1="18" y1="9" x2="18" y2="12" stroke="#7C3AED" strokeWidth="1.8" strokeLinecap="round"/>
      <line x1="18" y1="24" x2="18" y2="27" stroke="#7C3AED" strokeWidth="1.8" strokeLinecap="round"/>
      <line x1="9" y1="18" x2="12" y2="18" stroke="#7C3AED" strokeWidth="1.8" strokeLinecap="round"/>
      <line x1="24" y1="18" x2="27" y2="18" stroke="#7C3AED" strokeWidth="1.8" strokeLinecap="round"/>
      <line x1="13" y1="13" x2="15.5" y2="15.5" stroke="#7C3AED" strokeWidth="1.5" strokeLinecap="round"/>
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
    const { data } = await supabase
      .from("courses")
      .select("*")
      .eq("user_id", user.id);
    setCourses(data || []);
    const initial: Record<string, number> = {};
    data?.forEach(c => { initial[c.id] = c.current_grade || 0; });
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
          <h1 className="text-2xl font-medium text-[#1E1040]">GPA Planner</h1>
          <p className="text-sm text-purple-900/50 mt-1">Run what-if scenarios and plan your path to your target GPA</p>
        </div>

        {/* GPA Summary */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-2xl p-5 border border-purple-100">
            <div className="text-xs text-purple-900/40 mb-1">Current GPA</div>
            <div className={`text-3xl font-medium ${currentGPA >= 3.5 ? "text-emerald-600" : currentGPA >= 2.5 ? "text-amber-500" : "text-red-500"}`}>
              {currentGPA.toFixed(2)}
            </div>
          </div>
          <div className="bg-white rounded-2xl p-5 border border-purple-100">
            <div className="text-xs text-purple-900/40 mb-1">What-if GPA</div>
            <div className={`text-3xl font-medium ${whatIfGPA >= 3.5 ? "text-emerald-600" : whatIfGPA >= 2.5 ? "text-amber-500" : "text-red-500"}`}>
              {whatIfGPA.toFixed(2)}
            </div>
          </div>
          <div className="bg-white rounded-2xl p-5 border border-purple-100">
            <div className="text-xs text-purple-900/40 mb-1">Combined GPA</div>
            <div className={`text-3xl font-medium ${combinedGPA >= 3.5 ? "text-emerald-600" : combinedGPA >= 2.5 ? "text-amber-500" : "text-red-500"}`}>
              {combinedGPA.toFixed(2)}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* What-if sliders */}
          <div className="bg-white rounded-2xl border border-purple-100 overflow-hidden">
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
            <div className="bg-white rounded-2xl border border-purple-100 p-5">
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

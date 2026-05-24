"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { getLetterGrade, getGradeColor } from "@/lib/utils";

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

const COLORS = ["#7C3AED","#10B981","#3B82F6","#F59E0B","#EF4444","#EC4899","#8B5CF6","#14B8A6"];

export default function CoursesPage() {
  const router = useRouter();
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string>("");
  const [form, setForm] = useState({
    name: "", code: "", professor: "", credits: "3",
    semester: "Fall", year: "2025", color: "#7C3AED",
  });

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }
    setUserId(user.id);
    const { data } = await supabase
      .from("courses")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setCourses(data || []);
    setLoading(false);
  };

  const handleAddCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase.from("courses").insert({
      user_id: userId,
      name: form.name,
      code: form.code,
      professor: form.professor,
      credits: parseInt(form.credits),
      semester: form.semester,
      year: parseInt(form.year),
      color: form.color,
      current_grade: 0,
    });
    if (!error) {
      setShowModal(false);
      setForm({ name: "", code: "", professor: "", credits: "3", semester: "Fall", year: "2025", color: "#7C3AED" });
      fetchCourses();
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this course? This cannot be undone.")) return;
    const supabase = createClient();
    await supabase.from("courses").delete().eq("id", id);
    fetchCourses();
  };

  if (loading) return (
    <div className="min-h-screen bg-[#F5F3FF] flex items-center justify-center">
      <div className="text-purple-600 font-medium">Loading...</div>
    </div>
  );

  return (
    <main className="min-h-screen bg-[#F5F3FF]">
      {/* Nav */}
      <nav className="bg-white border-b border-purple-100 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Logo />
          <span className="text-lg font-medium text-[#1E1040]">ampli<span className="text-purple-600">score</span></span>
        </div>
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="text-sm text-purple-900/50 hover:text-purple-600">Dashboard</Link>
          <Link href="/courses" className="text-sm font-medium text-purple-600">Courses</Link>
          <Link href="/professors" className="text-sm text-purple-900/50 hover:text-purple-600">Professors</Link>
          <Link href="/gpa" className="text-sm text-purple-900/50 hover:text-purple-600">GPA Planner</Link>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-purple-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-purple-700 transition-colors"
        >
          + Add course
        </button>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-medium text-[#1E1040]">My courses</h1>
          <p className="text-sm text-purple-900/50 mt-1">{courses.length} course{courses.length !== 1 ? "s" : ""} this semester</p>
        </div>

        {courses.length === 0 ? (
          <div className="bg-white rounded-2xl border border-purple-100 py-20 text-center">
            <div className="text-5xl mb-4">📚</div>
            <h2 className="text-lg font-medium text-[#1E1040] mb-2">No courses yet</h2>
            <p className="text-sm text-purple-900/50 mb-6">Add your first course to start tracking your grades</p>
            <button
              onClick={() => setShowModal(true)}
              className="bg-purple-600 text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-purple-700 transition-colors"
            >
              Add your first course
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {courses.map((course) => {
              const grade = course.current_grade || 0;
              return (
                <div key={course.id} className="bg-white rounded-2xl border border-purple-100 p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full flex-shrink-0 mt-1" style={{ background: course.color }} />
                      <div>
                        <h3 className="font-medium text-[#1E1040]">{course.name}</h3>
                        <p className="text-xs text-purple-900/40">{course.code} · {course.semester} {course.year}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(course.id)}
                      className="text-purple-900/20 hover:text-red-400 transition-colors text-lg leading-none"
                    >
                      ×
                    </button>
                  </div>

                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="text-xs text-purple-900/40 mb-0.5">Professor</div>
                      <div className="text-sm text-[#1E1040]">{course.professor || "Not set"}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-purple-900/40 mb-0.5">Credits</div>
                      <div className="text-sm text-[#1E1040]">{course.credits} cr</div>
                    </div>
                    <div className="text-right">
                      <div className={`text-2xl font-medium ${getGradeColor(grade)}`}>{grade}%</div>
                      <div className="text-xs text-purple-900/40">{getLetterGrade(grade)}</div>
                    </div>
                  </div>

                  <div className="w-full bg-purple-50 rounded-full h-2 mb-4">
                    <div
                      className="h-2 rounded-full transition-all"
                      style={{
                        width: `${grade}%`,
                        background: grade >= 70 ? "#10B981" : grade >= 60 ? "#F59E0B" : "#EF4444"
                      }}
                    />
                  </div>

                  <div className="flex gap-2">
                    <Link
                      href={`/courses/${course.id}`}
                      className="flex-1 text-center bg-purple-50 text-purple-700 py-2 rounded-xl text-xs font-medium hover:bg-purple-100 transition-colors"
                    >
                      View grades
                    </Link>
                    <Link
                      href={`/courses/${course.id}`}
                      className="flex-1 text-center bg-purple-600 text-white py-2 rounded-xl text-xs font-medium hover:bg-purple-700 transition-colors"
                    >
                      Add grades
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Course Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-medium text-[#1E1040]">Add a course</h2>
              <button onClick={() => setShowModal(false)} className="text-purple-900/30 hover:text-purple-900 text-xl">×</button>
            </div>
            <form onSubmit={handleAddCourse} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#1E1040] mb-1.5">Course name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Calculus II"
                  required
                  className="w-full px-4 py-2.5 rounded-xl border border-purple-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-purple-50/30"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-[#1E1040] mb-1.5">Course code</label>
                  <input
                    type="text"
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value })}
                    placeholder="e.g. MATH 201"
                    className="w-full px-4 py-2.5 rounded-xl border border-purple-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-purple-50/30"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#1E1040] mb-1.5">Credits</label>
                  <select
                    value={form.credits}
                    onChange={(e) => setForm({ ...form, credits: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-purple-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-purple-50/30"
                  >
                    {[1,2,3,4,5,6].map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1E1040] mb-1.5">Professor</label>
                <input
                  type="text"
                  value={form.professor}
                  onChange={(e) => setForm({ ...form, professor: e.target.value })}
                  placeholder="e.g. Dr. Smith"
                  className="w-full px-4 py-2.5 rounded-xl border border-purple-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-purple-50/30"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-[#1E1040] mb-1.5">Semester</label>
                  <select
                    value={form.semester}
                    onChange={(e) => setForm({ ...form, semester: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-purple-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-purple-50/30"
                  >
                    {["Fall","Spring","Summer","Winter"].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#1E1040] mb-1.5">Year</label>
                  <select
                    value={form.year}
                    onChange={(e) => setForm({ ...form, year: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-purple-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-purple-50/30"
                  >
                    {["2024","2025","2026"].map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1E1040] mb-2">Color</label>
                <div className="flex gap-2">
                  {COLORS.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setForm({ ...form, color: c })}
                      className="w-7 h-7 rounded-full border-2 transition-all"
                      style={{
                        background: c,
                        borderColor: form.color === c ? "#1E1040" : "transparent",
                        transform: form.color === c ? "scale(1.2)" : "scale(1)"
                      }}
                    />
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 border border-purple-200 text-purple-700 py-2.5 rounded-xl text-sm font-medium hover:bg-purple-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-purple-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-purple-700 transition-colors disabled:opacity-50"
                >
                  {saving ? "Adding..." : "Add course"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}

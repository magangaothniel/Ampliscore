"use client";
import { courseGrade } from "@/lib/gpa";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import ScheduleImport from "@/components/ScheduleImport";
import { cached, invalidate } from "@/lib/cache";
import { getLetterGrade, getGradeColor } from "@/lib/utils";

function Logo() {
  return (
    <svg aria-hidden="true" width="32" height="32" viewBox="0 0 64 64" fill="none">
      <defs>
        <linearGradient id="capG_courses" gradientUnits="userSpaceOnUse" x1="0" y1="64" x2="64" y2="0">
          <stop offset="0" stopColor="#5B21B6" />
          <stop offset="1" stopColor="#7C3AED" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill="#EDE9FE" />
      <g transform="translate(32,34) scale(0.78) translate(-32,-29)">
        <path d="M32 11 L59 23.5 L32 36 L5 23.5 Z" stroke="url(#capG_courses)" strokeWidth="4.6" strokeLinejoin="round" />
        <path d="M16.5 29 L16.5 41.5 C16.5 46.8 47.5 46.8 47.5 41.5 L47.5 29" stroke="url(#capG_courses)" strokeWidth="4.6" strokeLinecap="round" />
        <path d="M59 23.5 L59 43" stroke="url(#capG_courses)" strokeWidth="5.5" strokeLinecap="round" />
        <circle cx="59" cy="45.6" r="4.9" fill="#7C3AED" />
      </g>
    </svg>
  );
}

const COLORS = ["#7C3AED","#10B981","#3B82F6","#F59E0B","#EF4444","#EC4899","#8B5CF6","#14B8A6"];
const FREE_LIMIT = 4;

export default function CoursesPage() {
  const router = useRouter();
  const [courses, setCourses] = useState<any[]>([]);
  
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string>("");
  const [form, setForm] = useState({
    name: "", code: "", professor: "", credits: "3",
    semester: "Fall", year: "2026", color: "#7C3AED",
  });

  useEffect(() => { fetchCourses(); }, []);

  const fetchCourses = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }
    setUserId(user.id);
    const profileData = await cached(`profile:${user.id}`, async () =>
      (await supabase.from("profiles").select("*").eq("id", user.id).single()).data);
    setProfile(profileData);
    const [data, aData, cData] = await Promise.all([
      cached(`courses:${user.id}:ordered`, async () =>
        (await supabase.from("courses").select("*").eq("user_id", user.id).order("created_at", { ascending: false })).data),
      cached(`assignments:${user.id}`, async () =>
        (await supabase.from("assignments").select("*").eq("user_id", user.id)).data),
      cached(`categories:${user.id}`, async () =>
        (await supabase.from("grade_categories").select("*")).data),
    ]);
    const enriched = (data || []).map((course: any) => {
      const cats = (cData || []).filter((c: any) => c.course_id === course.id);
      const cas = (aData || []).filter((a: any) => a.course_id === course.id && a.completed);
      if (!cats.length || !cas.length) return { ...course, live_grade: null };
      const g = courseGrade(cats, cas);
      return { ...course, live_grade: g > 0 ? g : null };
    });
    setCourses(enriched);
    setLoading(false);
  };

  const isPro = profile?.is_pro;
  const atLimit = !isPro && courses.length >= FREE_LIMIT;
  const nearLimit = !isPro && courses.length === FREE_LIMIT - 1;

  const handleAddCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (atLimit) return;
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
    invalidate("courses");
    if (!error) {
      setShowModal(false);
      setForm({ name: "", code: "", professor: "", credits: "3", semester: "Fall", year: "2026", color: "#7C3AED" });
      fetchCourses();
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this course? This cannot be undone.")) return;
    const supabase = createClient();
    const previousCourses = courses;
    setCourses(courses.filter((c: any) => c.id !== id));

    const { error } = await supabase.from("courses").delete().eq("id", id);
    if (error) {
      setCourses(previousCourses);
      alert("Could not delete that course. Please try again.");
      return;
    }
    invalidate("courses");
    invalidate("categories");
    invalidate("assignments");
    fetchCourses();
  };

  if (loading) return (
    <main className="min-h-screen bg-brand-50">
      <div className="max-w-5xl mx-auto px-4 md:px-6 py-6 md:py-8 animate-pulse">
        <div className="h-8 w-44 bg-ink-100 rounded mb-2" />
        <div className="h-4 w-40 bg-ink-100 rounded mb-8" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[0, 1].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-ink-200 p-5">
              <div className="h-5 w-32 bg-ink-100 rounded mb-2" />
              <div className="h-3 w-24 bg-ink-100 rounded mb-6" />
              <div className="h-2 w-full bg-ink-100 rounded mb-5" />
              <div className="flex gap-2">
                <div className="h-9 flex-1 bg-ink-100 rounded-lg" />
                <div className="h-9 flex-1 bg-ink-100 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );

  return (
    <main className="min-h-screen bg-[#F5F3FF]">

      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-bold text-ink-900 tracking-tight">My courses</h1>
            <p className="text-sm text-ink-600 mt-1">{courses.length} course{courses.length !== 1 ? "s" : ""} this semester</p>
          </div>
          {atLimit ? (
            <Link href="/upgrade" className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-purple-700 transition-colors">
              ⚡ Upgrade to add more
            </Link>
          ) : (
            <button onClick={() => setShowModal(true)} className="bg-purple-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-purple-700 transition-colors">
              + Add course
            </button>
          )}
        </div>

        {/* Free tier usage bar */}
        {!isPro && (
          <div className="bg-white rounded-xl border border-ink-200 shadow-card p-4 mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-ink-900 font-medium">Free plan · Course slots</span>
              <span className={`text-sm font-medium ${atLimit ? "text-bad" : nearLimit ? "text-warn" : "text-purple-600"}`}>
                {courses.length} / {FREE_LIMIT} used
              </span>
            </div>
            <div className="w-full bg-purple-50 rounded-full h-2 mb-2">
              <div
                className="h-2 rounded-full transition-all"
                style={{
                  width: `${(courses.length / FREE_LIMIT) * 100}%`,
                  background: atLimit ? "#EF4444" : nearLimit ? "#F59E0B" : "#7C3AED"
                }}
              />
            </div>
            {atLimit ? (
              <div className="flex items-center justify-between">
                <p className="text-xs text-bad">You've reached the free limit.</p>
                <Link href="/upgrade" className="text-xs text-purple-600 font-medium hover:underline">Upgrade for unlimited →</Link>
              </div>
            ) : nearLimit ? (
              <div className="flex items-center justify-between">
                <p className="text-xs text-warn">1 slot remaining on free plan.</p>
                <Link href="/upgrade" className="text-xs text-purple-600 font-medium hover:underline">Upgrade for unlimited →</Link>
              </div>
            ) : (
              <p className="text-xs text-ink-400">{FREE_LIMIT - courses.length} slots remaining · <Link href="/upgrade" className="text-purple-600 hover:underline">Upgrade for unlimited</Link></p>
            )}
          </div>
        )}

        {courses.length === 0 ? (
          <div className="bg-white rounded-xl border border-ink-200 shadow-card py-20 text-center">
            <div className="text-5xl mb-4">📚</div>
            <h2 className="text-lg font-medium text-ink-900 mb-2">No courses yet</h2>
            <p className="text-sm text-ink-600 mb-6">Add your first course to start tracking your grades</p>
            <button onClick={() => setShowModal(true)} className="bg-purple-600 text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-purple-700 transition-colors">
              Add your first course
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {courses.map((course) => {
              const grade = course.live_grade ?? course.current_grade ?? 0;
              return (
                <div key={course.id} className="bg-white rounded-xl border border-ink-200 shadow-card p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full flex-shrink-0 mt-1" style={{ background: course.color }} />
                      <div>
                        <h3 className="font-medium text-ink-900">{course.name}</h3>
                        <p className="text-xs text-ink-400">{course.code} · {course.semester} {course.year}</p>
                      </div>
                    </div>
                    <button onClick={() => handleDelete(course.id)} aria-label="Delete course" title="Delete course" className="text-ink-400 hover:text-bad transition-colors text-lg leading-none">×</button>
                  </div>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="text-xs text-ink-400 mb-0.5">Professor</div>
                      <div className="text-sm text-ink-900">{course.professor || "Not set"}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-ink-400 mb-0.5">Credits</div>
                      <div className="text-sm text-ink-900">{course.credits} cr</div>
                    </div>
                    <div className="text-right">
                      {grade > 0 ? (
                        <>
                          <div className={`font-display text-3xl font-bold tnum ${grade >= 70 ? "text-good" : grade >= 60 ? "text-warn" : "text-bad"}`}>{grade}%</div>
                          <div className="text-xs text-ink-400">{getLetterGrade(grade)}</div>
                        </>
                      ) : (
                        <div className="text-sm text-ink-400">N/A</div>
                      )}
                    </div>
                  </div>
                  <div className="w-full bg-purple-50 rounded-full h-2 mb-4">
                    <div className="h-2 rounded-full transition-all" style={{
                      width: `${grade}%`,
                      background: grade >= 70 ? "#10B981" : grade >= 60 ? "#F59E0B" : "#EF4444"
                    }} />
                  </div>
                  <div className="flex gap-2">
                    <Link href={`/courses/${course.id}`} className="flex-1 text-center bg-purple-50 text-purple-700 py-2 rounded-xl text-xs font-medium hover:bg-purple-100 transition-colors">
                      View grades
                    </Link>
                    <Link href={`/courses/${course.id}`} className="flex-1 text-center bg-purple-600 text-white py-2 rounded-xl text-xs font-medium hover:bg-purple-700 transition-colors">
                      Add grades
                    </Link>
                  </div>
                </div>
              );
            })}

            {/* Locked course slots for free users */}
            {!isPro && Array.from({ length: Math.max(0, FREE_LIMIT - courses.length) }).map((_, i) => (
              <div key={`empty-${i}`} className="bg-white/50 rounded-2xl border border-dashed border-purple-200 p-5 flex items-center justify-center min-h-[200px]">
                <div className="text-center">
                  <div className="text-2xl mb-2">📚</div>
                  <div className="text-sm text-ink-400">Empty slot</div>
                  <button onClick={() => setShowModal(true)} className="text-xs text-purple-600 hover:underline mt-1 block">+ Add course</button>
                </div>
              </div>
            ))}

            {/* Upgrade card shown when at limit */}
            {atLimit && (
              <Link href="/upgrade" className="bg-purple-50 rounded-2xl border border-dashed border-purple-300 p-5 flex items-center justify-center min-h-[200px] hover:bg-purple-100 transition-colors">
                <div className="text-center">
                  <div className="text-2xl mb-2">⚡</div>
                  <div className="text-sm font-medium text-purple-700 mb-1">Want more courses?</div>
                  <div className="text-xs text-purple-500 mb-3">Upgrade to Pro for unlimited</div>
                  <div className="bg-purple-600 text-white px-4 py-2 rounded-xl text-xs font-medium">
                    Upgrade — $4.99/mo
                  </div>
                </div>
              </Link>
            )}
          </div>
        )}
      </div>

      {/* Add Course Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-medium text-ink-900">Add a course</h2>
              <button onClick={() => setShowModal(false)} aria-label="Close dialog" title="Close dialog" className="text-ink-400 hover:text-purple-900 text-xl">×</button>
            </div>
            <ScheduleImport
              userId={userId}
              semester={form.semester}
              year={form.year}
              slotsLeft={isPro ? 99 : Math.max(0, FREE_LIMIT - courses.length)}
              onImported={() => { setShowModal(false); fetchCourses(); }}
            />
            <form onSubmit={handleAddCourse} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-ink-900 mb-1.5">Course name *</label>
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Calculus II" required
                  className="w-full px-4 py-2.5 rounded-xl border border-purple-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-purple-50/30" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-ink-900 mb-1.5">Course code</label>
                  <input type="text" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="e.g. MATH 201"
                    className="w-full px-4 py-2.5 rounded-xl border border-purple-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-purple-50/30" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-ink-900 mb-1.5">Credits</label>
                  <select value={form.credits} onChange={(e) => setForm({ ...form, credits: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-purple-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-purple-50/30">
                    {[1,2,3,4,5,6].map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-ink-900 mb-1.5">Professor</label>
                <input type="text" value={form.professor} onChange={(e) => setForm({ ...form, professor: e.target.value })} placeholder="e.g. Dr. Smith"
                  className="w-full px-4 py-2.5 rounded-xl border border-purple-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-purple-50/30" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-ink-900 mb-1.5">Semester</label>
                  <select value={form.semester} onChange={(e) => setForm({ ...form, semester: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-purple-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-purple-50/30">
                    {["Fall","Spring","Summer","Winter"].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-ink-900 mb-1.5">Year</label>
                  <select value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-purple-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-purple-50/30">
                    {["2024","2025","2026"].map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-ink-900 mb-2">Color</label>
                <div className="flex gap-2">
                  {COLORS.map(c => (
                    <button key={c} type="button" onClick={() => setForm({ ...form, color: c })}
                      className="w-7 h-7 rounded-full border-2 transition-all"
                      style={{ background: c, borderColor: form.color === c ? "#1E1040" : "transparent", transform: form.color === c ? "scale(1.2)" : "scale(1)" }} />
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 border border-purple-200 text-purple-700 py-2.5 rounded-xl text-sm font-medium hover:bg-purple-50 transition-colors">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 bg-purple-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-purple-700 transition-colors disabled:opacity-50">
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

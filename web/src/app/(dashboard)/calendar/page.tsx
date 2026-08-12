"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { cached, invalidate } from "@/lib/cache";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// A date input gives back a bare "YYYY-MM-DD". Parsing that with new Date()
// treats it as UTC, which shifts the day backwards for anyone west of London.
// Build the date in local time instead.
function localDateFromInput(value: string) {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d, 23, 59, 0);
}

function toInputValue(d: Date) {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export default function CalendarPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState("");
  const [courses, setCourses] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);

  const today = new Date();
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1));

  // add-work modal
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({
    name: "", course_id: "", category_id: "", max_grade: "100", due_date: "", is_exam: false,
  });

  // grade-it modal
  const [gradeTarget, setGradeTarget] = useState<any>(null);
  const [gradeValue, setGradeValue] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setUserId(user.id);

      const [c, a] = await Promise.all([
        cached(`courses:${user.id}`, async () =>
          (await supabase.from("courses").select("*").eq("user_id", user.id)).data),
        cached(`assignments:${user.id}`, async () =>
          (await supabase.from("assignments").select("*").eq("user_id", user.id)).data),
      ]);

      setCourses(c || []);
      setAssignments(a || []);

      // grade_categories is keyed by course, not by user, so scope it to the
      // courses we just loaded rather than querying a column that is not there.
      const courseIds = (c || []).map((x: any) => x.id);
      if (courseIds.length) {
        const { data: cats } = await supabase
          .from("grade_categories")
          .select("*")
          .in("course_id", courseIds);
        setCategories(cats || []);
      }
      setLoading(false);
    };
    load();
  }, [router]);

  const refresh = async () => {
    const supabase = createClient();
    invalidate(`assignments:${userId}`);
    const { data } = await supabase.from("assignments").select("*").eq("user_id", userId);
    setAssignments(data || []);
  };

  // ---- month grid ----
  const firstOfMonth = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const gridStart = new Date(firstOfMonth);
  gridStart.setDate(gridStart.getDate() - firstOfMonth.getDay());

  const cells: Date[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    cells.push(d);
  }
  // Trim the trailing week when it is entirely next month.
  const weeks = cells[35].getMonth() === cursor.getMonth() ? 6 : 5;
  const visible = cells.slice(0, weeks * 7);

  const dated = assignments.filter((a: any) => a.due_date);
  const itemsOn = (d: Date) =>
    dated
      .filter((a: any) => sameDay(new Date(a.due_date), d))
      .sort((x: any, y: any) => Number(y.is_exam) - Number(x.is_exam));

  const courseOf = (id: string) => courses.find((c: any) => c.id === id);

  const openAdd = (d: Date) => {
    setError("");
    setAddForm({
      name: "",
      course_id: courses[0]?.id || "",
      category_id: "",
      max_grade: "100",
      due_date: toInputValue(d),
      is_exam: false,
    });
    setAddOpen(true);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.course_id) { setError("Pick a course first."); return; }
    if (!addForm.due_date) { setError("Pick a due date."); return; }
    setSaving(true);
    const supabase = createClient();
    const { error: err } = await supabase.from("assignments").insert({
      user_id: userId,
      course_id: addForm.course_id,
      category_id: addForm.category_id || null,
      name: addForm.name,
      grade: 0,
      max_grade: parseFloat(addForm.max_grade) || 100,
      completed: false,
      due_date: localDateFromInput(addForm.due_date).toISOString(),
      is_exam: addForm.is_exam,
    });
    setSaving(false);
    if (err) { setError("That did not save. Try again."); return; }
    setAddOpen(false);
    refresh();
  };

  const handleGrade = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(gradeValue);
    if (Number.isNaN(val)) { setError("That score does not look like a number."); return; }
    setSaving(true);
    const supabase = createClient();
    const { error: err } = await supabase
      .from("assignments")
      .update({ grade: val, completed: true })
      .eq("id", gradeTarget.id);
    setSaving(false);
    if (err) { setError("That did not save. Try again."); return; }
    setGradeTarget(null);
    setGradeValue("");
    refresh();
  };

  const catsForCourse = categories.filter((c: any) => c.course_id === addForm.course_id);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 md:px-6 py-6 md:py-8 animate-pulse">
        <div className="h-8 w-48 bg-ink-100 rounded mb-6" />
        <div className="h-96 bg-ink-100 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-6 py-6 md:py-8">
      <div className="flex items-start justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-ink-900">Calendar</h1>
          <p className="text-sm text-ink-400 mt-1">
            Everything with a due date. Click a day to add work, click an item to enter its grade.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-ink-200 shadow-card overflow-hidden">
        <div className="flex items-center justify-between px-4 md:px-5 py-4 border-b border-ink-100">
          <h2 className="font-medium text-ink-900">
            {MONTHS[cursor.getMonth()]} {cursor.getFullYear()}
          </h2>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
              aria-label="Previous month"
              className="px-2.5 py-1.5 rounded-lg text-ink-400 hover:text-ink-900 hover:bg-brand-50 transition-colors"
            >
              &#8249;
            </button>
            <button
              onClick={() => setCursor(new Date(today.getFullYear(), today.getMonth(), 1))}
              className="px-3 py-1.5 rounded-lg text-sm font-medium text-brand-600 hover:bg-brand-50 transition-colors"
            >
              Today
            </button>
            <button
              onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
              aria-label="Next month"
              className="px-2.5 py-1.5 rounded-lg text-ink-400 hover:text-ink-900 hover:bg-brand-50 transition-colors"
            >
              &#8250;
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 border-b border-ink-100">
          {DAY_LABELS.map((d) => (
            <div key={d} className="px-2 py-2 text-center text-[11px] font-semibold uppercase tracking-wide text-ink-400">
              <span className="hidden sm:inline">{d}</span>
              <span className="sm:hidden">{d[0]}</span>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {visible.map((d, i) => {
            const inMonth = d.getMonth() === cursor.getMonth();
            const isToday = sameDay(d, today);
            const items = itemsOn(d);
            return (
              <button
                key={i}
                onClick={() => openAdd(d)}
                className={`min-h-[84px] md:min-h-[104px] text-left p-1.5 border-b border-r border-ink-100 align-top transition-colors hover:bg-brand-50/40 ${
                  inMonth ? "bg-white" : "bg-ink-50/40"
                }`}
              >
                <span
                  className={`inline-flex items-center justify-center h-6 w-6 rounded-full text-xs mb-1 ${
                    isToday
                      ? "bg-brand-600 text-white font-semibold"
                      : inMonth
                      ? "text-ink-900"
                      : "text-ink-300"
                  }`}
                >
                  {d.getDate()}
                </span>
                <span className="block space-y-1">
                  {items.slice(0, 3).map((a: any) => {
                    const course = courseOf(a.course_id);
                    return (
                      <span
                        key={a.id}
                        role="button"
                        tabIndex={0}
                        onClick={(e) => {
                          e.stopPropagation();
                          setError("");
                          setGradeTarget(a);
                          setGradeValue(a.completed ? String(a.grade) : "");
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.stopPropagation();
                            e.preventDefault();
                            setError("");
                            setGradeTarget(a);
                            setGradeValue(a.completed ? String(a.grade) : "");
                          }
                        }}
                        className={`flex items-center gap-1 px-1 py-0.5 rounded text-[11px] leading-tight truncate cursor-pointer hover:ring-1 hover:ring-brand-200 ${
                          a.completed ? "text-ink-400 line-through" : "text-ink-900"
                        }`}
                        style={{ backgroundColor: (course?.color || "#7C3AED") + "1A" }}
                      >
                        <span
                          className="h-1.5 w-1.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: course?.color || "#7C3AED" }}
                        />
                        <span className="truncate">
                          {a.is_exam ? "Exam: " : ""}
                          {a.name}
                        </span>
                      </span>
                    );
                  })}
                  {items.length > 3 && (
                    <span className="block px-1 text-[10px] text-ink-400">
                      +{items.length - 3} more
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {courses.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-4">
          {courses.map((c: any) => (
            <span key={c.id} className="flex items-center gap-1.5 text-xs text-ink-400">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: c.color || "#7C3AED" }} />
              {c.name}
            </span>
          ))}
        </div>
      )}

      {dated.length === 0 && (
        <p className="text-sm text-ink-400 mt-5 leading-relaxed">
          Nothing scheduled yet. Click any day above to add an assignment, or add
          one from a course page with a due date.
        </p>
      )}

      {/* Add work */}
      {addOpen && (
        <div className="fixed inset-0 bg-ink-900/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-ink-900">Add assignment</h2>
              <button onClick={() => setAddOpen(false)} className="text-ink-400 hover:text-ink-900">&#215;</button>
            </div>
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-ink-900 mb-1.5">Name</label>
                <input
                  value={addForm.name}
                  onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                  placeholder="e.g. Essay 2, Midterm"
                  required
                  className="w-full px-4 h-11 rounded-lg border border-ink-200 text-sm focus:outline-none focus:border-brand-600 focus:ring-3 focus:ring-brand-100 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink-900 mb-1.5">Course</label>
                <select
                  value={addForm.course_id}
                  onChange={(e) => setAddForm({ ...addForm, course_id: e.target.value, category_id: "" })}
                  className="w-full px-4 h-11 rounded-lg border border-ink-200 text-sm bg-white focus:outline-none focus:border-brand-600 focus:ring-3 focus:ring-brand-100 transition-colors"
                >
                  {courses.length === 0 && <option value="">No courses yet</option>}
                  {courses.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-ink-900 mb-1.5">
                  Category <span className="text-ink-400 font-normal">(optional)</span>
                </label>
                <select
                  value={addForm.category_id}
                  onChange={(e) => setAddForm({ ...addForm, category_id: e.target.value })}
                  className="w-full px-4 h-11 rounded-lg border border-ink-200 text-sm bg-white focus:outline-none focus:border-brand-600 focus:ring-3 focus:ring-brand-100 transition-colors"
                >
                  <option value="">Pick later</option>
                  {catsForCourse.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-ink-900 mb-1.5">Due date</label>
                  <input
                    type="date"
                    value={addForm.due_date}
                    onChange={(e) => setAddForm({ ...addForm, due_date: e.target.value })}
                    className="w-full px-4 h-11 rounded-lg border border-ink-200 text-sm bg-white focus:outline-none focus:border-brand-600 focus:ring-3 focus:ring-brand-100 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-ink-900 mb-1.5">Out of</label>
                  <input
                    type="number"
                    value={addForm.max_grade}
                    onChange={(e) => setAddForm({ ...addForm, max_grade: e.target.value })}
                    min="1"
                    className="w-full px-4 h-11 rounded-lg border border-ink-200 text-sm focus:outline-none focus:border-brand-600 focus:ring-3 focus:ring-brand-100 transition-colors"
                  />
                </div>
              </div>
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={addForm.is_exam}
                  onChange={(e) => setAddForm({ ...addForm, is_exam: e.target.checked })}
                  className="h-4 w-4 rounded border-ink-200 text-brand-600 focus:ring-brand-100"
                />
                <span className="text-sm text-ink-900">This is an exam</span>
              </label>
              <p className="text-xs text-ink-400 leading-relaxed">
                Saved without a score, so it will not move your grade. Enter the
                score here once you get it back.
              </p>
              {error && <p className="text-sm text-bad">{error}</p>}
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setAddOpen(false)}
                  className="flex-1 h-11 rounded-lg border border-ink-200 text-sm font-medium text-ink-900 hover:bg-ink-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 h-11 rounded-lg bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 disabled:opacity-60 transition-colors"
                >
                  {saving ? "Saving..." : "Add"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Enter a grade */}
      {gradeTarget && (
        <div className="fixed inset-0 bg-ink-900/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-lg font-semibold text-ink-900">{gradeTarget.name}</h2>
              <button onClick={() => setGradeTarget(null)} className="text-ink-400 hover:text-ink-900">&#215;</button>
            </div>
            <p className="text-sm text-ink-400 mb-5">
              {courseOf(gradeTarget.course_id)?.name}
              {gradeTarget.due_date
                ? " \u00B7 due " +
                  new Date(gradeTarget.due_date).toLocaleDateString(undefined, { month: "short", day: "numeric" })
                : ""}
            </p>
            <form onSubmit={handleGrade} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-ink-900 mb-1.5">
                  Score out of {gradeTarget.max_grade}
                </label>
                <input
                  type="number"
                  step="any"
                  value={gradeValue}
                  onChange={(e) => setGradeValue(e.target.value)}
                  autoFocus
                  className="w-full px-4 h-11 rounded-lg border border-ink-200 text-sm focus:outline-none focus:border-brand-600 focus:ring-3 focus:ring-brand-100 transition-colors"
                />
              </div>
              {error && <p className="text-sm text-bad">{error}</p>}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setGradeTarget(null)}
                  className="flex-1 h-11 rounded-lg border border-ink-200 text-sm font-medium text-ink-900 hover:bg-ink-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 h-11 rounded-lg bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 disabled:opacity-60 transition-colors"
                >
                  {saving ? "Saving..." : "Save grade"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { invalidate } from "@/lib/cache";
import { getLetterGrade, getGradeColor } from "@/lib/utils";
import AIGradePredictor from "@/components/AIGradePredictor";
import { persistCourseGrade } from "@/lib/achievements";

export default function CourseDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [course, setCourse] = useState<any>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState("");
  const [isPro, setIsPro] = useState(false);
  const [showCatModal, setShowCatModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [catForm, setCatForm] = useState({ name: "", weight: "" });
  const [assignForm, setAssignForm] = useState({ name: "", grade: "", max_grade: "100", category_id: "", completed: true, due_date: "", is_exam: false });
  const [saving, setSaving] = useState(false);
  const [editingCat, setEditingCat] = useState<any>(null);
  const [editCatForm, setEditCatForm] = useState({ name: "", weight: "" });

  useEffect(() => { fetchAll(); }, [id]);

  const [optimisticError, setOptimisticError] = useState("");

  const fetchAll = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }
    setUserId(user.id);
    const { data: profileData } = await supabase.from("profiles").select("is_pro").eq("id", user.id).single();
    setIsPro(profileData?.is_pro || false);
    const { data: courseData } = await supabase.from("courses").select("*").eq("id", id).single();
    const { data: catData } = await supabase.from("grade_categories").select("*").eq("course_id", id);
    const { data: assignData } = await supabase.from("assignments").select("*").eq("course_id", id).order("created_at", { ascending: false });
    setCourse(courseData);
    setCategories(catData || []);
    setAssignments(assignData || []);
    setLoading(false);
  };

  // Same maths as calculateCourseGrade, but takes the rows explicitly so it
  // can run against a list that has not been committed to state yet.
  const calculateCourseGradeFrom = (rows: any[]) => {
    if (categories.length === 0) return 0;
    let weighted = 0;
    let totalWeight = 0;
    for (const cat of categories) {
      const catA = rows.filter((a: any) => a.category_id === cat.id && a.completed);
      if (catA.length > 0) {
        const earned = catA.reduce((sm: number, a: any) => sm + (a.grade || 0), 0);
        const possible = catA.reduce((sm: number, a: any) => sm + (a.max_grade || 100), 0);
        if (possible > 0) {
          weighted += (earned / possible) * 100 * cat.weight;
          totalWeight += cat.weight;
        }
      }
    }
    return totalWeight > 0 ? Math.round((weighted / totalWeight) * 10) / 10 : 0;
  };

  const calculateCourseGrade = () => {
    if (categories.length === 0) return 0;
    let totalWeight = 0;
    let weightedScore = 0;
    for (const cat of categories) {
      const catAssignments = assignments.filter(a => a.category_id === cat.id && a.completed);
      if (catAssignments.length > 0) {
        const avg = catAssignments.reduce((sum, a) => sum + (a.grade / a.max_grade) * 100, 0) / catAssignments.length;
        weightedScore += avg * cat.weight;
        totalWeight += cat.weight;
      }
    }
    if (totalWeight === 0) return 0;
    return Math.round((weightedScore / totalWeight) * 10) / 10;
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const supabase = createClient();
    await supabase.from("grade_categories").insert({
      course_id: id,
      name: catForm.name,
      weight: parseFloat(catForm.weight),
    });
    setCatForm({ name: "", weight: "" });
    setShowCatModal(false);
    fetchAll();
    setSaving(false);
  };

  const handleEditCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const supabase = createClient();
    await supabase.from("grade_categories").update({
      name: editCatForm.name,
      weight: parseFloat(editCatForm.weight),
    }).eq("id", editingCat.id);
    setEditingCat(null);
    fetchAll();
    setSaving(false);
  };

  const handleDeleteCategory = async (catId: string) => {
    if (!confirm("Delete this category? All grades in it will also be deleted.")) return;
    const supabase = createClient();
    await supabase.from("assignments").delete().eq("category_id", catId);
    await supabase.from("grade_categories").delete().eq("id", catId);
    fetchAll();
  };

  const handleAddAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    // A blank score means the work has not been graded yet. Those rows are
    // stored with completed:false, which every grade calculation already skips.
    const isUpcoming = assignForm.grade.trim() === "";
    const gradeVal = isUpcoming ? 0 : parseFloat(assignForm.grade);
    const maxVal = parseFloat(assignForm.max_grade) || 100;

    if (isUpcoming && !assignForm.due_date) {
      setOptimisticError("Add a score, or a due date if it is not graded yet.");
      return;
    }
    if (!isUpcoming && Number.isNaN(gradeVal)) {
      setOptimisticError("That score does not look like a number.");
      return;
    }

    const dueIso = assignForm.due_date
      ? new Date(`${assignForm.due_date}T23:59:00`).toISOString()
      : null;

    // Show it straight away. The write is almost always going to succeed, and
    // waiting on the round trip is what makes the app feel slow.
    const tempId = `temp-${Date.now()}`;
    const optimisticRow = {
      id: tempId,
      course_id: id,
      user_id: userId,
      category_id: assignForm.category_id,
      name: assignForm.name,
      grade: gradeVal,
      max_grade: maxVal,
      completed: !isUpcoming,
      due_date: dueIso,
      is_exam: assignForm.is_exam,
      created_at: new Date().toISOString(),
    };
    const previous = assignments;
    setAssignments([optimisticRow, ...assignments]);
    setAssignForm({ name: "", grade: "", max_grade: "100", category_id: "", completed: true, due_date: "", is_exam: false });
    setShowAssignModal(false);
    setOptimisticError("");

    const { data: inserted, error } = await supabase
      .from("assignments")
      .insert({
        course_id: id,
        user_id: userId,
        category_id: optimisticRow.category_id,
        name: optimisticRow.name,
        grade: gradeVal,
        max_grade: maxVal,
        completed: optimisticRow.completed,
        due_date: dueIso,
        is_exam: assignForm.is_exam,
      })
      .select()
      .single();

    if (error) {
      setAssignments(previous);
      setOptimisticError("That grade did not save. Please try again.");
      return;
    }

    // Swap the temporary row for the real one so later edits and deletes
    // target a real database id.
    setAssignments((rows) => rows.map((r) => (r.id === tempId ? inserted : r)));
    invalidate("assignments");
    invalidate("courses");

    const updatedGrade = calculateCourseGradeFrom([inserted, ...previous]);
    await persistCourseGrade(supabase, id, updatedGrade);
  };

  const handleDeleteAssignment = async (assignId: string) => {
    const supabase = createClient();
    const previous = assignments;
    setAssignments(assignments.filter((a) => a.id !== assignId));
    setOptimisticError("");

    const { error } = await supabase.from("assignments").delete().eq("id", assignId);
    if (error) {
      setAssignments(previous);
      setOptimisticError("Could not delete that. Please try again.");
      return;
    }
    invalidate("assignments");
    invalidate("courses");

    const updatedGrade = calculateCourseGradeFrom(previous.filter((a) => a.id !== assignId));
    await persistCourseGrade(supabase, id, updatedGrade);
  };

  const currentGrade = calculateCourseGrade();
  const hasAnyGrades = assignments.filter(a => a.completed).length > 0;
  const totalWeight = categories.reduce((sum, c) => sum + c.weight, 0);

  if (loading) return (
    <div className="min-h-screen bg-brand-50 flex items-center justify-center">
      <div className="text-brand-600 font-medium">Loading...</div>
    </div>
  );

  if (!course) return (
    <div className="min-h-screen bg-brand-50 flex items-center justify-center">
      <div className="text-bad">Course not found</div>
    </div>
  );

  return (
    <main className="min-h-screen bg-brand-50">

      <div className="max-w-5xl mx-auto px-6 py-8">
        <Link
          href="/courses"
          className="inline-flex items-center gap-1.5 text-sm text-ink-600 hover:text-ink-900 mb-5 transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back to courses
        </Link>
        {optimisticError && (
          <div className="mb-4 bg-white border border-ink-200 text-bad text-sm px-4 py-3 rounded-lg">
            {optimisticError}
          </div>
        )}
        {/* Course Header */}
        <div className="bg-white rounded-xl border border-ink-200 shadow-card p-6 mb-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 rounded-full" style={{ background: course.color }} />
              <div>
                <h1 className="font-display text-2xl font-bold tracking-tight text-ink-900">{course.name}</h1>
                <p className="text-sm text-ink-400">{course.code} · {course.professor} · {course.semester} {course.year}</p>
              </div>
            </div>
            <div className="text-right">
              <div className={`text-4xl font-medium ${hasAnyGrades ? getGradeColor(currentGrade) : "text-ink-400"}`}>
                {hasAnyGrades ? `${currentGrade}%` : "N/A"}
              </div>
              <div className="text-sm text-ink-400">{hasAnyGrades ? getLetterGrade(currentGrade) : "No grades yet"}</div>
            </div>
          </div>
          <div className="mt-4 w-full bg-brand-50 rounded-full h-3">
            <div
              className="h-3 rounded-full transition-all"
              style={{
                width: hasAnyGrades ? `${currentGrade}%` : "0%",
                background: currentGrade >= 70 ? "#10B981" : currentGrade >= 60 ? "#F59E0B" : "#EF4444"
              }}
            />
          </div>
          {totalWeight !== 100 && totalWeight > 0 && (
            <p className="text-xs text-warn mt-2">⚠️ Grade weights add up to {totalWeight}% (should be 100%)</p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Categories */}
          <div className="bg-white rounded-xl border border-ink-200 shadow-card overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-ink-100">
              <h2 className="font-medium text-ink-900">Grade categories</h2>
              <button onClick={() => setShowCatModal(true)} className="text-sm text-brand-600 hover:underline">+ Add</button>
            </div>
            {categories.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-sm text-ink-400 mb-3">No categories yet</p>
                <button onClick={() => setShowCatModal(true)} className="text-sm text-brand-600 hover:underline">Add a category</button>
              </div>
            ) : (
              <div className="divide-y divide-ink-100">
                {categories.map(cat => {
                  const catAssignments = assignments.filter(a => a.category_id === cat.id && a.completed);
                  const avg = catAssignments.length > 0
                    ? catAssignments.reduce((sum, a) => sum + (a.grade / a.max_grade) * 100, 0) / catAssignments.length
                    : null;
                  return (
                    <div key={cat.id} className="flex items-center justify-between px-5 py-3">
                      <div>
                        <div className="text-sm font-medium text-ink-900">{cat.name}</div>
                        <div className="text-xs text-ink-400">{cat.weight}% of grade</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          {avg !== null ? (
                            <div className={`text-sm font-medium ${getGradeColor(avg)}`}>{Math.round(avg)}%</div>
                          ) : (
                            <div className="text-xs text-ink-400">No grades</div>
                          )}
                        </div>
                        <button
                          onClick={() => { setEditingCat(cat); setEditCatForm({ name: cat.name, weight: String(cat.weight) }); }}
                          className="text-xs font-medium text-brand-600 hover:underline px-1.5 py-0.5 rounded"
                        >Edit</button>
                        <button
                          onClick={() => handleDeleteCategory(cat.id)}
                          className="text-ink-400 hover:text-bad transition-colors"
                        >×</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Card: upcoming work. Its own box, because nothing here has a grade
              yet and filing it under "Grades" reads as a pile of zeros. */}
          {assignments.filter((a: any) => !a.completed).length > 0 && (
            <div className="bg-white rounded-xl border border-ink-200 shadow-card overflow-hidden mb-5">
              <div className="flex items-center justify-between px-5 py-4 border-b border-ink-100">
                <h2 className="font-medium text-ink-900">Upcoming work</h2>
                <button
                  onClick={() => setShowAssignModal(true)}
                  disabled={categories.length === 0}
                  className="text-sm text-brand-600 hover:underline disabled:text-ink-400 disabled:cursor-not-allowed"
                >
                  + Add assignment
                </button>
              </div>
              <p className="px-5 pt-3 text-xs text-ink-400">
                Not counted in your grade yet. Shows on your calendar.
              </p>
              <div className="divide-y divide-ink-100 max-h-64 overflow-y-auto">
                {assignments
                  .filter((a: any) => !a.completed)
                  .sort((x: any, y: any) => new Date(x.due_date || 0).getTime() - new Date(y.due_date || 0).getTime())
                  .map((a: any) => {
                    const cat = categories.find((c: any) => c.id === a.category_id);
                    const due = a.due_date ? new Date(a.due_date) : null;
                    return (
                      <div key={a.id} className="flex items-center justify-between px-5 py-3">
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-ink-900 flex items-center gap-2">
                            <span className="truncate">{a.name}</span>
                            {a.is_exam && <span className="text-[10px] font-semibold uppercase tracking-wide text-brand-600 bg-brand-50 px-1.5 py-0.5 rounded flex-shrink-0">Exam</span>}
                          </div>
                          <div className="text-xs text-ink-400">
                            {cat?.name || "Uncategorised"}
                            {due ? " \u00B7 due " + due.toLocaleDateString(undefined, { month: "short", day: "numeric" }) : ""}
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteAssignment(a.id)}
                          className="text-ink-400 hover:text-bad transition-colors flex-shrink-0"
                        >
                          ×
                        </button>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Grades */}
          <div className="bg-white rounded-xl border border-ink-200 shadow-card overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-ink-100">
              <h2 className="font-medium text-ink-900">Grades</h2>
              <button
                onClick={() => setShowAssignModal(true)}
                disabled={categories.length === 0}
                className="text-sm text-brand-600 hover:underline disabled:text-ink-400 disabled:cursor-not-allowed"
              >
                + Add
              </button>
            </div>
            {assignments.filter((a: any) => a.completed).length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-sm text-ink-400 mb-1">No grades yet</p>
                <p className="text-xs text-ink-400">Add categories first, then grades</p>
              </div>
            ) : (
              <div className="divide-y divide-ink-100 max-h-80 overflow-y-auto">
                {assignments.filter((a: any) => a.completed).map((a: any) => {
                  const pct = Math.round((a.grade / a.max_grade) * 100);
                  const cat = categories.find((c: any) => c.id === a.category_id);
                  return (
                    <div key={a.id} className="flex items-center justify-between px-5 py-3">
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-ink-900 truncate">{a.name}</div>
                        <div className="text-xs text-ink-400">{cat?.name || "Uncategorised"}</div>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <div className="text-right">
                          <div className={`text-sm font-medium ${getGradeColor(pct)}`}>{a.grade}/{a.max_grade}</div>
                          <div className="text-xs text-ink-400">{pct}%</div>
                        </div>
                        <button
                          onClick={() => handleDeleteAssignment(a.id)}
                          className="text-ink-400 hover:text-bad transition-colors"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* AI Grade Predictor */}
      <div className="mt-6 px-4 md:px-0 max-w-2xl mx-auto">
        <AIGradePredictor course={course} categories={categories} assignments={assignments} isPro={isPro} />
      </div>

            {/* Add Category Modal */}
      {showCatModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-medium text-ink-900">Add category</h2>
              <button onClick={() => setShowCatModal(false)} aria-label="Close category dialog" title="Close category dialog" className="text-ink-400 hover:text-purple-900 text-xl">×</button>
            </div>
            <form onSubmit={handleAddCategory} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-ink-900 mb-1.5">Category name</label>
                <input
                  type="text"
                  value={catForm.name}
                  onChange={(e) => setCatForm({ ...catForm, name: e.target.value })}
                  placeholder="e.g. Homework, Midterm, Final"
                  required
                  className="w-full px-4 h-11 rounded-lg border border-ink-200 text-sm bg-white focus:outline-none focus:border-brand-600 focus:ring-3 focus:ring-brand-100 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink-900 mb-1.5">Weight (%)</label>
                <input
                  type="number"
                  value={catForm.weight}
                  onChange={(e) => setCatForm({ ...catForm, weight: e.target.value })}
                  placeholder="e.g. 30"
                  min="1" max="100" required
                  className="w-full px-4 h-11 rounded-lg border border-ink-200 text-sm bg-white focus:outline-none focus:border-brand-600 focus:ring-3 focus:ring-brand-100 transition-colors"
                />
              </div>
              <p className="text-xs text-ink-400">Current total: {totalWeight}% — remaining: {100 - totalWeight}%</p>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowCatModal(false)} className="flex-1 border border-ink-200 text-ink-900 h-11 rounded-lg text-sm font-medium hover:bg-brand-50">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 bg-brand-600 text-white h-11 rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50">
                  {saving ? "Adding..." : "Add"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Assignment Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-medium text-ink-900">Add a grade</h2>
              <button onClick={() => setShowAssignModal(false)} aria-label="Close assignment dialog" title="Close assignment dialog" className="text-ink-400 hover:text-purple-900 text-xl">×</button>
            </div>
            <form onSubmit={handleAddAssignment} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-ink-900 mb-1.5">Assignment name</label>
                <input
                  type="text"
                  value={assignForm.name}
                  onChange={(e) => setAssignForm({ ...assignForm, name: e.target.value })}
                  placeholder="e.g. Homework 1, Midterm"
                  required
                  className="w-full px-4 h-11 rounded-lg border border-ink-200 text-sm bg-white focus:outline-none focus:border-brand-600 focus:ring-3 focus:ring-brand-100 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink-900 mb-1.5">Category</label>
                <select
                  value={assignForm.category_id}
                  onChange={(e) => setAssignForm({ ...assignForm, category_id: e.target.value })}
                  required
                  className="w-full px-4 h-11 rounded-lg border border-ink-200 text-sm bg-white focus:outline-none focus:border-brand-600 focus:ring-3 focus:ring-brand-100 transition-colors"
                >
                  <option value="">Select category</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-ink-900 mb-1.5">Score <span className="text-ink-400 font-normal">(optional)</span></label>
                  <input
                    type="number"
                    value={assignForm.grade}
                    onChange={(e) => setAssignForm({ ...assignForm, grade: e.target.value })}
                    placeholder="Blank"
                    min="0"
                    className="w-full px-4 h-11 rounded-lg border border-ink-200 text-sm bg-white focus:outline-none focus:border-brand-600 focus:ring-3 focus:ring-brand-100 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-ink-900 mb-1.5">Out of</label>
                  <input
                    type="number"
                    value={assignForm.max_grade}
                    onChange={(e) => setAssignForm({ ...assignForm, max_grade: e.target.value })}
                    placeholder="100"
                    required min="1"
                    className="w-full px-4 h-11 rounded-lg border border-ink-200 text-sm bg-white focus:outline-none focus:border-brand-600 focus:ring-3 focus:ring-brand-100 transition-colors"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-ink-900 mb-1.5">Due date <span className="text-ink-400 font-normal">(optional)</span></label>
                <input
                  type="date"
                  value={assignForm.due_date}
                  onChange={(e) => setAssignForm({ ...assignForm, due_date: e.target.value })}
                  className="w-full px-4 h-11 rounded-lg border border-ink-200 text-sm bg-white focus:outline-none focus:border-brand-600 focus:ring-3 focus:ring-brand-100 transition-colors"
                />
                <p className="text-xs text-ink-400 mt-1.5">
                  Add a date and this shows on your calendar with a reminder 24 hours before.
                </p>
              </div>
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={assignForm.is_exam}
                  onChange={(e) => setAssignForm({ ...assignForm, is_exam: e.target.checked })}
                  className="h-4 w-4 rounded border-ink-200 text-brand-600 focus:ring-brand-100"
                />
                <span className="text-sm text-ink-900">This is an exam</span>
              </label>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowAssignModal(false)} className="flex-1 border border-ink-200 text-ink-900 h-11 rounded-lg text-sm font-medium hover:bg-brand-50">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 bg-brand-600 text-white h-11 rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50">
                  {saving ? "Saving..." : "Add grade"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Category Modal */}
      {editingCat && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-medium text-ink-900">Edit category</h2>
              <button onClick={() => setEditingCat(null)} aria-label="Close edit dialog" title="Close edit dialog" className="text-ink-400 hover:text-purple-900 text-xl">×</button>
            </div>
            <form onSubmit={handleEditCategory} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-ink-900 mb-1.5">Category name</label>
                <input
                  type="text"
                  value={editCatForm.name}
                  onChange={(e) => setEditCatForm({ ...editCatForm, name: e.target.value })}
                  required
                  className="w-full px-4 h-11 rounded-lg border border-ink-200 text-sm bg-white focus:outline-none focus:border-brand-600 focus:ring-3 focus:ring-brand-100 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink-900 mb-1.5">Weight (%)</label>
                <input
                  type="number"
                  value={editCatForm.weight}
                  onChange={(e) => setEditCatForm({ ...editCatForm, weight: e.target.value })}
                  min="1" max="100" required
                  className="w-full px-4 h-11 rounded-lg border border-ink-200 text-sm bg-white focus:outline-none focus:border-brand-600 focus:ring-3 focus:ring-brand-100 transition-colors"
                />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setEditingCat(null)} className="flex-1 border border-ink-200 text-ink-900 h-11 rounded-lg text-sm font-medium hover:bg-brand-50">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 bg-brand-600 text-white h-11 rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50">
                  {saving ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}

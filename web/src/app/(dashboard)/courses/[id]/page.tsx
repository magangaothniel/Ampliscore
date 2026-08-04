"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { getLetterGrade, getGradeColor } from "@/lib/utils";
import AIGradePredictor from "@/components/AIGradePredictor";

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
  const [assignForm, setAssignForm] = useState({ name: "", grade: "", max_grade: "100", category_id: "", completed: true });
  const [saving, setSaving] = useState(false);
  const [editingCat, setEditingCat] = useState<any>(null);
  const [editCatForm, setEditCatForm] = useState({ name: "", weight: "" });

  useEffect(() => { fetchAll(); }, [id]);

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
    setSaving(true);
    const supabase = createClient();
    const gradeVal = parseFloat(assignForm.grade);
    const maxVal = parseFloat(assignForm.max_grade);
    await supabase.from("assignments").insert({
      course_id: id,
      user_id: userId,
      category_id: assignForm.category_id,
      name: assignForm.name,
      grade: gradeVal,
      max_grade: maxVal,
      completed: assignForm.completed,
    });
    const currentGrade = calculateCourseGrade();
  const hasAnyGrades = assignments.filter(a => a.completed).length > 0;
    await supabase.from("courses").update({ current_grade: currentGrade }).eq("id", id);
    setAssignForm({ name: "", grade: "", max_grade: "100", category_id: "", completed: true });
    setShowAssignModal(false);
    fetchAll();
    setSaving(false);
  };

  const handleDeleteAssignment = async (assignId: string) => {
    const supabase = createClient();
    await supabase.from("assignments").delete().eq("id", assignId);
    fetchAll();
  };

  const currentGrade = calculateCourseGrade();
  const hasAnyGrades = assignments.filter(a => a.completed).length > 0;
  const totalWeight = categories.reduce((sum, c) => sum + c.weight, 0);

  if (loading) return (
    <div className="min-h-screen bg-[#F5F3FF] flex items-center justify-center">
      <div className="text-purple-600 font-medium">Loading...</div>
    </div>
  );

  if (!course) return (
    <div className="min-h-screen bg-[#F5F3FF] flex items-center justify-center">
      <div className="text-red-500">Course not found</div>
    </div>
  );

  return (
    <main className="min-h-screen bg-[#F5F3FF]">

      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Course Header */}
        <div className="bg-white rounded-2xl border border-purple-100 p-6 mb-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 rounded-full" style={{ background: course.color }} />
              <div>
                <h1 className="text-2xl font-medium text-[#1E1040]">{course.name}</h1>
                <p className="text-sm text-purple-900/40">{course.code} · {course.professor} · {course.semester} {course.year}</p>
              </div>
            </div>
            <div className="text-right">
              <div className={`text-4xl font-medium ${hasAnyGrades ? getGradeColor(currentGrade) : "text-purple-900/30"}`}>
                {hasAnyGrades ? `${currentGrade}%` : "N/A"}
              </div>
              <div className="text-sm text-purple-900/40">{hasAnyGrades ? getLetterGrade(currentGrade) : "No grades yet"}</div>
            </div>
          </div>
          <div className="mt-4 w-full bg-purple-50 rounded-full h-3">
            <div
              className="h-3 rounded-full transition-all"
              style={{
                width: hasAnyGrades ? `${currentGrade}%` : "0%",
                background: currentGrade >= 70 ? "#10B981" : currentGrade >= 60 ? "#F59E0B" : "#EF4444"
              }}
            />
          </div>
          {totalWeight !== 100 && totalWeight > 0 && (
            <p className="text-xs text-amber-500 mt-2">⚠️ Grade weights add up to {totalWeight}% (should be 100%)</p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Categories */}
          <div className="bg-white rounded-2xl border border-purple-100 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-purple-50">
              <h2 className="font-medium text-[#1E1040]">Grade categories</h2>
              <button onClick={() => setShowCatModal(true)} className="text-sm text-purple-600 hover:underline">+ Add</button>
            </div>
            {categories.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-sm text-purple-900/40 mb-3">No categories yet</p>
                <button onClick={() => setShowCatModal(true)} className="text-sm text-purple-600 hover:underline">Add a category</button>
              </div>
            ) : (
              <div className="divide-y divide-purple-50">
                {categories.map(cat => {
                  const catAssignments = assignments.filter(a => a.category_id === cat.id && a.completed);
                  const avg = catAssignments.length > 0
                    ? catAssignments.reduce((sum, a) => sum + (a.grade / a.max_grade) * 100, 0) / catAssignments.length
                    : null;
                  return (
                    <div key={cat.id} className="flex items-center justify-between px-5 py-3">
                      <div>
                        <div className="text-sm font-medium text-[#1E1040]">{cat.name}</div>
                        <div className="text-xs text-purple-900/40">{cat.weight}% of grade</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          {avg !== null ? (
                            <div className={`text-sm font-medium ${getGradeColor(avg)}`}>{Math.round(avg)}%</div>
                          ) : (
                            <div className="text-xs text-purple-900/30">No grades</div>
                          )}
                        </div>
                        <button
                          onClick={() => { setEditingCat(cat); setEditCatForm({ name: cat.name, weight: String(cat.weight) }); }}
                          className="text-xs text-purple-400 hover:text-purple-600 px-1.5 py-0.5 rounded hover:bg-purple-50"
                        >✏️</button>
                        <button
                          onClick={() => handleDeleteCategory(cat.id)}
                          className="text-purple-900/20 hover:text-red-400 transition-colors"
                        >×</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Assignments */}
          <div className="bg-white rounded-2xl border border-purple-100 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-purple-50">
              <h2 className="font-medium text-[#1E1040]">Grades</h2>
              <button
                onClick={() => setShowAssignModal(true)}
                disabled={categories.length === 0}
                className="text-sm text-purple-600 hover:underline disabled:text-purple-900/20 disabled:cursor-not-allowed"
              >
                + Add grade
              </button>
            </div>
            {assignments.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-sm text-purple-900/40 mb-1">No grades yet</p>
                <p className="text-xs text-purple-900/30">Add categories first, then grades</p>
              </div>
            ) : (
              <div className="divide-y divide-purple-50 max-h-80 overflow-y-auto">
                {assignments.map(a => {
                  const pct = Math.round((a.grade / a.max_grade) * 100);
                  const cat = categories.find(c => c.id === a.category_id);
                  return (
                    <div key={a.id} className="flex items-center justify-between px-5 py-3">
                      <div>
                        <div className="text-sm font-medium text-[#1E1040]">{a.name}</div>
                        <div className="text-xs text-purple-900/40">{cat?.name || "Unknown"}</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className={`text-sm font-medium ${getGradeColor(pct)}`}>{a.grade}/{a.max_grade}</div>
                          <div className="text-xs text-purple-900/40">{pct}%</div>
                        </div>
                        <button
                          onClick={() => handleDeleteAssignment(a.id)}
                          className="text-purple-900/20 hover:text-red-400 transition-colors"
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
              <h2 className="text-lg font-medium text-[#1E1040]">Add category</h2>
              <button onClick={() => setShowCatModal(false)} aria-label="Close category dialog" className="text-purple-900/30 hover:text-purple-900 text-xl">×</button>
            </div>
            <form onSubmit={handleAddCategory} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#1E1040] mb-1.5">Category name</label>
                <input
                  type="text"
                  value={catForm.name}
                  onChange={(e) => setCatForm({ ...catForm, name: e.target.value })}
                  placeholder="e.g. Homework, Midterm, Final"
                  required
                  className="w-full px-4 py-2.5 rounded-xl border border-purple-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-purple-50/30"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1E1040] mb-1.5">Weight (%)</label>
                <input
                  type="number"
                  value={catForm.weight}
                  onChange={(e) => setCatForm({ ...catForm, weight: e.target.value })}
                  placeholder="e.g. 30"
                  min="1" max="100" required
                  className="w-full px-4 py-2.5 rounded-xl border border-purple-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-purple-50/30"
                />
              </div>
              <p className="text-xs text-purple-900/40">Current total: {totalWeight}% — remaining: {100 - totalWeight}%</p>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowCatModal(false)} className="flex-1 border border-purple-200 text-purple-700 py-2.5 rounded-xl text-sm font-medium hover:bg-purple-50">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 bg-purple-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-purple-700 disabled:opacity-50">
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
              <h2 className="text-lg font-medium text-[#1E1040]">Add a grade</h2>
              <button onClick={() => setShowAssignModal(false)} aria-label="Close assignment dialog" className="text-purple-900/30 hover:text-purple-900 text-xl">×</button>
            </div>
            <form onSubmit={handleAddAssignment} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#1E1040] mb-1.5">Assignment name</label>
                <input
                  type="text"
                  value={assignForm.name}
                  onChange={(e) => setAssignForm({ ...assignForm, name: e.target.value })}
                  placeholder="e.g. Homework 1, Midterm"
                  required
                  className="w-full px-4 py-2.5 rounded-xl border border-purple-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-purple-50/30"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1E1040] mb-1.5">Category</label>
                <select
                  value={assignForm.category_id}
                  onChange={(e) => setAssignForm({ ...assignForm, category_id: e.target.value })}
                  required
                  className="w-full px-4 py-2.5 rounded-xl border border-purple-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-purple-50/30"
                >
                  <option value="">Select category</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-[#1E1040] mb-1.5">Your score</label>
                  <input
                    type="number"
                    value={assignForm.grade}
                    onChange={(e) => setAssignForm({ ...assignForm, grade: e.target.value })}
                    placeholder="e.g. 85"
                    required min="0"
                    className="w-full px-4 py-2.5 rounded-xl border border-purple-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-purple-50/30"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#1E1040] mb-1.5">Out of</label>
                  <input
                    type="number"
                    value={assignForm.max_grade}
                    onChange={(e) => setAssignForm({ ...assignForm, max_grade: e.target.value })}
                    placeholder="100"
                    required min="1"
                    className="w-full px-4 py-2.5 rounded-xl border border-purple-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-purple-50/30"
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowAssignModal(false)} className="flex-1 border border-purple-200 text-purple-700 py-2.5 rounded-xl text-sm font-medium hover:bg-purple-50">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 bg-purple-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-purple-700 disabled:opacity-50">
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
              <h2 className="text-lg font-medium text-[#1E1040]">Edit category</h2>
              <button onClick={() => setEditingCat(null)} aria-label="Close edit dialog" className="text-purple-900/30 hover:text-purple-900 text-xl">×</button>
            </div>
            <form onSubmit={handleEditCategory} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#1E1040] mb-1.5">Category name</label>
                <input
                  type="text"
                  value={editCatForm.name}
                  onChange={(e) => setEditCatForm({ ...editCatForm, name: e.target.value })}
                  required
                  className="w-full px-4 py-2.5 rounded-xl border border-purple-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-purple-50/30"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1E1040] mb-1.5">Weight (%)</label>
                <input
                  type="number"
                  value={editCatForm.weight}
                  onChange={(e) => setEditCatForm({ ...editCatForm, weight: e.target.value })}
                  min="1" max="100" required
                  className="w-full px-4 py-2.5 rounded-xl border border-purple-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-purple-50/30"
                />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setEditingCat(null)} className="flex-1 border border-purple-200 text-purple-700 py-2.5 rounded-xl text-sm font-medium hover:bg-purple-50">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 bg-purple-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-purple-700 disabled:opacity-50">
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

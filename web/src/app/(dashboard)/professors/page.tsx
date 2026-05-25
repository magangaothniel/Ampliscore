"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

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

function StarRating({ value, onChange }: { value: number; onChange?: (v: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1,2,3,4,5].map(star => (
        <button
          key={star}
          type={onChange ? "button" : "button"}
          onClick={() => onChange?.(star)}
          className={`text-xl ${star <= value ? "text-amber-400" : "text-purple-200"} ${onChange ? "cursor-pointer hover:scale-110 transition-transform" : "cursor-default"}`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

export default function ProfessorsPage() {
  const router = useRouter();
  const [ratings, setRatings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState("");
  const [university, setUniversity] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({
    professor_name: "",
    course_code: "",
    rating: 0,
    difficulty: 0,
    review: "",
    would_take_again: true,
  });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }
    setUserId(user.id);
    const { data: profile } = await supabase.from("profiles").select("university").eq("id", user.id).single();
    setUniversity(profile?.university || "");
    const { data } = await supabase
      .from("professor_ratings")
      .select("*")
      .order("created_at", { ascending: false });
    setRatings(data || []);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.rating === 0) { alert("Please select a rating"); return; }
    setSaving(true);
    const supabase = createClient();
    await supabase.from("professor_ratings").insert({
      user_id: userId,
      professor_name: form.professor_name,
      university,
      course_code: form.course_code,
      rating: form.rating,
      difficulty: form.difficulty,
      review: form.review,
      would_take_again: form.would_take_again,
    });
    setForm({ professor_name: "", course_code: "", rating: 0, difficulty: 0, review: "", would_take_again: true });
    setShowModal(false);
    fetchData();
    setSaving(false);
  };

  const grouped = ratings.reduce((acc: any, r) => {
    const key = r.professor_name;
    if (!acc[key]) acc[key] = [];
    acc[key].push(r);
    return acc;
  }, {});

  const professors = Object.entries(grouped).map(([name, reviews]: any) => ({
    name,
    avgRating: reviews.reduce((s: number, r: any) => s + r.rating, 0) / reviews.length,
    avgDifficulty: reviews.reduce((s: number, r: any) => s + (r.difficulty || 0), 0) / reviews.length,
    wouldTakeAgain: Math.round((reviews.filter((r: any) => r.would_take_again).length / reviews.length) * 100),
    reviews,
  })).filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

  if (loading) return (
    <div className="min-h-screen bg-[#F5F3FF] flex items-center justify-center">
      <div className="text-purple-600 font-medium">Loading...</div>
    </div>
  );

  return (
    <main className="min-h-screen bg-[#F5F3FF]">

      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-medium text-[#1E1040]">Professor ratings</h1>
            <p className="text-sm text-purple-900/50 mt-1">All universities · {ratings.length} review{ratings.length !== 1 ? "s" : ""}</p>
          </div>
          <input
            type="text"
            placeholder="Search professors..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-4 py-2 rounded-xl border border-purple-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white w-56"
          />
        <button onClick={() => setShowModal(true)} className="bg-purple-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-purple-700 transition-colors">+ Rate a professor</button>
        </div>

        {professors.length === 0 ? (
          <div className="bg-white rounded-2xl border border-purple-100 py-20 text-center">
            <div className="text-5xl mb-4">⭐</div>
            <h2 className="text-lg font-medium text-[#1E1040] mb-2">No ratings yet</h2>
            <p className="text-sm text-purple-900/50 mb-6">Be the first to rate a professor on Ampliscore</p>
            <button
              onClick={() => setShowModal(true)}
              className="bg-purple-600 text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-purple-700 transition-colors"
            >
              Rate a professor
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {professors.map((prof) => (
              <div key={prof.name} className="bg-white rounded-2xl border border-purple-100 overflow-hidden">
                <div className="flex items-start justify-between p-5 border-b border-purple-50">
                  <div>
                    <h3 className="font-medium text-[#1E1040] text-lg">{prof.name}</h3>
                    <p className="text-xs text-purple-900/40 mt-0.5">{prof.reviews.length} review{prof.reviews.length !== 1 ? "s" : ""}</p>
                  </div>
                  <div className="flex items-center gap-6 text-right">
                    <div>
                      <div className="text-xs text-purple-900/40 mb-1">Rating</div>
                      <div className="flex items-center gap-1">
                        <StarRating value={Math.round(prof.avgRating)} />
                        <span className="text-sm font-medium text-[#1E1040] ml-1">{prof.avgRating.toFixed(1)}</span>
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-purple-900/40 mb-1">Difficulty</div>
                      <div className="text-lg font-medium text-[#1E1040]">{prof.avgDifficulty.toFixed(1)}/5</div>
                    </div>
                    <div>
                      <div className="text-xs text-purple-900/40 mb-1">Take again</div>
                      <div className={`text-lg font-medium ${prof.wouldTakeAgain >= 70 ? "text-emerald-600" : prof.wouldTakeAgain >= 50 ? "text-amber-500" : "text-red-500"}`}>
                        {prof.wouldTakeAgain}%
                      </div>
                    </div>
                  </div>
                </div>
                <div className="divide-y divide-purple-50">
                  {prof.reviews.map((review: any) => (
                    <div key={review.id} className="px-5 py-3">
                      <div className="flex items-center gap-3 mb-1">
                        <StarRating value={review.rating} />
                        {review.course_code && (
                          <span className="text-xs bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full">{review.course_code}</span>
                        )}
                        <span className={`text-xs px-2 py-0.5 rounded-full ${review.would_take_again ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500"}`}>
                          {review.would_take_again ? "Would take again" : "Would not take again"}
                        </span>
                      </div>
                      {review.review && <p className="text-sm text-purple-900/60 leading-relaxed">{review.review}</p>}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Rate Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-medium text-[#1E1040]">Rate a professor</h2>
              <button onClick={() => setShowModal(false)} className="text-purple-900/30 hover:text-purple-900 text-xl">×</button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#1E1040] mb-1.5">Professor name *</label>
                <input
                  type="text"
                  value={form.professor_name}
                  onChange={(e) => setForm({ ...form, professor_name: e.target.value })}
                  placeholder="e.g. Dr. Smith"
                  required
                  className="w-full px-4 py-2.5 rounded-xl border border-purple-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-purple-50/30"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1E1040] mb-1.5">Course code</label>
                <input
                  type="text"
                  value={form.course_code}
                  onChange={(e) => setForm({ ...form, course_code: e.target.value })}
                  placeholder="e.g. MATH 201"
                  className="w-full px-4 py-2.5 rounded-xl border border-purple-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-purple-50/30"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1E1040] mb-2">Overall rating *</label>
                <StarRating value={form.rating} onChange={(v) => setForm({ ...form, rating: v })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1E1040] mb-2">Difficulty</label>
                <StarRating value={form.difficulty} onChange={(v) => setForm({ ...form, difficulty: v })} />
                <p className="text-xs text-purple-900/40 mt-1">1 = very easy, 5 = very hard</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1E1040] mb-1.5">Review</label>
                <textarea
                  value={form.review}
                  onChange={(e) => setForm({ ...form, review: e.target.value })}
                  placeholder="Share your experience with this professor..."
                  rows={3}
                  className="w-full px-4 py-2.5 rounded-xl border border-purple-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-purple-50/30 resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1E1040] mb-2">Would you take this professor again?</label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, would_take_again: true })}
                    className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-colors ${form.would_take_again ? "bg-emerald-50 text-emerald-600 border-emerald-200" : "border-purple-200 text-purple-900/50"}`}
                  >
                    Yes ✓
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, would_take_again: false })}
                    className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-colors ${!form.would_take_again ? "bg-red-50 text-red-500 border-red-200" : "border-purple-200 text-purple-900/50"}`}
                  >
                    No ✗
                  </button>
                </div>
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 border border-purple-200 text-purple-700 py-2.5 rounded-xl text-sm font-medium hover:bg-purple-50">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 bg-purple-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-purple-700 disabled:opacity-50">
                  {saving ? "Submitting..." : "Submit rating"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}

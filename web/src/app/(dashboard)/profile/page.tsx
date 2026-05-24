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

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [form, setForm] = useState({ full_name: "", university: "", major: "", year_of_study: "" });
  const [passwordForm, setPasswordForm] = useState({ newPassword: "", confirmPassword: "" });

  useEffect(() => { fetchProfile(); }, []);

  const fetchProfile = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }
    const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
    setProfile({ ...data, email: user.email });
    setForm({
      full_name: data?.full_name || "",
      university: data?.university || "",
      major: data?.major || "",
      year_of_study: data?.year_of_study?.toString() || "",
    });
    setLoading(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg(""); setErrorMsg("");
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("profiles").update({
      full_name: form.full_name,
      university: form.university,
      major: form.major,
      year_of_study: form.year_of_study ? parseInt(form.year_of_study) : null,
    }).eq("id", user!.id);
    if (error) setErrorMsg("Failed to save. Please try again.");
    else setSuccessMsg("Profile updated successfully!");
    setSaving(false);
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) { setErrorMsg("Passwords don't match"); return; }
    if (passwordForm.newPassword.length < 8) { setErrorMsg("Password must be at least 8 characters"); return; }
    setSaving(true); setErrorMsg(""); setSuccessMsg("");
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: passwordForm.newPassword });
    if (error) setErrorMsg(error.message);
    else { setSuccessMsg("Password updated!"); setPasswordForm({ newPassword: "", confirmPassword: "" }); }
    setSaving(false);
  };

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== "DELETE") return;
    setDeleting(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("assignments").delete().eq("user_id", user!.id);
    await supabase.from("courses").delete().eq("user_id", user!.id);
    await supabase.from("professor_ratings").delete().eq("user_id", user!.id);
    await supabase.from("profiles").delete().eq("id", user!.id);
    await supabase.auth.signOut();
    router.push("/");
  };

  if (loading) return (
    <div className="min-h-screen bg-[#F5F3FF] flex items-center justify-center">
      <div className="text-purple-600 font-medium">Loading...</div>
    </div>
  );

  return (
    <main className="min-h-screen bg-[#F5F3FF]">
      <nav className="bg-white border-b border-purple-100 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Logo />
          <span className="text-lg font-medium text-[#1E1040]">ampli<span className="text-purple-600">score</span></span>
        </div>
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="text-sm text-purple-900/50 hover:text-purple-600">Dashboard</Link>
          <Link href="/courses" className="text-sm text-purple-900/50 hover:text-purple-600">Courses</Link>
          <Link href="/professors" className="text-sm text-purple-900/50 hover:text-purple-600">Professors</Link>
          <Link href="/gpa" className="text-sm text-purple-900/50 hover:text-purple-600">GPA Planner</Link>
        </div>
        <button onClick={handleSignOut} className="text-sm text-purple-900/50 hover:text-purple-600">Sign out</button>
      </nav>

      <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-medium text-[#1E1040]">Account settings</h1>
          <p className="text-sm text-purple-900/50 mt-1">Manage your profile and preferences</p>
        </div>

        {successMsg && <div className="bg-emerald-50 text-emerald-700 text-sm px-4 py-3 rounded-xl border border-emerald-200">✓ {successMsg}</div>}
        {errorMsg && <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl border border-red-100">{errorMsg}</div>}

        {/* Profile */}
        <div className="bg-white rounded-2xl border border-purple-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-purple-50">
            <h2 className="font-medium text-[#1E1040]">Profile information</h2>
          </div>
          <form onSubmit={handleSave} className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#1E1040] mb-1.5">Full name</label>
              <input type="text" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-purple-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-purple-50/30" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1E1040] mb-1.5">Email</label>
              <input type="email" value={profile?.email || ""} disabled
                className="w-full px-4 py-2.5 rounded-xl border border-purple-100 text-sm bg-purple-50/50 text-purple-900/40 cursor-not-allowed" />
              <p className="text-xs text-purple-900/30 mt-1">Email cannot be changed</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1E1040] mb-1.5">University</label>
              <input type="text" value={form.university} onChange={(e) => setForm({ ...form, university: e.target.value })}
                placeholder="e.g. University of Michigan"
                className="w-full px-4 py-2.5 rounded-xl border border-purple-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-purple-50/30" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#1E1040] mb-1.5">Major</label>
                <input type="text" value={form.major} onChange={(e) => setForm({ ...form, major: e.target.value })}
                  placeholder="e.g. Computer Science"
                  className="w-full px-4 py-2.5 rounded-xl border border-purple-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-purple-50/30" />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1E1040] mb-1.5">Year of study</label>
                <select value={form.year_of_study} onChange={(e) => setForm({ ...form, year_of_study: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-purple-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-purple-50/30">
                  <option value="">Select year</option>
                  <option value="1">Freshman (1st year)</option>
                  <option value="2">Sophomore (2nd year)</option>
                  <option value="3">Junior (3rd year)</option>
                  <option value="4">Senior (4th year)</option>
                  <option value="5">Graduate student</option>
                </select>
              </div>
            </div>
            <button type="submit" disabled={saving}
              className="w-full bg-purple-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-purple-700 transition-colors disabled:opacity-50">
              {saving ? "Saving..." : "Save changes"}
            </button>
          </form>
        </div>

        {/* Password */}
        <div className="bg-white rounded-2xl border border-purple-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-purple-50">
            <h2 className="font-medium text-[#1E1040]">Change password</h2>
          </div>
          <form onSubmit={handlePasswordChange} className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#1E1040] mb-1.5">New password</label>
              <input type="password" value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                placeholder="Min 8 characters" minLength={8}
                className="w-full px-4 py-2.5 rounded-xl border border-purple-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-purple-50/30" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1E1040] mb-1.5">Confirm new password</label>
              <input type="password" value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                placeholder="Repeat new password"
                className="w-full px-4 py-2.5 rounded-xl border border-purple-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-purple-50/30" />
            </div>
            <button type="submit" disabled={saving}
              className="w-full bg-purple-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-purple-700 transition-colors disabled:opacity-50">
              {saving ? "Updating..." : "Update password"}
            </button>
          </form>
        </div>

        {/* Plan */}
        <div className="bg-white rounded-2xl border border-purple-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-purple-50">
            <h2 className="font-medium text-[#1E1040]">Your plan</h2>
          </div>
          <div className="p-6 flex items-center justify-between">
            <div>
              <div className="font-medium text-[#1E1040]">{profile?.is_pro ? "Pro" : "Free"} plan</div>
              <div className="text-sm text-purple-900/50 mt-0.5">{profile?.is_pro ? "All features unlocked" : "Up to 4 courses · Basic features"}</div>
            </div>
            {!profile?.is_pro && (
              <Link href="/upgrade" className="bg-purple-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-purple-700 transition-colors">
                Upgrade to Pro
              </Link>
            )}
          </div>
        </div>

        {/* Sign out */}
        <div className="bg-white rounded-2xl border border-purple-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-purple-50">
            <h2 className="font-medium text-[#1E1040]">Session</h2>
          </div>
          <div className="p-6 flex items-center justify-between">
            <div>
              <div className="font-medium text-[#1E1040]">Sign out</div>
              <div className="text-sm text-purple-900/50 mt-0.5">Sign out of your account on this device</div>
            </div>
            <button onClick={handleSignOut} className="border border-purple-200 text-purple-700 px-4 py-2 rounded-xl text-sm font-medium hover:bg-purple-50 transition-colors">
              Sign out
            </button>
          </div>
        </div>

        {/* Danger zone */}
        <div className="bg-white rounded-2xl border border-red-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-red-50">
            <h2 className="font-medium text-red-600">Danger zone</h2>
          </div>
          <div className="p-6 flex items-center justify-between">
            <div>
              <div className="font-medium text-[#1E1040]">Delete account</div>
              <div className="text-sm text-purple-900/50 mt-0.5">Permanently delete your account and all data</div>
            </div>
            <button onClick={() => setShowDeleteModal(true)} className="border border-red-200 text-red-500 px-4 py-2 rounded-xl text-sm font-medium hover:bg-red-50 transition-colors">
              Delete account
            </button>
          </div>
        </div>

        {/* Legal */}
        <div className="text-center text-xs text-purple-900/30 pb-8">
          <div className="flex items-center justify-center gap-4">
            <Link href="/terms" className="hover:text-purple-600">Terms of Service</Link>
            <span>·</span>
            <Link href="/privacy" className="hover:text-purple-600">Privacy Policy</Link>
            <span>·</span>
            <a href="mailto:support@ampliscore.com" className="hover:text-purple-600">Contact us</a>
          </div>
          <p className="mt-2">© 2025 Ampliscore · Not affiliated with any university</p>
        </div>
      </div>

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <h2 className="text-lg font-medium text-[#1E1040] mb-2">Delete your account?</h2>
            <p className="text-sm text-purple-900/50 mb-4">This will permanently delete all your courses, grades, and ratings. This cannot be undone.</p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-[#1E1040] mb-1.5">Type <span className="text-red-500 font-mono">DELETE</span> to confirm</label>
              <input type="text" value={deleteConfirm} onChange={(e) => setDeleteConfirm(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-red-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setShowDeleteModal(false); setDeleteConfirm(""); }}
                className="flex-1 border border-purple-200 text-purple-700 py-2.5 rounded-xl text-sm font-medium hover:bg-purple-50">
                Cancel
              </button>
              <button onClick={handleDeleteAccount} disabled={deleteConfirm !== "DELETE" || deleting}
                className="flex-1 bg-red-500 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-red-600 disabled:opacity-40 transition-colors">
                {deleting ? "Deleting..." : "Delete forever"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

export default function ProfilePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
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

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { setErrorMsg("Image must be under 2MB"); return; }
    setUploadingAvatar(true);
    setErrorMsg(""); setSuccessMsg("");
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const ext = file.name.split(".").pop();
    const path = `${user.id}/avatar.${ext}`;
    const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (uploadError) { setErrorMsg("Upload failed. Please try again."); setUploadingAvatar(false); return; }
    const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
    const avatarUrl = `${publicUrl}?t=${Date.now()}`;
    await supabase.from("profiles").update({ avatar_url: avatarUrl }).eq("id", user.id);
    setProfile((prev: any) => ({ ...prev, avatar_url: avatarUrl }));
    setSuccessMsg("Profile picture updated!");
    setUploadingAvatar(false);
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

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== "DELETE") return;
    setDeleting(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("profiles").delete().eq("id", user.id);
    await supabase.auth.signOut();
    router.push("/");
  };

  if (loading) return (
    <div className="min-h-screen bg-[#F5F3FF] flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[#1E1040]">Account settings</h1>
        <p className="text-sm text-purple-900/50 mt-1">Manage your profile and preferences</p>
      </div>

      {successMsg && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm">{successMsg}</div>
      )}
      {errorMsg && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">{errorMsg}</div>
      )}

      {/* Avatar */}
      <div className="bg-white rounded-2xl border border-purple-100 p-6">
        <h2 className="font-medium text-[#1E1040] mb-4">Profile picture</h2>
        <div className="flex items-center gap-5">
          <div className="relative">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="Avatar" className="w-20 h-20 rounded-full object-cover border-2 border-purple-100" />
            ) : (
              <div className="w-20 h-20 rounded-full bg-purple-600 flex items-center justify-center text-white text-2xl font-semibold">
                {profile?.full_name?.charAt(0)?.toUpperCase() || "U"}
              </div>
            )}
            {uploadingAvatar && (
              <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>
          <div className="space-y-2">
            <button onClick={() => fileInputRef.current?.click()}
              disabled={uploadingAvatar}
              className="px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-xl hover:bg-purple-700 transition-colors disabled:opacity-50">
              {uploadingAvatar ? "Uploading..." : "Upload photo"}
            </button>
            <p className="text-xs text-purple-900/40">JPG, PNG or WebP · Max 2MB</p>
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleAvatarUpload} />
          </div>
        </div>
      </div>

      {/* Profile info */}
      <div className="bg-white rounded-2xl border border-purple-100 p-6">
        <h2 className="font-medium text-[#1E1040] mb-4">Personal information</h2>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#1E1040] mb-1.5">Full name</label>
            <input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
              className="w-full px-4 py-2.5 rounded-xl border border-purple-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" placeholder="Your name" />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#1E1040] mb-1.5">Email</label>
            <input value={profile?.email || ""} disabled
              className="w-full px-4 py-2.5 rounded-xl border border-purple-100 text-sm bg-purple-50 text-purple-900/40 cursor-not-allowed" />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#1E1040] mb-1.5">University</label>
            <input value={form.university} onChange={e => setForm(f => ({ ...f, university: e.target.value }))}
              className="w-full px-4 py-2.5 rounded-xl border border-purple-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" placeholder="e.g. Kansas State University" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#1E1040] mb-1.5">Major</label>
              <input value={form.major} onChange={e => setForm(f => ({ ...f, major: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-xl border border-purple-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" placeholder="e.g. Computer Science" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1E1040] mb-1.5">Year</label>
              <select value={form.year_of_study} onChange={e => setForm(f => ({ ...f, year_of_study: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-xl border border-purple-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white">
                <option value="">Select year</option>
                <option value="1">Freshman</option>
                <option value="2">Sophomore</option>
                <option value="3">Junior</option>
                <option value="4">Senior</option>
                <option value="5">Graduate</option>
              </select>
            </div>
          </div>
          <button type="submit" disabled={saving}
            className="w-full py-2.5 bg-purple-600 text-white text-sm font-medium rounded-xl hover:bg-purple-700 transition-colors disabled:opacity-50">
            {saving ? "Saving..." : "Save changes"}
          </button>
        </form>
      </div>

      {/* Password */}
      <div className="bg-white rounded-2xl border border-purple-100 p-6">
        <h2 className="font-medium text-[#1E1040] mb-4">Change password</h2>
        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#1E1040] mb-1.5">New password</label>
            <input type="password" value={passwordForm.newPassword} onChange={e => setPasswordForm(f => ({ ...f, newPassword: e.target.value }))}
              className="w-full px-4 py-2.5 rounded-xl border border-purple-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" placeholder="Min 8 characters" />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#1E1040] mb-1.5">Confirm password</label>
            <input type="password" value={passwordForm.confirmPassword} onChange={e => setPasswordForm(f => ({ ...f, confirmPassword: e.target.value }))}
              className="w-full px-4 py-2.5 rounded-xl border border-purple-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" placeholder="Repeat new password" />
          </div>
          <button type="submit" disabled={saving}
            className="w-full py-2.5 border border-purple-200 text-purple-700 text-sm font-medium rounded-xl hover:bg-purple-50 transition-colors disabled:opacity-50">
            {saving ? "Updating..." : "Update password"}
          </button>
        </form>
      </div>

      {/* Referral */}
      <div className="bg-white rounded-2xl border border-purple-100 p-6">
        <h2 className="font-medium text-[#1E1040] mb-1">Refer a friend</h2>
        <p className="text-sm text-purple-900/50 mb-4">Get 1 month Pro free for every 3 friends who sign up</p>
        <div className="bg-purple-50 rounded-xl p-4 mb-4">
          <div className="text-xs text-purple-900/40 mb-1">Your referral link</div>
          <div className="flex items-center gap-2">
            <div className="text-sm font-medium text-purple-700 flex-1 truncate">
              ampliscore.vercel.app/register?ref={profile?.referral_code || '...'}
            </div>
            <button
              onClick={() => { navigator.clipboard.writeText(`https://ampliscore.vercel.app/register?ref=${profile?.referral_code}`); setSuccessMsg('Link copied!'); setTimeout(() => setSuccessMsg(''), 2000); }}
              className="text-xs bg-purple-600 text-white px-3 py-1.5 rounded-lg hover:bg-purple-700 transition-colors flex-shrink-0"
            >
              Copy
            </button>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex-1 bg-purple-50 rounded-xl p-3 text-center">
            <div className="text-2xl font-bold text-purple-600">{profile?.referral_count || 0}</div>
            <div className="text-xs text-purple-900/40">Friends referred</div>
          </div>
          <div className="flex-1 bg-purple-50 rounded-xl p-3 text-center">
            <div className="text-2xl font-bold text-purple-600">{Math.max(0, 3 - (profile?.referral_count || 0))}</div>
            <div className="text-xs text-purple-900/40">Until free Pro</div>
          </div>
        </div>
      </div>

      {/* Account deletion */}
      <div className="bg-white rounded-2xl border border-purple-100 p-6">
        <h2 className="font-medium text-[#1E1040] mb-1">Close account</h2>
        <p className="text-sm text-purple-900/50 mb-4">Your data belongs to you. Closing your account will permanently delete your courses, grades, and all associated data.</p>
        <button onClick={() => setShowDeleteModal(true)}
          className="border border-purple-200 text-purple-900/50 px-4 py-2 rounded-xl text-sm font-medium hover:bg-purple-50 transition-colors">
          Close my account
        </button>
      </div>

      {/* Legal */}
      <div className="text-center text-xs text-purple-900/30 pb-8">
        <p>© 2026 Ampliscore · Not affiliated with any university</p>
      </div>

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <h2 className="text-lg font-medium text-[#1E1040] mb-2">Delete your account?</h2>
            <p className="text-sm text-purple-900/50 mb-4">This will permanently delete your courses, grades, and ratings. This cannot be undone.</p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-[#1E1040] mb-1.5">Type <span className="text-red-500 font-mono">DELETE</span> to confirm</label>
              <input type="text" value={deleteConfirm} onChange={e => setDeleteConfirm(e.target.value)}
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

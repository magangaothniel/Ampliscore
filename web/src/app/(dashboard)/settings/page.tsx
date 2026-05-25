"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase";

export default function SettingsPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [passwordForm, setPasswordForm] = useState({ newPassword: "", confirmPassword: "" });

  useEffect(() => { fetchProfile(); }, []);

  const fetchProfile = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }
    const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
    setProfile({ ...data, email: user.email });
    setLoading(false);
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

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  };

  const handleManageSubscription = async () => {
    const res = await fetch("/api/stripe/portal", { method: "POST" });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
    else setErrorMsg("Could not open billing portal. Please contact support.");
  };

  if (loading) return (
    <div className="min-h-screen bg-[#F5F3FF] flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#1E1040]">Settings</h1>
          <p className="text-sm text-purple-900/50 mt-1">Manage your account and preferences</p>
        </div>
        <Link href="/profile" className="text-sm text-purple-600 hover:underline">← Profile</Link>
      </div>

      {successMsg && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm">{successMsg}</div>}
      {errorMsg && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">{errorMsg}</div>}

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

      <div className="bg-white rounded-2xl border border-purple-100 p-6">
        <h2 className="font-medium text-[#1E1040] mb-4">Legal</h2>
        <div className="space-y-3">
          <Link href="/terms" target="_blank" className="flex items-center justify-between py-2 text-sm text-[#1E1040] hover:text-purple-600 transition-colors">
            <span>Terms of Service</span>
            <span className="text-purple-900/30">→</span>
          </Link>
          <div className="h-px bg-purple-50" />
          <Link href="/privacy" target="_blank" className="flex items-center justify-between py-2 text-sm text-[#1E1040] hover:text-purple-600 transition-colors">
            <span>Privacy Policy</span>
            <span className="text-purple-900/30">→</span>
          </Link>
          <div className="h-px bg-purple-50" />
          <div className="flex items-center justify-between py-2 text-sm text-purple-900/40">
            <span>Terms accepted</span>
            <span className="text-green-500 font-medium">✓ Yes</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-purple-100 p-6">
        <h2 className="font-medium text-[#1E1040] mb-4">Subscription</h2>
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-sm font-medium text-[#1E1040]">{profile?.is_pro ? "Pro plan" : "Free plan"}</div>
            <div className="text-xs text-purple-900/40 mt-0.5">{profile?.is_pro ? "$4.99/month · Billed monthly" : "Up to 4 courses"}</div>
          </div>
          {!profile?.is_pro && (
            <Link href="/upgrade" className="bg-purple-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-purple-700 transition-colors">
              Upgrade →
            </Link>
          )}
        </div>
        {profile?.is_pro && (
          <div className="border-t border-purple-50 pt-4">
            <p className="text-xs text-purple-900/40 mb-3">You can cancel anytime. Your Pro access continues until the end of your billing period.</p>
            <button onClick={handleManageSubscription}
              className="border border-purple-200 text-purple-700 px-4 py-2 rounded-xl text-sm font-medium hover:bg-purple-50 transition-colors">
              Manage or cancel subscription →
            </button>
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-purple-100 p-6">
        <h2 className="font-medium text-[#1E1040] mb-1">Sign out</h2>
        <p className="text-sm text-purple-900/50 mb-4">Sign out of your Ampliscore account on this device.</p>
        <button onClick={handleSignOut}
          className="border border-purple-200 text-purple-700 px-4 py-2 rounded-xl text-sm font-medium hover:bg-purple-50 transition-colors">
          Sign out
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-purple-100 p-6">
        <h2 className="font-medium text-[#1E1040] mb-1">Close account</h2>
        <p className="text-sm text-purple-900/50 mb-4">Your data belongs to you. Closing your account will permanently delete your courses, grades, and all associated data.</p>
        <button onClick={() => setShowDeleteModal(true)}
          className="border border-purple-200 text-purple-900/50 px-4 py-2 rounded-xl text-sm font-medium hover:bg-purple-50 transition-colors">
          Close my account
        </button>
      </div>

      <div className="text-center text-xs text-purple-900/30 pb-8">
        <p>© 2026 Ampliscore · Not affiliated with any university</p>
      </div>

      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <h2 className="text-lg font-medium text-[#1E1040] mb-2">Close your account?</h2>
            <p className="text-sm text-purple-900/50 mb-4">This will permanently delete your courses, grades, and ratings. This cannot be undone.</p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-[#1E1040] mb-1.5">Type <span className="font-mono text-purple-600">DELETE</span> to confirm</label>
              <input type="text" value={deleteConfirm} onChange={e => setDeleteConfirm(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-purple-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setShowDeleteModal(false); setDeleteConfirm(""); }}
                className="flex-1 border border-purple-200 text-purple-700 py-2.5 rounded-xl text-sm font-medium hover:bg-purple-50">
                Cancel
              </button>
              <button onClick={handleDeleteAccount} disabled={deleteConfirm !== "DELETE" || deleting}
                className="flex-1 bg-purple-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-purple-700 disabled:opacity-40 transition-colors">
                {deleting ? "Closing..." : "Close account"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

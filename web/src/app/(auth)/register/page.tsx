"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ fullName: "", email: "", password: "", university: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: { full_name: form.fullName, university: form.university },
      },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push("/dashboard");
    }
  };

  return (
    <main className="min-h-screen bg-[#F5F3FF] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-8 h-8 rounded-xl bg-purple-100 flex items-center justify-center">
              <div className="w-3.5 h-3.5 rounded-full border-2 border-purple-600" />
            </div>
            <span className="text-lg font-medium text-[#1E1040]">ampli<span className="text-purple-600">score</span></span>
          </Link>
          <h1 className="text-2xl font-medium text-[#1E1040]">Create your account</h1>
          <p className="text-sm text-purple-900/50 mt-1">Free forever. No credit card needed.</p>
        </div>
        <div className="bg-white rounded-2xl border border-purple-100 p-8">
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#1E1040] mb-1.5">Full name</label>
              <input
                type="text"
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                placeholder="Your name"
                required
                className="w-full px-4 py-2.5 rounded-xl border border-purple-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-purple-50/30"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1E1040] mb-1.5">University</label>
              <input
                type="text"
                value={form.university}
                onChange={(e) => setForm({ ...form, university: e.target.value })}
                placeholder="e.g. University of Michigan"
                required
                className="w-full px-4 py-2.5 rounded-xl border border-purple-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-purple-50/30"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1E1040] mb-1.5">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="you@university.edu"
                required
                className="w-full px-4 py-2.5 rounded-xl border border-purple-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-purple-50/30"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1E1040] mb-1.5">Password</label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Min 8 characters"
                required
                minLength={8}
                className="w-full px-4 py-2.5 rounded-xl border border-purple-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-purple-50/30"
              />
            </div>
            {error && (
              <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl border border-red-100">
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-purple-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-purple-700 transition-colors disabled:opacity-50"
            >
              {loading ? "Creating account..." : "Create free account"}
            </button>
          </form>
          <p className="text-center text-sm text-purple-900/50 mt-6">
            Already have an account?{" "}
            <Link href="/login" className="text-purple-600 font-medium hover:underline">
              Log in
            </Link>
          </p>
        </div>
        <p className="text-center text-xs text-purple-900/30 mt-4">
          By signing up you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </main>
  );
}

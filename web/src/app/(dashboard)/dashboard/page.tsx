"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { getLetterGrade, getGradeColor, calculateGPA } from "@/lib/utils";
import Link from "next/link";

export default function DashboardPage() {
  const [profile, setProfile] = useState<any>(null);
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = "/login"; return; }
      const { data: profileData } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      const { data: coursesData } = await supabase.from("courses").select("*").eq("user_id", user.id);
      setProfile(profileData);
      setCourses(coursesData || []);
      setLoading(false);
    };
    fetchData();
  }, []);

  const gpa = calculateGPA(courses.map(c => ({ grade: c.current_grade || 0, credits: c.credits || 3 })));

  if (loading) return (
    <div className="min-h-screen bg-[#F5F3FF] flex items-center justify-center">
      <div className="text-purple-600 font-medium">Loading...</div>
    </div>
  );

  return (
    <main className="min-h-screen bg-[#F5F3FF]">
      {/* Nav */}
      <nav className="bg-white border-b border-purple-100 px-6 py-4 flex items-center justify-between">
        <span className="text-lg font-medium text-[#1E1040]">ampli<span className="text-purple-600">score</span></span>
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="text-sm font-medium text-purple-600">Dashboard</Link>
          <Link href="/courses" className="text-sm text-purple-900/50 hover:text-purple-600">Courses</Link>
          <Link href="/professors" className="text-sm text-purple-900/50 hover:text-purple-600">Professors</Link>
          <Link href="/gpa" className="text-sm text-purple-900/50 hover:text-purple-600">GPA Planner</Link>
        </div>
        <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white text-xs font-medium">
          {profile?.full_name?.charAt(0) || "U"}
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Welcome */}
        <div className="mb-8">
          <h1 className="text-2xl font-medium text-[#1E1040]">
            Hey {profile?.full_name?.split(" ")[0] || "there"} 👋
          </h1>
          <p className="text-purple-900/50 text-sm mt-1">Here's how your semester is looking</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: "Current GPA", value: gpa.toFixed(2), color: "text-purple-600" },
            { label: "Active courses", value: courses.length, color: "text-[#1E1040]" },
            { label: "At-risk classes", value: courses.filter(c => (c.current_grade || 0) < 70).length, color: "text-red-500" },
          ].map((stat) => (
            <div key={stat.label} className="bg-white rounded-2xl p-5 border border-purple-100">
              <div className="text-xs text-purple-900/40 mb-1">{stat.label}</div>
              <div className={`text-3xl font-medium ${stat.color}`}>{stat.value}</div>
            </div>
          ))}
        </div>

        {/* Courses */}
        <div className="bg-white rounded-2xl border border-purple-100 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-purple-50">
            <h2 className="font-medium text-[#1E1040]">Your courses</h2>
            <Link href="/courses" className="text-sm text-purple-600 hover:underline">+ Add course</Link>
          </div>
          {courses.length === 0 ? (
            <div className="py-16 text-center">
              <div className="text-4xl mb-3">📚</div>
              <p className="text-purple-900/50 text-sm mb-4">No courses yet. Add your first one!</p>
              <Link href="/courses" className="bg-purple-600 text-white px-5 py-2 rounded-xl text-sm font-medium hover:bg-purple-700 transition-colors">
                Add a course
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-purple-50">
              {courses.map((course) => {
                const grade = course.current_grade || 0;
                return (
                  <div key={course.id} className="flex items-center justify-between px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full" style={{ background: course.color || "#7C3AED" }} />
                      <div>
                        <div className="text-sm font-medium text-[#1E1040]">{course.name}</div>
                        <div className="text-xs text-purple-900/40">{course.professor || "No professor set"}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className={`text-sm font-medium ${getGradeColor(grade)}`}>{grade}%</div>
                        <div className="text-xs text-purple-900/40">{getLetterGrade(grade)}</div>
                      </div>
                      <div className="w-24 bg-purple-50 rounded-full h-2">
                        <div className="h-2 rounded-full" style={{ width: `${grade}%`, background: grade >= 70 ? "#10B981" : grade >= 60 ? "#F59E0B" : "#EF4444" }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

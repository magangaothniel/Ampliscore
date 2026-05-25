"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { getLetterGrade, getGradeColor, calculateGPA } from "@/lib/utils";
import Link from "next/link";

export default function DashboardPage() {
  const [profile, setProfile] = useState<any>(null);
  const [courses, setCourses] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = "/login"; return; }
      const { data: profileData } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      const { data: coursesData } = await supabase.from("courses").select("*").eq("user_id", user.id);
      const { data: assignData } = await supabase.from("assignments").select("*").eq("user_id", user.id);
      const { data: catData } = await supabase.from("grade_categories").select("*");
      setAssignments(assignData || []);
      // Calculate real grades per course and update
      const updatedCourses = (coursesData || []).map((course: any) => {
        const cats = (catData || []).filter((c: any) => c.course_id === course.id);
        const courseAssigns = (assignData || []).filter((a: any) => a.course_id === course.id && a.completed);
        if (cats.length === 0 || courseAssigns.length === 0) return { ...course, current_grade: 0 };
        let weighted = 0, totalWeight = 0;
        for (const cat of cats) {
          const catA = courseAssigns.filter((a: any) => a.category_id === cat.id);
          if (catA.length > 0) {
            const earned = catA.reduce((s: number, a: any) => s + (a.grade || 0), 0);
            const possible = catA.reduce((s: number, a: any) => s + (a.max_grade || 100), 0);
            weighted += (earned / possible) * 100 * cat.weight;
            totalWeight += cat.weight;
          }
        }
        const grade = totalWeight > 0 ? weighted / totalWeight : 0;
        return { ...course, current_grade: grade };
      });
      setProfile({ ...profileData, email: user.email });
      setCourses(updatedCourses);
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
      

      <div className="max-w-5xl mx-auto px-4 md:px-6 py-6 md:py-8">
        {/* Pro upgrade banner */}
        {!profile?.is_pro && (
          <Link href="/upgrade" className="block mb-6">
            <div className="bg-purple-600 rounded-2xl p-4 flex items-center justify-between hover:bg-purple-700 transition-colors">
              <div className="flex items-center gap-3">
                <span className="text-2xl">⚡</span>
                <div>
                  <div className="text-white font-medium text-sm">Unlock the full Ampliscore experience</div>
                  <div className="text-purple-200 text-xs mt-0.5 hidden sm:block">AI grade predictor · Unlimited classes · At-risk alerts</div>
                </div>
              </div>
              <div className="bg-white text-purple-700 px-3 md:px-4 py-2 rounded-xl text-xs md:text-sm font-medium flex-shrink-0 ml-2">
                $4.99/mo →
              </div>
            </div>
          </Link>
        )}

        <div className="mb-6 md:mb-8">
          <h1 className="text-xl md:text-2xl font-medium text-[#1E1040]">
            Hey {profile?.full_name?.split(" ")[0] || "there"} 👋
          </h1>
          <p className="text-purple-900/50 text-sm mt-1">Here's how your semester is looking</p>
        </div>

        <div className="grid grid-cols-3 gap-3 md:gap-4 mb-6 md:mb-8">
          {[
            { label: "Current GPA", value: gpa.toFixed(2), color: "text-purple-600" },
            { label: "Active courses", value: courses.length, color: "text-[#1E1040]" },
            { label: "At-risk", value: courses.filter(c => (c.current_grade || 0) < 70 && (c.current_grade || 0) > 0).length, color: "text-red-500" },
          ].map((stat) => (
            <div key={stat.label} className="bg-white rounded-2xl p-3 md:p-5 border border-purple-100">
              <div className="text-xs text-purple-900/40 mb-1">{stat.label}</div>
              <div className={`text-2xl md:text-3xl font-medium ${stat.color}`}>{stat.value}</div>
            </div>
          ))}
        </div>

        {/* Pro feature teasers */}
        {!profile?.is_pro && (
          <div className="grid grid-cols-3 gap-3 mb-6">
            {[
              { icon: "🤖", title: "AI predictor", desc: "Pro" },
              { icon: "🔔", title: "At-risk alerts", desc: "Pro" },
              { icon: "🧮", title: "GPA planner", desc: "Pro" },
            ].map((f) => (
              <Link key={f.title} href="/upgrade" className="bg-white rounded-2xl p-3 border border-purple-100 hover:border-purple-300 transition-colors text-center">
                <div className="text-xl mb-1">{f.icon}</div>
                <div className="text-xs font-medium text-[#1E1040] leading-tight">{f.title}</div>
                <div className="text-xs text-purple-500 mt-0.5">{f.desc}</div>
              </Link>
            ))}
          </div>
        )}

        <div className="bg-white rounded-2xl border border-purple-100 overflow-hidden">
          <div className="flex items-center justify-between px-4 md:px-6 py-4 border-b border-purple-50">
            <h2 className="font-medium text-[#1E1040]">Your courses</h2>
            <Link href="/courses" className="text-sm text-purple-600 hover:underline">+ Add</Link>
          </div>
          {courses.length === 0 ? (
            <div className="py-12 text-center px-4">
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
                const hasGrade = grade > 0;
                return (
                  <Link key={course.id} href={`/courses/${course.id}`} className="flex items-center justify-between px-4 md:px-6 py-4 hover:bg-purple-50/50 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: course.color || "#7C3AED" }} />
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-[#1E1040] truncate">{course.name}</div>
                        <div className="text-xs text-purple-900/40 truncate">{course.professor || "No professor"}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0 ml-2">
                      <div className="text-right">
                        {hasGrade ? (
                          <>
                            <div className={`text-sm font-medium ${getGradeColor(grade)}`}>{grade}%</div>
                            <div className="text-xs text-purple-900/40">{getLetterGrade(grade)}</div>
                          </>
                        ) : (
                          <div className="text-sm text-purple-900/30">N/A</div>
                        )}
                      </div>
                      <div className="w-16 md:w-24 bg-purple-50 rounded-full h-2 hidden sm:block">
                        <div className="h-2 rounded-full" style={{
                          width: hasGrade ? `${grade}%` : "0%",
                          background: grade >= 70 ? "#10B981" : grade >= 60 ? "#F59E0B" : "#EF4444"
                        }} />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

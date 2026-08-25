"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { cached, invalidate } from "@/lib/cache";
import { getLetterGrade, getGradeColor } from "@/lib/utils";
import Link from "next/link";
import { evaluateAchievements, touchWeeklyStreak, type Badge } from "@/lib/achievements";
import BadgeShelf from "@/components/BadgeShelf";
import InitialGpaPrompt from "@/components/InitialGpaPrompt";
import { semesterGpa, cumulativeGpa, formatGpa, courseGrade } from "@/lib/gpa";
import { isCurrentTerm, currentTermLabel } from "@/lib/terms";

export default function DashboardPage() {
  const [profile, setProfile] = useState<any>(null);
  const [courses, setCourses] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newBadges, setNewBadges] = useState<Badge[]>([]);
  const [showGpaPrompt, setShowGpaPrompt] = useState(false);

  useEffect(() => {
    // Newly earned badges, so the toast fires once rather than on every load.
    const fetchData = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = "/login"; return; }
      const [profileData, coursesData, assignData, catData] = await Promise.all([
        cached(`profile:${user.id}`, async () =>
          (await supabase.from("profiles").select("*").eq("id", user.id).single()).data),
        cached(`courses:${user.id}`, async () =>
          (await supabase.from("courses").select("*").eq("user_id", user.id)).data),
        cached(`assignments:${user.id}`, async () =>
          (await supabase.from("assignments").select("*").eq("user_id", user.id)).data),
        cached(`categories:${user.id}`, async () =>
          (await supabase.from("grade_categories").select("*")).data),
      ]);
      setAssignments(assignData || []);

      // Badges are a side quest. Wrapped so a failure can't stop the dashboard
      // from rendering the thing the student actually came for.
      try {
        await touchWeeklyStreak(supabase, user.id);
        const fresh = await evaluateAchievements(supabase, user.id);
        if (fresh.length > 0) setNewBadges(fresh);
      } catch {
        // Silent by design.
      }
      // Calculate real grades per course and update
      const updatedCourses = (coursesData || []).map((course: any) => {
        const cats = (catData || []).filter((c: any) => c.course_id === course.id);
        const courseAssigns = (assignData || []).filter((a: any) => a.course_id === course.id && a.completed);
        return { ...course, current_grade: courseGrade(cats, courseAssigns) };
      });
      setProfile({ ...profileData, email: user.email });

      // Skipping counts as answering, so this only ever appears once.
      if (profileData && !profileData.gpa_prompt_seen) setShowGpaPrompt(true);
      setCourses(updatedCourses);
      setLoading(false);
    };
    fetchData();
  }, []);

  // Ungraded work with a due date, soonest first. Past-due items stay in
  // the list: hiding something you missed is the wrong kind of tidy.
  const upcoming = assignments
    .filter((a: any) => !a.completed && a.due_date)
    .map((a: any) => {
      const due = new Date(a.due_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const dueDay = new Date(due);
      dueDay.setHours(0, 0, 0, 0);
      const days = Math.round((dueDay.getTime() - today.getTime()) / 86400000);
      const course = courses.find((c: any) => c.id === a.course_id);
      return { ...a, due, days, course };
    })
    .sort((a: any, b: any) => a.due.getTime() - b.due.getTime())
    .slice(0, 4);

  const dueLabel = (d: number) =>
    d < 0 ? `${Math.abs(d)}d overdue` : d === 0 ? "Due today" : d === 1 ? "Due tomorrow" : `In ${d} days`;

  // Semester GPA is always shown. Cumulative appears only once the student has
  // told us what they were carrying in, because without prior credits there is
  // nothing to weight against.
  // Only this term counts toward the semester figure. A course from a past
  // term is finished work; folding it in would make "this term" meaningless
  // the moment a student has two semesters of courses.
  const termCourses = courses.filter((c: any) => isCurrentTerm(c.semester, c.year));
  const semester = semesterGpa(termCourses);
  const cumulative = cumulativeGpa(semester, profile?.prior_gpa, profile?.prior_credits);

  if (loading) return (
    <main className="min-h-screen bg-brand-50">
      <div className="max-w-5xl mx-auto px-4 md:px-6 py-6 md:py-8 animate-pulse">
        <div className="h-8 w-52 bg-ink-100 rounded mb-2" />
        <div className="h-4 w-64 bg-ink-100 rounded mb-8" />
        <div className="grid grid-cols-3 gap-3 md:gap-4 mb-8">
          {[0, 1, 2].map((i) => (
            <div key={i} className="bg-white rounded-xl p-4 md:p-5 border border-ink-200">
              <div className="h-3 w-16 bg-ink-100 rounded mb-3" />
              <div className="h-8 w-20 bg-ink-100 rounded" />
            </div>
          ))}
        </div>
        <div className="bg-white rounded-xl border border-ink-200 overflow-hidden">
          <div className="px-4 md:px-6 py-4 border-b border-ink-100">
            <div className="h-4 w-28 bg-ink-100 rounded" />
          </div>
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center justify-between px-4 md:px-6 py-4 border-b border-ink-100">
              <div className="flex-1">
                <div className="h-4 w-36 bg-ink-100 rounded mb-2" />
                <div className="h-3 w-24 bg-ink-100 rounded" />
              </div>
              <div className="h-4 w-12 bg-ink-100 rounded" />
            </div>
          ))}
        </div>
      </div>
    </main>
  );

  return (
    <main className="min-h-screen bg-brand-50">
      

      <div className="max-w-5xl mx-auto px-4 md:px-6 py-6 md:py-8">
        {/* Pro upgrade banner */}
        {!profile?.is_pro && (
          <Link href="/upgrade" className="block mb-6">
            <div className="bg-brand-800 rounded-xl p-4 flex items-center justify-between hover:bg-brand-900 transition-colors">
              <div>
                <div className="text-white font-medium text-sm">Go Pro for unlimited courses</div>
                <div className="text-brand-200 text-xs mt-0.5 hidden sm:block">AI grade prediction · GPA planner · at-risk alerts</div>
              </div>
              <div className="bg-white text-brand-800 px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm font-medium flex-shrink-0 ml-3">
                $4.99/mo
              </div>
            </div>
          </Link>
        )}

        <div className="mb-6 md:mb-8">
          <h1 className="font-display text-2xl md:text-3xl font-bold text-ink-900 tracking-tight">
            Hey {profile?.full_name?.split(" ")[0] || "there"}
          </h1>
          <p className="text-ink-600 text-sm mt-1">Here is where {currentTermLabel()} stands right now.</p>
        </div>

        <div className="grid grid-cols-3 gap-3 md:gap-4 mb-6 md:mb-8">
          {(() => {
            const atRisk = termCourses.filter((c: any) => (c.current_grade || 0) < 70 && (c.current_grade || 0) > 0).length;
            return [
              {
                label: cumulative !== null ? "Cumulative GPA" : "Current GPA",
                value: formatGpa(cumulative !== null ? cumulative : semester.gpa),
                color: "text-brand-600",
                sub: cumulative !== null ? `${formatGpa(semester.gpa)} this term` : null,
              },
              { label: "Active courses", value: termCourses.length, color: "text-ink-900", sub: null },
              { label: "At risk", value: atRisk, color: atRisk > 0 ? "text-bad" : "text-good", sub: null },
            ];
          })().map((stat) => (
            <div key={stat.label} className="bg-white rounded-xl p-4 md:p-5 border border-ink-200 shadow-card">
              <div className="text-xs font-semibold uppercase tracking-wide text-ink-400 mb-1.5">{stat.label}</div>
              <div className={`font-display text-3xl md:text-4xl font-bold tnum ${stat.color}`}>{stat.value}</div>
              {stat.sub && <div className="text-xs text-ink-400 font-medium mt-0.5 tnum">{stat.sub}</div>}
            </div>
          ))}
        </div>

        {/* Due next */}
        <div className="bg-white rounded-xl border border-ink-200 shadow-card p-4 md:p-5 mb-6">
          <div className="flex items-center justify-between mb-3.5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-400">Due next</h2>
          </div>

          {upcoming.length === 0 ? (
            <div className="py-1">
              <p className="text-sm text-ink-900 font-medium mb-1">Nothing scheduled yet</p>
              <p className="text-sm text-ink-400 leading-relaxed">
                Add a due date when you enter an assignment and it shows up here,
                with an email reminder 24 hours before.{" "}
                <Link href="/courses" className="text-brand-600 font-medium hover:underline">Go to your courses</Link>
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-ink-100">
              {upcoming.map((a: any) => (
                <li key={a.id}>
                  <Link href={`/courses/${a.course_id}`} className="flex items-center gap-3 py-2.5 group">
                    <span
                      className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: a.course?.color || "#7C3AED" }}
                    />
                    <span className="text-sm text-ink-900 font-medium truncate group-hover:text-brand-600">
                      {a.name}
                    </span>
                    {a.is_exam && (
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-brand-600 bg-brand-50 px-1.5 py-0.5 rounded flex-shrink-0">Exam</span>
                    )}
                    <span className="text-xs text-ink-400 truncate hidden sm:inline">{a.course?.name}</span>
                    <span className={`ml-auto text-xs font-medium flex-shrink-0 ${a.days < 0 ? "text-red-600" : a.days <= 1 ? "text-brand-600" : "text-ink-400"}`}>
                      {dueLabel(a.days)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Pro feature teasers */}
        {!profile?.is_pro && (
          <div className="grid grid-cols-3 gap-3 mb-6">
            {[
              { title: "AI grade prediction" },
              { title: "At-risk alerts" },
              { title: "GPA planner" },
            ].map((f) => (
              <Link key={f.title} href="/upgrade" className="bg-white rounded-xl p-4 border border-ink-200 hover:border-brand-300 transition-colors">
                <div className="text-xs font-medium text-ink-900 leading-snug">{f.title}</div>
                <div className="text-xs text-brand-600 mt-1 font-medium">Pro</div>
              </Link>
            ))}
          </div>
        )}

        <div className="bg-white rounded-xl border border-ink-200 shadow-card overflow-hidden">
          <div className="flex items-center justify-between px-4 md:px-6 py-4 border-b border-ink-100">
            <h2 className="font-display font-bold text-ink-900">Your courses</h2>
            <Link href="/courses" className="text-sm text-brand-600 font-medium hover:text-brand-700">Add course</Link>
          </div>
          {termCourses.length === 0 ? (
            <div className="py-14 text-center px-4">
              {/* Someone whose only courses are from a past term would otherwise
                  see a bare empty state and think their work disappeared. */}
              <p className="text-ink-900 font-medium mb-1">
                {courses.length > 0 ? `Nothing in ${currentTermLabel()} yet` : "No courses yet"}
              </p>
              <p className="text-ink-600 text-sm mb-5">
                {courses.length > 0
                  ? "Your earlier courses are still on the Courses page."
                  : "Add your first course to see where you stand."}
              </p>
              <Link href="/courses" className="inline-block bg-brand-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors">
                Add a course
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-ink-100">
              {termCourses.map((course: any) => {
                const grade = course.current_grade || 0;
                const hasGrade = grade > 0;
                return (
                  <Link key={course.id} href={`/courses/${course.id}`} className="flex items-center justify-between px-4 md:px-6 py-4 hover:bg-brand-50 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: course.color || "#7C3AED" }} />
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-ink-900 truncate">{course.name}</div>
                        <div className="text-xs text-ink-400 truncate">{course.professor || "No professor"}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0 ml-2">
                      <div className="text-right">
                        {hasGrade ? (
                          <>
                            <div className={`font-display text-lg font-bold tnum ${grade >= 70 ? "text-good" : grade >= 60 ? "text-warn" : "text-bad"}`}>{grade}%</div>
                            <div className="text-xs text-ink-400 tnum">{getLetterGrade(grade)}</div>
                          </>
                        ) : (
                          <div className="text-sm text-ink-400">No grades yet</div>
                        )}
                      </div>
                      <div className="w-16 md:w-24 bg-ink-100 rounded-full h-1.5 hidden sm:block overflow-hidden">
                        <div className="h-1.5 rounded-full" style={{
                          width: hasGrade ? `${grade}%` : "0%",
                          background: grade >= 70 ? "#0A7350" : grade >= 60 ? "#A8500A" : "#BE1B1B"
                        }} />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        <div className="mt-6">
          <BadgeShelf celebrate={newBadges} />
        </div>

        <InitialGpaPrompt
          open={showGpaPrompt}
          onDone={(saved) => {
            setShowGpaPrompt(false);
            // Mirror locally so the GPA card updates immediately. The prompt
            // already wrote to the database; refetching just to redraw one
            // number would be a wasted round trip.
            if (saved) setProfile((p: any) => ({ ...p, ...saved }));
          }}
        />
      </div>
    </main>
  );
}

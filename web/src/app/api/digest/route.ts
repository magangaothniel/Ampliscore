import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { createHmac } from "crypto";
import { createClient } from "@supabase/supabase-js";
import { weeklyDigestEmail } from "@/lib/emailTemplate";
import { calculateGPA } from "@/lib/utils";

const resend = new Resend(process.env.RESEND_API_KEY || "re_build_placeholder");

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

function computeLiveGrade(course: any, allCats: any[], allAssigns: any[]) {
  const cats = allCats.filter((c) => c.course_id === course.id);
  const assigns = allAssigns.filter((a) => a.course_id === course.id && a.completed);
  if (cats.length === 0) return 0;
  let weighted = 0, totalWeight = 0;
  for (const cat of cats) {
    const catA = assigns.filter((a) => a.category_id === cat.id);
    if (catA.length > 0) {
      const earned = catA.reduce((s: number, a: any) => s + (a.grade || 0), 0);
      const possible = catA.reduce((s: number, a: any) => s + (a.max_grade || 100), 0);
      weighted += (earned / possible) * 100 * cat.weight;
      totalWeight += cat.weight;
    }
  }
  return totalWeight > 0 ? Math.round((weighted / totalWeight) * 10) / 10 : 0;
}

export async function POST(req: NextRequest) {
  try {
    const { secret, userId } = await req.json();
    if (secret !== process.env.DIGEST_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = getAdminClient();

    // Fetch auth users (has emails)
    const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();
    if (usersError) return NextResponse.json({ error: usersError.message }, { status: 500 });

    // Fetch profiles
    const { data: profiles } = await supabase.from("profiles").select("*");

    // Merge email into profiles
    const mergedProfiles = (profiles || [])
      .map((p: any) => {
        const authUser = users?.find((u) => u.id === p.id);
        return { ...p, email: authUser?.email || null };
      })
      .filter((p: any) => !userId || p.id === userId);

    if (mergedProfiles.length === 0) {
      return NextResponse.json({ error: "No users found" }, { status: 404 });
    }

    const results = [];

    // Read everything once instead of per user. The old loop ran an unfiltered
    // select on grade_categories for every single profile, so 500 users meant
    // 500 full table scans of identical data, plus two more queries each.
    const { data: allCourses } = await supabase.from("courses").select("*");
    const { data: allAssigns } = await supabase.from("assignments").select("*");
    const { data: allCats } = await supabase.from("grade_categories").select("*");

    const coursesByUser = new Map<string, any[]>();
    for (const c of allCourses || []) {
      const list = coursesByUser.get(c.user_id) || [];
      list.push(c);
      coursesByUser.set(c.user_id, list);
    }
    const assignsByUser = new Map<string, any[]>();
    for (const a of allAssigns || []) {
      const list = assignsByUser.get(a.user_id) || [];
      list.push(a);
      assignsByUser.set(a.user_id, list);
    }

    for (const profile of mergedProfiles) {
      try {
        const courses = coursesByUser.get(profile.id) || [];
        const assigns = assignsByUser.get(profile.id) || [];
        const cats = allCats || [];

        const liveCourses = (courses || []).map((c: any) => ({
          name: c.name,
          grade: computeLiveGrade(c, cats || [], assigns || []),
          credits: c.credits || 3,
        }));

        const gpa = calculateGPA(liveCourses.map((c) => ({ grade: c.grade, credits: c.credits })));
        const atRisk = liveCourses.filter((c) => c.grade > 0 && c.grade < 70);
        const firstName = profile.full_name?.split(" ")[0] || "there";
        const email = profile.email;

        if (!email) { results.push({ id: profile.id, status: "skipped - no email" }); continue; }

        if (profile.digest_enabled === false) {
          results.push({ id: profile.id, status: "skipped - unsubscribed" });
          continue;
        }

        const sig = createHmac("sha256", process.env.DIGEST_SECRET || "")
          .update(profile.id)
          .digest("hex")
          .slice(0, 32);
        const unsubscribeUrl = `https://ampliscore.app/api/digest/unsubscribe?u=${profile.id}&t=${sig}`;

        const html = weeklyDigestEmail({ firstName, gpa, atRiskCourses: atRisk, courses: liveCourses, unsubscribeUrl });

        const { error } = await resend.emails.send({
          from: "Ampliscore <digest@ampliscore.app>",
          to: email,
          subject: `Your weekly grade summary — GPA: ${gpa.toFixed(2)}`,
          html,
        });

        if (error) {
          results.push({ id: profile.id, status: "failed", error });
        } else {
          results.push({ id: profile.id, status: "sent", email });
        }
      } catch (err) {
        results.push({ id: profile.id, status: "error", error: String(err) });
      }
    }

    return NextResponse.json({ success: true, results });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

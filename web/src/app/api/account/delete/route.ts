import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const token = authHeader.slice(7);

  const anonClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const {
    data: { user },
    error: userError,
  } = await anonClient.auth.getUser(token);

  if (userError || !user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const uid = user.id;

  const { error: ratingsError } = await admin
    .from("professor_ratings")
    .update({ user_id: null })
    .eq("user_id", uid);
  if (ratingsError) {
    return NextResponse.json(
      { error: "Failed anonymizing ratings: " + ratingsError.message },
      { status: 500 }
    );
  }

  const { error: assignmentsError } = await admin
    .from("assignments")
    .delete()
    .eq("user_id", uid);
  if (assignmentsError) {
    return NextResponse.json(
      { error: "Failed deleting assignments: " + assignmentsError.message },
      { status: 500 }
    );
  }

  const { data: courses } = await admin
    .from("courses")
    .select("id")
    .eq("user_id", uid);
  if (courses && courses.length > 0) {
    const courseIds = courses.map((c) => c.id);
    await admin.from("grade_categories").delete().in("course_id", courseIds);
  }

  const { error: coursesError } = await admin
    .from("courses")
    .delete()
    .eq("user_id", uid);
  if (coursesError) {
    return NextResponse.json(
      { error: "Failed deleting courses: " + coursesError.message },
      { status: 500 }
    );
  }

  const { data: avatarFiles } = await admin.storage.from("avatars").list(uid);
  if (avatarFiles && avatarFiles.length > 0) {
    await admin.storage
      .from("avatars")
      .remove(avatarFiles.map((f) => uid + "/" + f.name));
  }

  const { error: profileError } = await admin
    .from("profiles")
    .delete()
    .eq("id", uid);
  if (profileError) {
    return NextResponse.json(
      { error: "Failed deleting profile: " + profileError.message },
      { status: 500 }
    );
  }

  const { error: authError } = await admin.auth.admin.deleteUser(uid);
  if (authError) {
    return NextResponse.json(
      { error: "Failed deleting auth user: " + authError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}

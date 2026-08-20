import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const PRO_PRICE = 4.99;

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

// Every admin request re-checks is_admin server-side against the service role.
// The client is never trusted to say who it is.
async function requireAdmin(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const anon = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { data: { user } } = await anon.auth.getUser(authHeader.slice(7));
  if (!user) return null;

  const db = admin();
  const { data: profile } = await db
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  return profile?.is_admin ? user : null;
}

async function countAll(db: any, table: string) {
  const { count, error } = await db.from(table).select("*", { count: "exact", head: true });
  return error ? null : (count ?? 0);
}

async function countSince(db: any, table: string, column: string, iso: string) {
  const { count, error } = await db
    .from(table)
    .select("*", { count: "exact", head: true })
    .gte(column, iso);
  return error ? null : (count ?? 0);
}

export async function GET(req: NextRequest) {
  const user = await requireAdmin(req);
  if (!user) return NextResponse.json({ error: "Not authorised" }, { status: 403 });

  const db = admin();
  const now = Date.now();
  const weekAgo = new Date(now - 7 * 864e5).toISOString();

  const [
    users, newUsers, courses, assignments, ratings, betaTesters, waitlist,
  ] = await Promise.all([
    countAll(db, "profiles"),
    countSince(db, "profiles", "created_at", weekAgo),
    countAll(db, "courses"),
    countAll(db, "assignments"),
    countAll(db, "professor_ratings"),
    countAll(db, "beta_testers"),
    countAll(db, "waitlist"),
  ]);

  const { count: proCount } = await db
    .from("profiles").select("*", { count: "exact", head: true }).eq("is_pro", true);
  const pro = proCount ?? 0;

  const { data: openErrors } = await db
    .from("error_reports")
    .select("id, message, where_at, source, occurrences, last_seen_at")
    .eq("resolved", false)
    .order("last_seen_at", { ascending: false })
    .limit(20);

  const { data: rawReports } = await db
    .from("rating_reports")
    .select("*")
    .eq("status", "open")
    .order("created_at", { ascending: false })
    .limit(20);

  // Attach the reported review itself. Done as a second query rather than a
  // join so this doesn't depend on a foreign key existing between the tables.
  let openReports = rawReports ?? [];
  if (openReports.length > 0) {
    const ids = openReports.map((r: any) => r.rating_id).filter(Boolean);
    const { data: rated } = await db
      .from("professor_ratings")
      .select("id, professor_name, university, course_code, rating, difficulty, review, success_tips, hidden, created_at")
      .in("id", ids);
    const byId = new Map((rated ?? []).map((r: any) => [r.id, r]));
    openReports = openReports.map((r: any) => ({ ...r, rating: byId.get(r.rating_id) ?? null }));
  }

  const { data: support } = await db
    .from("support_requests")
    .select("id, email, type, message, platform, app_version, concerning, resolved, created_at")
    .eq("resolved", false)
    .order("created_at", { ascending: false })
    .limit(30);

  const { data: recentUsers } = await db
    .from("profiles")
    .select("id, full_name, is_pro, created_at")
    .order("created_at", { ascending: false })
    .limit(10);

  return NextResponse.json({
    stats: {
      users, newUsers, pro,
      mrr: (pro * PRO_PRICE).toFixed(2),
      courses, assignments, ratings, betaTesters, waitlist,
    },
    openErrors: openErrors ?? [],
    openReports: openReports ?? [],
    support: support ?? [],
    recentUsers: recentUsers ?? [],
  });
}

// Resolve actions. Kept narrow on purpose: an admin endpoint that accepts a
// table name from the client is an open door to the whole database.
export async function POST(req: NextRequest) {
  const user = await requireAdmin(req);
  if (!user) return NextResponse.json({ error: "Not authorised" }, { status: 403 });

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { action, id } = body || {};
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const db = admin();

  if (action === "resolve_support") {
    const { error } = await db.from("support_requests").update({ resolved: true }).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (action === "resolve_error") {
    const { error } = await db.from("error_reports").update({ resolved: true }).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  // Hiding the rating is what actually removes it from web and mobile; closing
  // the report on its own would leave the review visible.
  if (action === "hide_rating") {
    const { rating_id } = body;
    if (!rating_id) return NextResponse.json({ error: "Missing rating_id" }, { status: 400 });
    const { error: hideError } = await db
      .from("professor_ratings").update({ hidden: true }).eq("id", rating_id);
    if (hideError) return NextResponse.json({ error: hideError.message }, { status: 500 });
    const { error } = await db
      .from("rating_reports").update({ status: "actioned" }).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (action === "dismiss_report") {
    const { error } = await db
      .from("rating_reports").update({ status: "dismissed" }).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

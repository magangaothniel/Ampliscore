import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const resend = new Resend(process.env.RESEND_API_KEY || "re_build_placeholder");
const ALERT_TO = "magangaothniel@gmail.com";

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

const esc = (s: any) =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

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
  const authHeader = req.headers.get("authorization");
  const manual = req.nextUrl.searchParams.get("secret");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && manual !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = admin();
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const prevWeek = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString();

  // ---- growth ----
  const users        = await countAll(db, "profiles");
  const newUsers     = await countSince(db, "profiles", "created_at", weekAgo);
  const prevUsers    = await countSince(db, "profiles", "created_at", prevWeek);
  const betaTotal    = await countAll(db, "beta_testers");
  const courses      = await countAll(db, "courses");
  const assignments  = await countAll(db, "assignments");
  const ratings      = await countAll(db, "professor_ratings");

  // ---- money ----
  const { count: proCount } = await db
    .from("profiles").select("*", { count: "exact", head: true }).eq("is_pro", true);
  const pro = proCount ?? 0;
  const mrr = (pro * 4.99).toFixed(2);

  // ---- usage ----
  const { data: predictionRows } = await db.from("profiles").select("ai_predictions_used");
  const predictions = (predictionRows || []).reduce(
    (s: number, r: any) => s + (r.ai_predictions_used || 0), 0);

  const { count: withCourses } = await db
    .from("courses").select("user_id", { count: "exact", head: true });

  // ---- problems ----
  const { data: errors } = await db
    .from("error_reports")
    .select("message, where_at, source, occurrences, last_seen_at")
    .eq("resolved", false)
    .order("occurrences", { ascending: false })
    .limit(8);

  const { count: openReports } = await db
    .from("rating_reports").select("*", { count: "exact", head: true }).eq("status", "open");

  // ---- health checks ----
  const checks: { label: string; ok: boolean; detail: string }[] = [];
  checks.push({
    label: "Database reachable",
    ok: users !== null,
    detail: users !== null ? "responding" : "query failed",
  });
  checks.push({
    label: "Unresolved errors",
    ok: (errors?.length ?? 0) === 0,
    detail: `${errors?.length ?? 0} open`,
  });
  checks.push({
    label: "Rating reports awaiting review",
    ok: (openReports ?? 0) === 0,
    detail: `${openReports ?? 0} open`,
  });
  checks.push({
    label: "Paying subscribers",
    ok: pro > 0,
    detail: `${pro} on Pro`,
  });

  const delta = (newUsers ?? 0) - Math.max(0, (prevUsers ?? 0) - (newUsers ?? 0));
  const arrow = delta > 0 ? "up" : delta < 0 ? "down" : "flat";

  const statCard = (label: string, value: any, sub = "") => `
    <td style="padding:0 6px;" width="33%">
      <div style="background:#F5F3FF;border-radius:8px;padding:14px;">
        <div style="color:#6B6480;font-size:11px;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px;">${esc(label)}</div>
        <div style="color:#241A3E;font-size:24px;font-weight:700;">${esc(value)}</div>
        ${sub ? `<div style="color:#6B6480;font-size:11px;margin-top:2px;">${esc(sub)}</div>` : ""}
      </div>
    </td>`;

  const checkRows = checks.map(c => `
    <tr>
      <td style="padding:7px 0;color:#5B5470;font-size:14px;">${esc(c.label)}</td>
      <td style="padding:7px 0;text-align:right;font-size:13px;color:${c.ok ? "#0A7350" : "#A8500A"};font-weight:600;">${esc(c.detail)}</td>
    </tr>`).join("");

  const errorRows = (errors || []).length
    ? (errors || []).map((e: any) => `
        <tr>
          <td style="padding:8px 0;border-bottom:1px solid #F1EFF7;">
            <div style="color:#241A3E;font-size:13px;font-weight:600;">${esc(e.message).slice(0, 90)}</div>
            <div style="color:#6B6480;font-size:11px;margin-top:2px;">${esc(e.where_at)} &middot; ${esc(e.source)} &middot; ${esc(e.occurrences)}x</div>
          </td>
        </tr>`).join("")
    : `<tr><td style="padding:10px 0;color:#0A7350;font-size:13px;">Nothing broken this week.</td></tr>`;

  const html = `
  <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;background:#F5F3FF;padding:32px 16px;">
    <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #E5E2EF;border-radius:12px;padding:28px;">

      <p style="font-size:20px;font-weight:600;margin:0 0 2px 0;color:#241A3E;">ampli<span style="color:#7C3AED;">score</span></p>
      <p style="color:#6B6480;font-size:13px;margin:0 0 22px 0;">Weekly health report &middot; ${now.toDateString()}</p>

      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:10px;"><tr>
        ${statCard("Users", users ?? "?", `${newUsers ?? 0} new, ${arrow}`)}
        ${statCard("Pro", pro, `$${mrr} MRR`)}
        ${statCard("Beta apps", betaTotal ?? "?")}
      </tr></table>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;"><tr>
        ${statCard("Courses", courses ?? "?")}
        ${statCard("Assignments", assignments ?? "?")}
        ${statCard("Ratings", ratings ?? "?")}
      </tr></table>

      <h2 style="color:#241A3E;font-size:15px;margin:0 0 8px 0;">Health checks</h2>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">${checkRows}</table>

      <h2 style="color:#241A3E;font-size:15px;margin:0 0 4px 0;">Open errors</h2>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">${errorRows}</table>

      <h2 style="color:#241A3E;font-size:15px;margin:0 0 8px 0;">Usage</h2>
      <p style="color:#5B5470;font-size:14px;margin:0 0 24px 0;line-height:1.6;">
        ${predictions} AI prediction${predictions === 1 ? "" : "s"} run in total.
        ${courses ?? 0} course${courses === 1 ? "" : "s"} tracked across all accounts.
      </p>

      <div style="border-top:1px solid #F1EFF7;padding-top:16px;">
        <a href="https://ampliscore.app/dashboard" style="color:#7C3AED;font-size:13px;text-decoration:none;">Open Ampliscore</a>
        <span style="color:#8E88A3;font-size:13px;"> &middot; </span>
        <a href="https://supabase.com/dashboard/project/zykldxurxazvcatvfxkd" style="color:#7C3AED;font-size:13px;text-decoration:none;">Supabase</a>
      </div>
    </div>
  </div>`;

  try {
    await resend.emails.send({
      from: "Ampliscore <alerts@ampliscore.app>",
      to: ALERT_TO,
      subject: `Ampliscore weekly: ${users ?? "?"} users, ${pro} Pro, ${errors?.length ?? 0} open errors`,
      html,
    });
  } catch (e) {
    return NextResponse.json({ error: "Email failed", detail: String(e) }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    users, newUsers, pro, mrr, betaTotal, courses, assignments, ratings,
    openErrors: errors?.length ?? 0, openReports: openReports ?? 0,
  });
}

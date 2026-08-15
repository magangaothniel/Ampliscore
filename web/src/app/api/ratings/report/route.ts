import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY || "re_build_placeholder");
const ALERT_TO = "magangaothniel@gmail.com";

const REASONS = ["inaccurate", "offensive", "harassment", "spam", "not_a_review", "other"];

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
  const { data: { user }, error: userError } = await anonClient.auth.getUser(token);
  if (userError || !user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { rating_id, reason, details } = body || {};
  if (!rating_id || !REASONS.includes(reason)) {
    return NextResponse.json({ error: "Pick a reason for the report." }, { status: 400 });
  }
  if (details && String(details).length > 1000) {
    return NextResponse.json({ error: "Details must be under 1000 characters." }, { status: 400 });
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { error } = await admin.from("rating_reports").insert({
    rating_id,
    reporter_id: user.id,
    reason,
    details: details ? String(details).slice(0, 1000) : null,
  });

  if (error) {
    return NextResponse.json({ error: "Could not submit report." }, { status: 500 });
  }

  // Notify the operator. Never let email trouble break the user's report.
  try {
    const { data: reported } = await admin
      .from("professor_ratings")
      .select("professor_name, course_code, rating, review")
      .eq("id", rating_id)
      .single();

    const esc = (s: any) =>
      String(s ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

    await resend.emails.send({
      from: "Ampliscore <alerts@ampliscore.app>",
      to: ALERT_TO,
      subject: `Review reported: ${reported?.professor_name ?? "unknown professor"}`,
      html: `
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;max-width:520px;">
          <h2 style="color:#241A3E;font-size:18px;margin:0 0 12px 0;">A review was reported</h2>
          <p style="color:#5B5470;font-size:14px;margin:0 0 4px 0;"><strong>Reason:</strong> ${esc(reason)}</p>
          ${details ? `<p style="color:#5B5470;font-size:14px;margin:0 0 4px 0;"><strong>Details:</strong> ${esc(details)}</p>` : ""}
          <p style="color:#5B5470;font-size:14px;margin:0 0 16px 0;"><strong>Reported by:</strong> ${esc(user.email)}</p>
          <div style="background:#F5F3FF;border-radius:8px;padding:14px;">
            <p style="color:#241A3E;font-size:14px;margin:0 0 6px 0;"><strong>${esc(reported?.professor_name)}</strong> ${reported?.course_code ? "· " + esc(reported.course_code) : ""} · ${esc(reported?.rating)}/5</p>
            <p style="color:#5B5470;font-size:14px;margin:0;">${esc(reported?.review) || "<em>no written review</em>"}</p>
          </div>
          <p style="color:#8E88A3;font-size:12px;margin:16px 0 0 0;">rating_id: ${esc(rating_id)}</p>
        </div>
      `,
    });
  } catch (e) {
    console.error("Report notification email failed:", e);
  }

  return NextResponse.json({ success: true });
}

import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";
import { createHmac } from "crypto";
import { NextRequest, NextResponse } from "next/server";

const resend = new Resend(process.env.RESEND_API_KEY || "re_build_placeholder");

function esc(s: any) {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function reminderHtml(
  firstName: string,
  items: { name: string; course: string; color: string; isExam: boolean }[],
  unsubscribeUrl: string
) {
  const rows = items
    .map(
      (i) => `
      <tr>
        <td style="padding:12px 0;border-bottom:1px solid #F1EFF7;">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
            <tr>
              <td width="10" valign="top" style="padding-top:6px;">
                <div style="width:8px;height:8px;border-radius:4px;background:${esc(i.color)};"></div>
              </td>
              <td style="padding-left:10px;">
                <div style="color:#241A3E;font-size:15px;font-weight:600;">
                  ${i.isExam ? "Exam: " : ""}${esc(i.name)}
                </div>
                <div style="color:#6B6480;font-size:13px;margin-top:2px;">${esc(i.course)}</div>
              </td>
            </tr>
          </table>
        </td>
      </tr>`
    )
    .join("");

  const heading =
    items.length === 1
      ? "One thing is due tomorrow"
      : `${items.length} things are due tomorrow`;

  return `
  <div style="background:#F5F3FF;padding:40px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <div style="max-width:520px;margin:0 auto;background:#fff;border:1px solid #E5E2EF;border-radius:12px;padding:32px;">

      <p style="font-size:22px;font-weight:600;margin:0 0 4px 0;"><span style="color:#241A3E;">ampli</span><span style="color:#7C3AED;">score</span></p>
      <p style="color:#6B6480;font-size:13px;margin:0 0 26px 0;">Know where you stand.</p>

      <h1 style="color:#241A3E;font-size:20px;margin:0 0 6px 0;">${esc(heading)}, ${esc(firstName)}</h1>
      <p style="color:#5B5470;font-size:14px;line-height:1.6;margin:0 0 18px 0;">
        A heads up so nothing sneaks past you.
      </p>

      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:24px;">
        ${rows}
      </table>

      <a href="https://ampliscore.app/calendar" style="display:block;background:#7C3AED;color:#fff;text-decoration:none;font-size:15px;font-weight:600;padding:14px;border-radius:8px;text-align:center;">
        Open your calendar
      </a>

      <p style="color:#5B5470;font-size:13px;line-height:1.6;margin:22px 0 0 0;">
        Once you get a score back, enter it and your GPA updates straight away.
      </p>

      <p style="color:#8E88A3;font-size:11px;line-height:1.6;margin:26px 0 0 0;border-top:1px solid #F1EFF7;padding-top:16px;">
        You are getting this because you set a due date in Ampliscore.
        <a href="${unsubscribeUrl}" style="color:#7C3AED;">Turn off emails</a>
      </p>
    </div>
  </div>`;
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const querySecret = req.nextUrl.searchParams.get("secret");
  const authorised =
    authHeader === `Bearer ${process.env.CRON_SECRET}` ||
    (querySecret && querySecret === process.env.CRON_SECRET);

  if (!authorised) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dryRun = req.nextUrl.searchParams.get("dry") === "1";

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // Everything ungraded falling inside the next 48 hours. The window is wide
  // on purpose: users are spread across timezones and the job runs once a day,
  // so a tight 24 hour band would silently miss people at the edges.
  // reminder_sent_at is what actually guarantees one email per assignment.
  const now = new Date();
  const horizon = new Date(now.getTime() + 48 * 60 * 60 * 1000);

  const { data: due, error } = await admin
    .from("assignments")
    .select("id, user_id, course_id, name, due_date, is_exam")
    .eq("completed", false)
    .is("reminder_sent_at", null)
    .gte("due_date", now.toISOString())
    .lte("due_date", horizon.toISOString());

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!due || due.length === 0) {
    return NextResponse.json({ sent: 0, message: "Nothing due" });
  }

  // Group by user so somebody with four things due gets one email, not four.
  const byUser = new Map<string, any[]>();
  for (const row of due) {
    const list = byUser.get(row.user_id) || [];
    list.push(row);
    byUser.set(row.user_id, list);
  }

  const userIds = [...byUser.keys()];
  const courseIds = [...new Set(due.map((d: any) => d.course_id).filter(Boolean))];

  const [{ data: profiles }, { data: courses }] = await Promise.all([
    admin.from("profiles").select("id, email, full_name, digest_enabled").in("id", userIds),
    courseIds.length
      ? admin.from("courses").select("id, name, color").in("id", courseIds)
      : Promise.resolve({ data: [] as any[] }),
  ]);

  const courseById = new Map((courses || []).map((c: any) => [c.id, c]));
  const results: { user: string; status: string; count: number }[] = [];

  if (dryRun) {
    return NextResponse.json({
      dryRun: true,
      users: userIds.length,
      assignments: due.length,
      preview: (profiles || []).map((p: any) => ({
        email: p.email,
        items: (byUser.get(p.id) || []).map((a: any) => a.name),
      })),
    });
  }

  for (const profile of profiles || []) {
    const rows = byUser.get(profile.id) || [];

    if (!profile.email) {
      results.push({ user: profile.id, status: "no email", count: rows.length });
      continue;
    }
    if (profile.digest_enabled === false) {
      results.push({ user: profile.id, status: "unsubscribed", count: rows.length });
      continue;
    }

    const items = rows.map((a: any) => {
      const c: any = courseById.get(a.course_id);
      return {
        name: a.name,
        course: c?.name || "Your course",
        color: c?.color || "#7C3AED",
        isExam: !!a.is_exam,
      };
    });

    const sig = createHmac("sha256", process.env.DIGEST_SECRET || "")
      .update(profile.id)
      .digest("hex")
      .slice(0, 32);
    const unsubscribeUrl = `https://ampliscore.app/api/digest/unsubscribe?u=${profile.id}&t=${sig}`;

    const firstName = profile.full_name?.split(" ")[0] || "there";
    const subject =
      items.length === 1
        ? `Due tomorrow: ${items[0].name}`
        : `${items.length} things due tomorrow`;

    try {
      await resend.emails.send({
        from: "Ampliscore <reminders@ampliscore.app>",
        to: profile.email,
        subject,
        html: reminderHtml(firstName, items, unsubscribeUrl),
      });

      // Stamped only after a confirmed send, so a failure retries tomorrow
      // rather than marking the assignment done and never warning anyone.
      await admin
        .from("assignments")
        .update({ reminder_sent_at: new Date().toISOString() })
        .in("id", rows.map((a: any) => a.id));

      results.push({ user: profile.id, status: "sent", count: items.length });
    } catch (e: any) {
      console.error("Reminder failed for", profile.email, e?.message);
      results.push({ user: profile.id, status: "failed", count: items.length });
    }

    await new Promise((r) => setTimeout(r, 600));
  }

  return NextResponse.json({
    sent: results.filter((r) => r.status === "sent").length,
    assignments: due.length,
    results,
  });
}

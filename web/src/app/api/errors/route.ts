import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";
import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";

const resend = new Resend(process.env.RESEND_API_KEY);
const ALERT_TO = "magangaothniel@gmail.com";
const COOLDOWN_MINUTES = 60;

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

const esc = (s: any) =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const message = String(body?.message || "Unknown error").slice(0, 500);
  const stack   = String(body?.stack || "").slice(0, 4000);
  const where   = String(body?.where || "unknown").slice(0, 200);
  const source  = body?.source === "server" ? "server" : "client";
  const userId  = body?.userId ? String(body.userId).slice(0, 64) : null;

  // Fingerprint on message plus location, not the stack, so the same bug from
  // different users collapses into one alert.
  const fingerprint = createHash("sha256")
    .update(message + "|" + where)
    .digest("hex")
    .slice(0, 32);

  const db = admin();
  const now = new Date();

  const { data: existing } = await db
    .from("error_reports")
    .select("id, occurrences, last_alerted_at")
    .eq("fingerprint", fingerprint)
    .limit(1)
    .single();

  let shouldEmail = true;
  let occurrences = 1;

  if (existing) {
    occurrences = (existing.occurrences || 0) + 1;
    const last = existing.last_alerted_at ? new Date(existing.last_alerted_at) : null;
    const minutesSince = last ? (now.getTime() - last.getTime()) / 60000 : Infinity;
    shouldEmail = minutesSince >= COOLDOWN_MINUTES;

    await db
      .from("error_reports")
      .update({
        occurrences,
        last_seen_at: now.toISOString(),
        ...(shouldEmail ? { last_alerted_at: now.toISOString() } : {}),
      })
      .eq("id", existing.id);
  } else {
    await db.from("error_reports").insert({
      fingerprint,
      message,
      stack,
      where_at: where,
      source,
      occurrences: 1,
      last_seen_at: now.toISOString(),
      last_alerted_at: now.toISOString(),
    });
  }

  if (!shouldEmail) {
    return NextResponse.json({ ok: true, deduped: true });
  }

  try {
    await resend.emails.send({
      from: "Ampliscore <alerts@ampliscore.app>",
      to: ALERT_TO,
      subject: `[${source}] ${message.slice(0, 80)}`,
      html: `
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;max-width:600px;">
          <h2 style="color:#241A3E;font-size:17px;margin:0 0 4px 0;">Ampliscore error</h2>
          <p style="color:#8E88A3;font-size:12px;margin:0 0 16px 0;">
            ${source} &middot; seen ${occurrences} time${occurrences === 1 ? "" : "s"}
            &middot; next alert for this one in ${COOLDOWN_MINUTES} minutes at the earliest
          </p>
          <div style="background:#F5F3FF;border-radius:8px;padding:14px;margin-bottom:12px;">
            <p style="color:#241A3E;font-size:14px;margin:0 0 6px 0;"><strong>${esc(message)}</strong></p>
            <p style="color:#5B5470;font-size:13px;margin:0;">at ${esc(where)}</p>
            ${userId ? `<p style="color:#5B5470;font-size:12px;margin:6px 0 0 0;">user ${esc(userId)}</p>` : ""}
          </div>
          ${stack ? `<pre style="background:#241A3E;color:#DDD6FE;font-size:11px;line-height:1.5;padding:14px;border-radius:8px;overflow-x:auto;white-space:pre-wrap;">${esc(stack)}</pre>` : ""}
        </div>
      `,
    });
  } catch (e) {
    console.error("Error alert email failed:", e);
  }

  return NextResponse.json({ ok: true });
}

import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";

const resend = new Resend(process.env.RESEND_API_KEY || "re_build_placeholder");
const OPERATOR = "magangaothniel@gmail.com";

const esc = (s: any) =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function html(firstName: string, unsub: string) {
  return `
  <div style="background:#F5F3FF;padding:40px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <div style="max-width:500px;margin:0 auto;background:#fff;border:1px solid #E5E2EF;border-radius:12px;padding:32px;">
      <p style="font-size:22px;font-weight:600;margin:0 0 4px 0;"><span style="color:#241A3E;">ampli</span><span style="color:#7C3AED;">score</span></p>
      <p style="color:#6B6480;font-size:13px;margin:0 0 26px 0;">Know where you stand.</p>

      <h1 style="color:#241A3E;font-size:20px;margin:0 0 14px 0;">How has it been, ${esc(firstName)}?</h1>

      <p style="color:#5B5470;font-size:15px;line-height:1.65;margin:0 0 18px 0;">
        You have had Ampliscore for about a week now. I would rather know what
        is wrong with it than hear that it is fine, so there is a short form
        with the questions I actually care about.
      </p>

      <p style="color:#5B5470;font-size:15px;line-height:1.65;margin:0 0 22px 0;">
        Five minutes. The last question is the one that matters: would you keep
        using this next semester, and why or why not. A no is genuinely more
        useful to me than a polite yes.
      </p>

      <a href="https://ampliscore.app/feedback" style="display:block;background:#7C3AED;color:#fff;text-decoration:none;font-size:15px;font-weight:600;padding:14px;border-radius:8px;text-align:center;margin-bottom:22px;">
        Give feedback
      </a>

      <p style="color:#5B5470;font-size:14px;line-height:1.6;margin:0;">
        Your Pro access stays on regardless. Keep using it as long as it is
        useful, and reply to this email any time something breaks.
      </p>
      <p style="color:#5B5470;font-size:14px;line-height:1.6;margin:14px 0 0 0;">Othniel</p>

      <p style="color:#8E88A3;font-size:11px;line-height:1.6;margin:26px 0 0 0;border-top:1px solid #F1EFF7;padding-top:16px;">
        You are getting this because you are testing Ampliscore.
        <a href="${unsub}" style="color:#7C3AED;">Unsubscribe</a>
      </p>
    </div>
  </div>`;
}

async function send(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (secret !== process.env.CRON_SECRET) {
    return { status: 401, body: { error: "Unauthorized" } };
  }
  const dry = req.nextUrl.searchParams.get("dry") === "1";
  const onlyMe = req.nextUrl.searchParams.get("me") === "1";

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { data: testers } = await admin.from("beta_testers").select("first_name, email, emails_enabled");
  const { data: already } = await admin.from("beta_feedback").select("email");

  // Only ask people who actually opened the app. Asking someone how it has
  // been when they never redeemed their code is a bad email.
  const { data: redeemed } = await admin
    .from("beta_codes")
    .select("issued_to")
    .not("redeemed_at", "is", null);
  const opened = new Set(
    (redeemed || []).map((r: any) => String(r.issued_to || "").toLowerCase())
  );
  const done = new Set((already || []).map((r: any) => (r.email || "").toLowerCase()));

  // Skip anyone who has already filled the form in. Nobody wants a reminder
  // for something they have done.
  let targets = (testers || [])
    .filter((t: any) => t.emails_enabled !== false)
    .filter((t: any) => opened.has(String(t.email || "").toLowerCase()))
    .filter((t: any) => !done.has((t.email || "").toLowerCase()));
  if (onlyMe) targets = targets.filter((t: any) => t.email === OPERATOR);

  if (dry) {
    return { status: 200, body: { dryRun: true, wouldSend: targets.length, recipients: targets.map((t: any) => t.email) } };
  }

  const results: any[] = [];
  for (const t of targets) {
    try {
      await resend.emails.send({
        from: "Ampliscore <noreply@ampliscore.app>",
        to: t.email,
        replyTo: OPERATOR,
        subject: "How has Ampliscore been?",
        html: html(
          String(t.first_name || "there").split(" ")[0],
          `https://ampliscore.app/api/digest/unsubscribe?e=${encodeURIComponent(t.email)}&t=${createHmac("sha256", process.env.DIGEST_SECRET || "").update(String(t.email).toLowerCase()).digest("hex").slice(0, 32)}`
        ),
      });
      results.push({ to: t.email, status: "sent" });
    } catch (e) {
      results.push({ to: t.email, status: "failed" });
    }
    await new Promise((r) => setTimeout(r, 600));
  }
  // Copy to the operator so you see exactly what went out.
  if (!onlyMe && results.length > 0) {
    try {
      await resend.emails.send({
        from: "Ampliscore <noreply@ampliscore.app>",
        to: OPERATOR,
        subject: `[copy] Feedback request sent to ${results.length} tester(s)`,
        html: html("Othniel", "https://ampliscore.app"),
      });
    } catch (e) {
      console.error("Operator copy failed:", e);
    }
  }

  return { status: 200, body: { sent: results.length, results } };
}

export async function POST(req: NextRequest) {
  const r = await send(req);
  return NextResponse.json(r.body, { status: r.status });
}

export async function GET(req: NextRequest) {
  const r = await send(req);
  const b: any = r.body;
  const rows = (b.results || b.recipients || [])
    .map((x: any) => typeof x === "string"
      ? `<li style="color:#5B5470;font-size:14px;">${x}</li>`
      : `<li style="color:${x.status === "sent" ? "#0A7350" : "#BE1B1B"};font-size:14px;">${x.to} — ${x.status}</li>`)
    .join("");
  const heading = b.dryRun ? `Dry run: ${b.wouldSend} follow-up(s) would be sent`
    : b.error ? b.error : `Sent ${b.sent} follow-up(s)`;
  return new NextResponse(
    `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Follow-up · Ampliscore</title></head>
     <body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;background:#F5F3FF;margin:0;padding:48px 16px;">
       <div style="max-width:520px;margin:0 auto;background:#fff;border:1px solid #E5E2EF;border-radius:12px;padding:32px;">
         <p style="font-size:20px;font-weight:600;margin:0 0 20px 0;color:#241A3E;">ampli<span style="color:#7C3AED;">score</span></p>
         <h1 style="font-size:18px;color:#241A3E;margin:0 0 14px 0;">${heading}</h1>
         ${rows ? `<ul style="margin:0;padding-left:20px;line-height:1.9;">${rows}</ul>` : ""}
       </div></body></html>`,
    { status: r.status, headers: { "Content-Type": "text/html" } }
  );
}

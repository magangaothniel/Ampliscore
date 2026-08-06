import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const resend = new Resend(process.env.RESEND_API_KEY);
const OPERATOR = "magangaothniel@gmail.com";

const esc = (s: any) =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function inviteHtml(firstName: string, code: string) {
  const redeem = `https://ampliscore.app/redeem?code=${encodeURIComponent(code)}`;
  return `
  <div style="background:#F5F3FF;padding:40px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <div style="max-width:520px;margin:0 auto;background:#fff;border:1px solid #E5E2EF;border-radius:12px;padding:32px;">

      <p style="font-size:22px;font-weight:600;margin:0 0 4px 0;"><span style="color:#241A3E;">ampli</span><span style="color:#7C3AED;">score</span></p>
      <p style="color:#6B6480;font-size:13px;margin:0 0 26px 0;">Know where you stand.</p>

      <h1 style="color:#241A3E;font-size:21px;margin:0 0 14px 0;">You are in, ${esc(firstName)}</h1>

      <p style="color:#5B5470;font-size:15px;line-height:1.65;margin:0 0 18px 0;">
        Thanks for signing up to test Ampliscore. It tracks your GPA live, so
        instead of finding out where you landed in December, you see it move
        every time you enter a grade.
      </p>

      <p style="color:#5B5470;font-size:15px;line-height:1.65;margin:0 0 22px 0;">
        Here is your code. It unlocks Pro for free and works once.
      </p>

      <div style="background:#F5F3FF;border:1px solid #DDD6FE;border-radius:10px;padding:20px;text-align:center;margin-bottom:22px;">
        <p style="color:#6B6480;font-size:11px;text-transform:uppercase;letter-spacing:1px;margin:0 0 8px 0;">Your beta code</p>
        <p style="color:#241A3E;font-size:26px;font-weight:700;letter-spacing:3px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;margin:0;">${esc(code)}</p>
      </div>

      <a href="${redeem}" style="display:block;background:#7C3AED;color:#fff;text-decoration:none;font-size:15px;font-weight:600;padding:14px;border-radius:8px;text-align:center;margin-bottom:10px;">
        Create your account and redeem
      </a>
      <p style="color:#6B6480;font-size:12px;text-align:center;margin:0 0 28px 0;">
        Make an account first, then the code applies to it.
      </p>

      <div style="border-top:1px solid #F1EFF7;padding-top:22px;">
        <h2 style="color:#241A3E;font-size:16px;margin:0 0 6px 0;">Where to start</h2>
        <p style="color:#5B5470;font-size:14px;line-height:1.6;margin:0 0 14px 0;">
          Poke at anything you like, this is just a decent order. There is no
          need to finish it, and using the app normally for a week is more
          useful to me than working through a list.
        </p>
        <ol style="color:#5B5470;font-size:14px;line-height:1.85;margin:0;padding-left:20px;">
          <li>Add a real course with its actual grading categories, exams 40%, homework 25%, whatever your syllabus says</li>
          <li>Enter a few real scores and see whether the grade matches what your school says</li>
          <li>Check the GPA on your dashboard against what you expect</li>
          <li>Run an AI prediction on a course and judge whether the answer is useful or generic</li>
          <li>Use the GPA planner to work out what you need for a target</li>
          <li>Rate a professor you have actually had, and add a tip for succeeding in that class</li>
          <li>Try it on your phone, that is where most people will use it</li>
        </ol>
      </div>

      <div style="border-top:1px solid #F1EFF7;padding-top:22px;margin-top:24px;">
        <h2 style="color:#241A3E;font-size:16px;margin:0 0 6px 0;">What I actually need from you</h2>
        <p style="color:#5B5470;font-size:14px;line-height:1.6;margin:0 0 14px 0;">
          Reply to this email whenever you have something. Blunt is better than
          polite, and one honest sentence beats a paragraph of encouragement.
        </p>
        <ul style="color:#5B5470;font-size:14px;line-height:1.85;margin:0;padding-left:20px;">
          <li>What did you like</li>
          <li>What did you not like, or what was confusing</li>
          <li>What is missing that you would want</li>
          <li>Would you keep using this next semester, and why or why not</li>
        </ul>
        <p style="color:#5B5470;font-size:14px;line-height:1.6;margin:16px 0 0 0;">
          That last one matters most. If the answer is no, I would rather hear
          it now than find out in a year.
        </p>
      </div>

      <p style="color:#5B5470;font-size:14px;line-height:1.6;margin:24px 0 0 0;">
        Pro stays on for you. Keep using the app as long as it is useful.
      </p>
      <p style="color:#5B5470;font-size:14px;line-height:1.6;margin:14px 0 0 0;">
        Othniel
      </p>

      <p style="color:#8E88A3;font-size:11px;line-height:1.6;margin:26px 0 0 0;border-top:1px solid #F1EFF7;padding-top:16px;">
        You are getting this because you applied to test Ampliscore at
        ampliscore.app. Reply to this email if you would rather not take part.
      </p>
    </div>
  </div>`;
}

export async function POST(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dryRun = req.nextUrl.searchParams.get("dry") === "1";
  const onlyMe = req.nextUrl.searchParams.get("me") === "1";

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // Only codes that have not been sent and not been used.
  const { data: codes, error } = await admin
    .from("beta_codes")
    .select("code, issued_to, redeemed_at")
    .is("redeemed_at", null);

  if (error) {
    return NextResponse.json({ error: "Could not read codes." }, { status: 500 });
  }

  const { data: testers } = await admin
    .from("beta_testers")
    .select("first_name, email");

  const nameFor = new Map((testers || []).map((t: any) => [t.email, t.first_name]));

  const targets = (codes || []).filter((c: any) =>
    onlyMe ? c.issued_to === OPERATOR : true
  );

  if (dryRun) {
    return NextResponse.json({
      dryRun: true,
      wouldSend: targets.length,
      recipients: targets.map((c: any) => c.issued_to),
    });
  }

  const results: any[] = [];
  for (const c of targets) {
    const first = String(nameFor.get(c.issued_to) || "there").split(" ")[0];
    try {
      await resend.emails.send({
        from: "Ampliscore <noreply@ampliscore.app>",
        to: c.issued_to,
        replyTo: OPERATOR,
        subject: "Your Ampliscore beta code",
        html: inviteHtml(first, c.code),
      });
      results.push({ to: c.issued_to, status: "sent" });
    } catch (e) {
      results.push({ to: c.issued_to, status: "failed", detail: String(e).slice(0, 120) });
    }
    // Resend rate limits bursts; a small gap keeps a batch from tripping it.
    await new Promise((r) => setTimeout(r, 600));
  }

  // Always send a copy to the operator so you see exactly what they got.
  if (!onlyMe) {
    try {
      await resend.emails.send({
        from: "Ampliscore <noreply@ampliscore.app>",
        to: OPERATOR,
        subject: `[copy] Beta invite sent to ${results.length} tester(s)`,
        html: inviteHtml("Othniel", "AMPLI-SAMPLE"),
      });
    } catch (e) {
      console.error("Operator copy failed:", e);
    }
  }

  return NextResponse.json({ sent: results.length, results });
}

// Visiting the URL is the same as posting to it. Kept manual: putting this on
// a deploy hook would re-send the invite on every push.
export async function GET(req: NextRequest) {
  const res = await POST(req);
  const body = await res.json();

  const rows = (body.results || body.recipients || [])
    .map((r: any) =>
      typeof r === "string"
        ? `<li style="color:#5B5470;font-size:14px;">${r}</li>`
        : `<li style="color:${r.status === "sent" ? "#0A7350" : "#BE1B1B"};font-size:14px;">${r.to} — ${r.status}</li>`
    )
    .join("");

  const heading = body.dryRun
    ? `Dry run: ${body.wouldSend} invite(s) would be sent`
    : body.error
    ? body.error
    : `Sent ${body.sent} invite(s)`;

  return new NextResponse(
    `<!DOCTYPE html><html><head><meta charset="utf-8">
     <meta name="viewport" content="width=device-width,initial-scale=1">
     <title>Beta invites · Ampliscore</title></head>
     <body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;background:#F5F3FF;margin:0;padding:48px 16px;">
       <div style="max-width:520px;margin:0 auto;background:#fff;border:1px solid #E5E2EF;border-radius:12px;padding:32px;">
         <p style="font-size:20px;font-weight:600;margin:0 0 20px 0;color:#241A3E;">ampli<span style="color:#7C3AED;">score</span></p>
         <h1 style="font-size:18px;color:#241A3E;margin:0 0 14px 0;">${heading}</h1>
         ${rows ? `<ul style="margin:0;padding-left:20px;line-height:1.9;">${rows}</ul>` : ""}
         ${body.dryRun ? `<p style="color:#6B6480;font-size:13px;margin-top:20px;">Nothing was sent. Remove <code>&dry=1</code> from the URL to send for real.</p>` : ""}
       </div>
     </body></html>`,
    { status: res.status, headers: { "Content-Type": "text/html" } }
  );
}

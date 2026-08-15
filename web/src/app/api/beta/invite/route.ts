import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";
import { inviteHtml } from "@/lib/betaInvite";

const resend = new Resend(process.env.RESEND_API_KEY || "re_build_placeholder");
const OPERATOR = "magangaothniel@gmail.com";

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
    .select("code, issued_to, redeemed_at, sent_at")
    .is("redeemed_at", null)
    .is("sent_at", null);

  if (error) {
    return NextResponse.json({ error: "Could not read codes." }, { status: 500 });
  }

  const { data: testers } = await admin
    .from("beta_testers")
    .select("first_name, email, emails_enabled");

  const nameFor = new Map((testers || []).map((t: any) => [t.email, t.first_name]));
  const optedOut = new Set(
    (testers || [])
      .filter((t: any) => t.emails_enabled === false)
      .map((t: any) => String(t.email || "").toLowerCase())
  );

  const targets = (codes || [])
    .filter((c: any) => !optedOut.has(String(c.issued_to || "").toLowerCase()))
    .filter((c: any) => (onlyMe ? c.issued_to === OPERATOR : true));

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
        html: inviteHtml(
          first,
          c.code,
          createHmac("sha256", process.env.DIGEST_SECRET || "")
            .update(String(c.issued_to).toLowerCase())
            .digest("hex")
            .slice(0, 32),
          c.issued_to
        ),
      });
      await admin.from("beta_codes").update({ sent_at: new Date().toISOString() }).eq("code", c.code);
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
        html: inviteHtml(
          "Othniel",
          "AMPLI-SAMPLE",
          createHmac("sha256", process.env.DIGEST_SECRET || "").update(OPERATOR.toLowerCase()).digest("hex").slice(0, 32),
          OPERATOR
        ),
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

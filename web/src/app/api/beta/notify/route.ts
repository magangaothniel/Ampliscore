import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";
import { inviteHtml, generateBetaCode } from "@/lib/betaInvite";

const resend = new Resend(process.env.RESEND_API_KEY || "re_build_placeholder");
const ALERT_TO = "magangaothniel@gmail.com";

export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const email = String(body?.email || "").slice(0, 200);
  if (!email) {
    return NextResponse.json({ error: "Missing email" }, { status: 400 });
  }

  // Without this the route is an open door: anyone could POST a guessed
  // address and receive that applicant's full application by email.
  const expected = createHmac("sha256", process.env.DIGEST_SECRET || "")
    .update(email.toLowerCase())
    .digest("hex")
    .slice(0, 24);
  if (String(body?.token || "") !== expected) {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }

  // Read the row back from the database rather than trusting the client body,
  // so the alert always reflects what was actually stored.
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { data: row } = await admin
    .from("beta_testers")
    .select("*")
    .eq("email", email)
    .limit(1)
    .maybeSingle();

  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { count } = await admin
    .from("beta_testers")
    .select("*", { count: "exact", head: true });

  const esc = (s: any) =>
    String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

  const arr = (v: any) => (Array.isArray(v) ? v.join(", ") : String(v ?? ""));

  const line = (label: string, value: any) =>
    value
      ? `<p style="color:#5B5470;font-size:14px;margin:0 0 6px 0;"><strong style="color:#241A3E;">${label}:</strong> ${esc(value)}</p>`
      : "";

  try {
    await resend.emails.send({
      from: "Ampliscore <alerts@ampliscore.app>",
      to: ALERT_TO,
      subject: `Beta application #${count ?? "?"} — ${row.first_name} ${row.last_name}`,
      html: `
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;max-width:520px;">
          <h2 style="color:#241A3E;font-size:18px;margin:0 0 4px 0;">New beta application</h2>
          <p style="color:#8E88A3;font-size:13px;margin:0 0 16px 0;">Total applications: ${count ?? "unknown"}</p>
          <div style="background:#F5F3FF;border-radius:8px;padding:16px;">
            ${line("Name", `${row.first_name} ${row.last_name}`)}
            ${line("Email", row.email)}
            ${line("University", row.university)}
            ${line("Year", row.year_of_study)}
            ${line("Major", row.major)}
            ${line("Platforms", arr(row.platforms))}
            ${line("Wants", arr(row.features))}
            ${line("Device", row.primary_device)}
            ${line("Testing experience", row.testing_experience)}
          </div>
          ${row.biggest_frustration ? `<p style="color:#5B5470;font-size:14px;margin:16px 0 0 0;"><strong style="color:#241A3E;">Biggest frustration:</strong><br>${esc(row.biggest_frustration)}</p>` : ""}
          ${row.extra_notes ? `<p style="color:#5B5470;font-size:14px;margin:12px 0 0 0;"><strong style="color:#241A3E;">Notes:</strong><br>${esc(row.extra_notes)}</p>` : ""}
        </div>
      `,
    });
  } catch (e) {
    console.error("Beta notification failed:", e);
    return NextResponse.json({ error: "Email failed" }, { status: 500 });
  }

  // Auto-invite. Everything below is best effort on purpose: the operator
  // alert has already been sent, so a failure here must not turn into a 500
  // that makes the client think the whole signup broke.
  let invited = false;
  try {
    // One code per applicant, ever. A retried request must not mint a second.
    const { data: existing } = await admin
      .from("beta_codes")
      .select("code")
      .eq("issued_to", email)
      .limit(1)
      .maybeSingle();

    if (!existing) {
      let code: string | null = null;

      // code is almost certainly unique-constrained, so collide and retry
      // rather than trusting a single draw.
      for (let attempt = 0; attempt < 5 && !code; attempt++) {
        const candidate = generateBetaCode();
        const { error } = await admin
          .from("beta_codes")
          .insert({ code: candidate, issued_to: email });
        if (!error) code = candidate;
        else if (!String(error.message).toLowerCase().includes("duplicate")) {
          console.error("beta_codes insert failed:", error.message);
          break;
        }
      }

      if (code) {
        await resend.emails.send({
          from: "Ampliscore <noreply@ampliscore.app>",
          to: email,
          replyTo: ALERT_TO,
          subject: "Your Ampliscore beta code",
          html: inviteHtml(row.first_name || "there", code),
        });
        invited = true;
      }
    }
  } catch (e) {
    console.error("Auto-invite failed:", e);
  }

  return NextResponse.json({ success: true, invited });
}

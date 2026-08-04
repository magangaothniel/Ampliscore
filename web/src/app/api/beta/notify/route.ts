import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";

const resend = new Resend(process.env.RESEND_API_KEY);
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
    .single();

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

  return NextResponse.json({ success: true });
}

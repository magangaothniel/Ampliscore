import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const resend = new Resend(process.env.RESEND_API_KEY);
const OPERATOR = "magangaothniel@gmail.com";

// Everything that would hurt to lose. Order matters only for readability.
const TABLES = [
  "profiles",
  "courses",
  "grade_categories",
  "assignments",
  "professor_ratings",
  "beta_testers",
  "beta_codes",
  "waitlist",
];

// Supabase caps a single select at 1000 rows, so page through.
const PAGE = 1000;

async function dumpTable(admin: any, table: string) {
  const rows: any[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await admin
      .from(table)
      .select("*")
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`${table}: ${error.message}`);
    if (!data?.length) break;
    rows.push(...data);
    if (data.length < PAGE) break;
  }
  return rows;
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

  const preview = req.nextUrl.searchParams.get("preview") === "1";
  const redact = req.nextUrl.searchParams.get("redact") === "1";

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const dump: Record<string, any[]> = {};
  const counts: Record<string, number> = {};
  const failed: string[] = [];

  for (const t of TABLES) {
    try {
      const rows = await dumpTable(admin, t);
      dump[t] = rows;
      counts[t] = rows.length;
    } catch (e: any) {
      // A missing or renamed table should not sink the whole backup.
      console.error("Backup failed for", t, e?.message);
      failed.push(t);
    }
  }

  if (redact) {
    for (const t of Object.keys(dump)) {
      dump[t] = dump[t].map((r: any) => {
        const copy = { ...r };
        for (const k of ["email", "issued_to", "full_name", "first_name", "last_name"]) {
          if (k in copy && copy[k]) copy[k] = "[redacted]";
        }
        return copy;
      });
    }
  }

  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const stamp = new Date().toISOString().slice(0, 10);

  if (preview) {
    return NextResponse.json({ preview: true, counts, failed, total, redact });
  }

  const payload = JSON.stringify(
    { exported_at: new Date().toISOString(), redacted: redact, counts, data: dump },
    null,
    2
  );

  const summary = TABLES.map((t) =>
    failed.includes(t) ? `${t}: FAILED` : `${t}: ${counts[t] ?? 0}`
  ).join("<br>");

  try {
    await resend.emails.send({
      from: "Ampliscore <alerts@ampliscore.app>",
      to: OPERATOR,
      subject: `[backup] Ampliscore ${stamp} — ${total} rows`,
      html: `
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;max-width:520px;">
          <h2 style="color:#241A3E;font-size:17px;margin:0 0 4px 0;">Database backup</h2>
          <p style="color:#8E88A3;font-size:13px;margin:0 0 16px 0;">${stamp}${redact ? " · redacted" : ""}</p>
          <div style="background:#F5F3FF;border-radius:8px;padding:16px;color:#5B5470;font-size:14px;line-height:1.8;">
            ${summary}
          </div>
          <p style="color:#5B5470;font-size:14px;margin:16px 0 0 0;">
            <strong style="color:#241A3E;">${total}</strong> rows total. The JSON file is attached.
          </p>
          ${failed.length ? `<p style="color:#B45309;font-size:13px;margin:12px 0 0 0;">Some tables failed: ${failed.join(", ")}. Check the logs.</p>` : ""}
          <p style="color:#8E88A3;font-size:12px;line-height:1.6;margin:20px 0 0 0;border-top:1px solid #F1EFF7;padding-top:14px;">
            Keep this somewhere safe. It contains user data.
          </p>
        </div>`,
      attachments: [
        {
          filename: `ampliscore-backup-${stamp}.json`,
          content: Buffer.from(payload).toString("base64"),
        },
      ],
    });
  } catch (e: any) {
    console.error("Backup email failed:", e?.message);
    return NextResponse.json(
      { error: "Backup built but the email failed.", counts, failed },
      { status: 502 }
    );
  }

  return NextResponse.json({ sent: true, counts, failed, total, bytes: payload.length });
}

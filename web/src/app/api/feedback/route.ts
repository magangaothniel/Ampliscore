import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const resend = new Resend(process.env.RESEND_API_KEY || "re_build_placeholder");
const ALERT_TO = "magangaothniel@gmail.com";

const clean = (v: any, max = 2000) => String(v ?? "").slice(0, max).trim();
const esc = (s: any) =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");


// Narrow on purpose. Student vernacular is full of hyperbole, so this looks for
// phrasing that is hard to read as figure of speech. It is a prompt for a human
// to read the message, never an automated diagnosis.
const CONCERN = [
  "kill myself",
  "killing myself",
  "end my life",
  "want to die",
  "wanna die",
  "suicidal",
  "suicide",
  "self harm",
  "self-harm",
  "hurt myself",
  "hurting myself",
  "no reason to live",
  "not worth living",
  "better off dead",
  "cant go on",
  "can't go on",
];

function concernFlag(...parts: (string | null | undefined)[]) {
  const text = parts.filter(Boolean).join(" ").toLowerCase();
  return CONCERN.some((phrase) => text.includes(phrase));
}

export async function POST(req: NextRequest) {
  let body: any;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const would = ["yes", "maybe", "no"].includes(body?.would_continue) ? body.would_continue : null;
  if (!would) return NextResponse.json({ error: "Pick whether you would keep using it." }, { status: 400 });

  let userId: string | null = null;
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const anon = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data: { user } } = await anon.auth.getUser(authHeader.slice(7));
    userId = user?.id ?? null;
  }

  const row = {
    user_id: userId,
    email: clean(body?.email, 200),
    liked: clean(body?.liked),
    disliked: clean(body?.disliked),
    wanted: clean(body?.wanted),
    would_continue: would,
    why: clean(body?.why),
    ease_rating: Number(body?.ease_rating) >= 1 && Number(body?.ease_rating) <= 5 ? Number(body.ease_rating) : null,
    accuracy_ok: typeof body?.accuracy_ok === "boolean" ? body.accuracy_ok : null,
    used_mobile: typeof body?.used_mobile === "boolean" ? body.used_mobile : null,
  };

  const concerning = concernFlag(row.liked, row.disliked, row.wanted, row.why);

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { error } = await admin.from("beta_feedback").insert(row);
  if (error) {
    return NextResponse.json({ error: "Could not save that." }, { status: 500 });
  }

  const block = (label: string, val: any) =>
    val ? `<p style="color:#5B5470;font-size:14px;margin:0 0 12px 0;"><strong style="color:#241A3E;">${label}</strong><br>${esc(val)}</p>` : "";

  const colour = would === "yes" ? "#0A7350" : would === "maybe" ? "#A8500A" : "#BE1B1B";

  try {
    await resend.emails.send({
      from: "Ampliscore <alerts@ampliscore.app>",
      to: ALERT_TO,
      replyTo: row.email || undefined,
      subject: concerning
        ? `[PLEASE READ] Beta feedback — ${row.email || "anonymous"}`
        : `Beta feedback (${would}) — ${row.email || "anonymous"}`,
      html: `
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;max-width:560px;">
          ${concerning ? `<div style="background:#FEF3C7;border:1px solid #F59E0B;border-radius:8px;padding:14px;margin:0 0 16px 0;">
            <p style="color:#78350F;font-size:14px;line-height:1.6;margin:0;">
              <strong>This message mentions self-harm.</strong> Read it before anything else.
              If you reply, keep it human and point them to 988 (call or text, 24/7).
            </p>
          </div>` : ""}
          <h2 style="color:#241A3E;font-size:17px;margin:0 0 4px 0;">Beta feedback</h2>
          <p style="color:#8E88A3;font-size:12px;margin:0 0 16px 0;">${esc(row.email || "no email")}</p>
          <p style="font-size:15px;margin:0 0 18px 0;">Would keep using it:
            <strong style="color:${colour};text-transform:uppercase;">${would}</strong>
            ${row.ease_rating ? ` &middot; setup ease ${row.ease_rating}/5` : ""}
            ${row.accuracy_ok === false ? ' &middot; <span style="color:#BE1B1B;">grades did not match</span>' : ""}
            ${row.used_mobile ? " &middot; used mobile" : ""}
          </p>
          <div style="background:#F5F3FF;border-radius:8px;padding:16px;">
            ${block("Why", row.why)}
            ${block("Liked", row.liked)}
            ${block("Did not like", row.disliked)}
            ${block("Wanted", row.wanted)}
          </div>
        </div>`,
    });
  } catch (e) {
    console.error("Feedback alert failed:", e);
  }

  return NextResponse.json({ ok: true, concerning });
}

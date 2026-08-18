import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { concernFlag, concernBanner } from "@/lib/concern";

// Constructed with a fallback so a missing env var can't crash the build.
const resend = new Resend(process.env.RESEND_API_KEY || "re_build_placeholder");
const ALERT_TO = "magangaothniel@gmail.com";

const TYPES = ["bug", "question", "billing", "other"] as const;
const PLATFORMS = ["web", "ios", "android"] as const;

const MAX_MESSAGE = 2000;

// A free-text box that sends mail is a spam vector, so cap how often one
// account can file. Deliberately generous: this is about stopping scripts,
// not about making a frustrated user wait.
const WINDOW_MINUTES = 10;
const MAX_PER_WINDOW = 5;

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

  // Sending mail costs money, so require a confirmed address the same way
  // the AI endpoints do.
  if (!user.email_confirmed_at) {
    return NextResponse.json(
      { error: "Please confirm your email address first." },
      { status: 403 }
    );
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { type, message, platform, app_version } = body || {};

  if (!TYPES.includes(type)) {
    return NextResponse.json({ error: "Pick what your message is about." }, { status: 400 });
  }
  const text = String(message || "").trim();
  if (text.length < 10) {
    return NextResponse.json(
      { error: "Tell us a little more so we can actually help." },
      { status: 400 }
    );
  }
  if (text.length > MAX_MESSAGE) {
    return NextResponse.json(
      { error: `Please keep it under ${MAX_MESSAGE} characters.` },
      { status: 400 }
    );
  }
  const plat = PLATFORMS.includes(platform) ? platform : null;

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const since = new Date(Date.now() - WINDOW_MINUTES * 60 * 1000).toISOString();
  const { count, error: countError } = await admin
    .from("support_requests")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", since);

  if (countError) {
    console.error("SUPPORT RATE CHECK ERROR:", countError.message);
  } else if ((count ?? 0) >= MAX_PER_WINDOW) {
    return NextResponse.json(
      { error: "You've sent a few messages already. We'll reply to those first." },
      { status: 429 }
    );
  }

  const concerning = concernFlag(text);

  const { error: insertError } = await admin.from("support_requests").insert({
    user_id: user.id,
    email: user.email,
    type,
    message: text,
    platform: plat,
    app_version: app_version ? String(app_version).slice(0, 40) : null,
    concerning,
  });

  if (insertError) {
    console.error("SUPPORT INSERT ERROR:", insertError.message);
    return NextResponse.json({ error: "Could not send that. Please try again." }, { status: 500 });
  }

  // The request is saved at this point. If the email fails, that's worth
  // logging but not worth telling the user their message vanished.
  try {
    await resend.emails.send({
      from: "Ampliscore <support@ampliscore.app>",
      to: ALERT_TO,
      replyTo: user.email,
      subject: concerning
        ? `[check in] ${type} from ${user.email}`
        : `[support] ${type} from ${user.email}`,
      html: `
        <div style="font-family:system-ui,-apple-system,sans-serif;max-width:560px;">
          ${concerning ? concernBanner() : ""}
          <p style="color:#6B6480;font-size:13px;margin:0 0 4px 0;">
            ${type} · ${plat || "unknown platform"}${app_version ? ` · v${app_version}` : ""}
          </p>
          <p style="color:#1E1333;font-size:15px;line-height:1.55;white-space:pre-wrap;">${escapeHtml(text)}</p>
          <hr style="border:none;border-top:1px solid #EDE9FE;margin:20px 0;" />
          <p style="color:#8E88A3;font-size:13px;margin:0;">
            From ${user.email} · reply directly to this email to respond.
          </p>
        </div>
      `,
    });
  } catch (e) {
    console.error("SUPPORT EMAIL ERROR:", e);
  }

  return NextResponse.json({ ok: true });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

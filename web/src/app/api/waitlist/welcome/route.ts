import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";
import { createHmac } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { waitlistWelcomeHtml } from "@/lib/waitlistWelcome";

const resend = new Resend(process.env.RESEND_API_KEY);
const ALERT_TO = "magangaothniel@gmail.com";

export async function POST(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }

  // Preview mode: send one copy to the operator and stop. Never reads or
  // stamps the waitlist, so it is safe to run at any time.
  if (req.nextUrl.searchParams.get("preview") === "1") {
    const previewToken = createHmac("sha256", process.env.DIGEST_SECRET || "")
      .update(ALERT_TO.toLowerCase())
      .digest("hex")
      .slice(0, 32);

    try {
      await resend.emails.send({
        from: "Ampliscore <noreply@ampliscore.app>",
        to: ALERT_TO,
        replyTo: ALERT_TO,
        subject: "[preview] Here is what you signed up for",
        html: waitlistWelcomeHtml("Othniel", ALERT_TO, previewToken),
      });
    } catch (e: any) {
      return NextResponse.json({ error: e?.message }, { status: 500 });
    }

    return NextResponse.json({ preview: true, sentTo: ALERT_TO });
  }

  const dryRun = req.nextUrl.searchParams.get("dry") === "1";
  const limit = Math.min(
    Number(req.nextUrl.searchParams.get("limit") || 50) || 50,
    100
  );

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { data: pending, error } = await admin
    .from("waitlist")
    .select("name, email")
    .is("welcomed_at", null)
    .is("unsubscribed_at", null)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!pending || pending.length === 0) {
    return NextResponse.json({ sent: 0, message: "Nobody pending" });
  }

  if (dryRun) {
    return NextResponse.json({
      dryRun: true,
      wouldSend: pending.length,
      recipients: pending.map((p) => p.email),
    });
  }

  const results: { to: string; status: string }[] = [];

  for (const person of pending) {
    const unsubToken = createHmac("sha256", process.env.DIGEST_SECRET || "")
      .update(String(person.email).toLowerCase())
      .digest("hex")
      .slice(0, 32);

    try {
      await resend.emails.send({
        from: "Ampliscore <noreply@ampliscore.app>",
        to: person.email,
        replyTo: ALERT_TO,
        subject: "Here is what you signed up for",
        html: waitlistWelcomeHtml(person.name, person.email, unsubToken),
      });

      // Stamped only after a confirmed send, so a crash mid-batch means the
      // next run retries this person rather than skipping them forever.
      await admin
        .from("waitlist")
        .update({ welcomed_at: new Date().toISOString() })
        .eq("email", person.email);

      results.push({ to: person.email, status: "sent" });
    } catch (e: any) {
      console.error("Welcome backfill failed for", person.email, e?.message);
      results.push({ to: person.email, status: "failed" });
    }

    // Resend allows 2 requests per second. Stay well under it.
    await new Promise((r) => setTimeout(r, 600));
  }

  return NextResponse.json({
    sent: results.filter((r) => r.status === "sent").length,
    failed: results.filter((r) => r.status === "failed").length,
    results,
  });
}

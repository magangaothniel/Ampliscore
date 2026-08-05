import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";
import { createHmac } from "crypto";
import { NextRequest, NextResponse } from "next/server";

const resend = new Resend(process.env.RESEND_API_KEY);
const ALERT_TO = "magangaothniel@gmail.com";

const clean = (v: any, max = 120) => String(v ?? "").replace(/[<>]/g, "").slice(0, max);
const esc = (s: any) =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const name = clean(body?.name, 80);
  const email = clean(body?.email, 200).toLowerCase();
  const university = clean(body?.university, 120);
  const year = clean(body?.year, 40);
  const platforms = Array.isArray(body?.platforms)
    ? body.platforms.filter((p: any) => ["ios", "android", "web"].includes(p)).slice(0, 3)
    : [];

  if (!name || !email || !university || platforms.length === 0) {
    return NextResponse.json({ error: "Please fill in every field." }, { status: 400 });
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(email)) {
    return NextResponse.json({ error: "That email does not look right." }, { status: 400 });
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { error } = await admin.from("waitlist").insert({
    name, email, university, year, platforms,
  });

  if (error) {
    // Unique violation: already signed up. Treat that as success, since telling
    // someone "you already did this" helps nobody.
    if (error.code === "23505") {
      return NextResponse.json({ ok: true, already: true });
    }
    return NextResponse.json({ error: "Could not add you. Please try again." }, { status: 500 });
  }

  const { count } = await admin.from("waitlist").select("*", { count: "exact", head: true });

  const unsubToken = createHmac("sha256", process.env.DIGEST_SECRET || "")
    .update(email)
    .digest("hex")
    .slice(0, 32);

  // Confirm to the person who signed up
  try {
    await resend.emails.send({
      from: "Ampliscore <noreply@ampliscore.app>",
      to: email,
      subject: "You are on the Ampliscore waitlist",
      html: `
        <div style="background:#F5F3FF;padding:40px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
          <div style="max-width:480px;margin:0 auto;background:#fff;border:1px solid #E5E2EF;border-radius:12px;padding:32px;">
            <p style="font-size:22px;font-weight:600;margin:0 0 4px 0;"><span style="color:#241A3E;">ampli</span><span style="color:#7C3AED;">score</span></p>
            <p style="color:#6B6480;font-size:13px;margin:0 0 24px 0;">Know where you stand.</p>
            <h1 style="color:#241A3E;font-size:20px;margin:0 0 12px 0;">You are on the list</h1>
            <p style="color:#5B5470;font-size:15px;line-height:1.6;margin:0 0 20px 0;">
              Thanks ${esc(name.split(" ")[0])}. We will email you the day Ampliscore
              lands on ${platforms.includes("ios") ? "the App Store" : "Google Play"},
              with a link to download it.
            </p>
            <p style="color:#5B5470;font-size:15px;line-height:1.6;margin:0 0 20px 0;">
              You do not have to wait, though. The web version works right now and
              your account carries over.
            </p>
            <a href="https://ampliscore.app/register" style="display:inline-block;background:#7C3AED;color:#fff;text-decoration:none;font-size:15px;font-weight:600;padding:12px 28px;border-radius:8px;">Start tracking today</a>
            <p style="color:#6B6480;font-size:12px;line-height:1.6;margin:26px 0 0 0;">
              You are getting this because you joined the waitlist at ampliscore.app.
              <a href="https://ampliscore.app/api/waitlist/leave?e=${encodeURIComponent(email)}&t=${unsubToken}" style="color:#7C3AED;">Leave the list</a>
            </p>
          </div>
        </div>`,
    });
  } catch (e) {
    console.error("Waitlist confirmation failed:", e);
  }

  // Tell the operator
  try {
    await resend.emails.send({
      from: "Ampliscore <alerts@ampliscore.app>",
      to: ALERT_TO,
      subject: `Waitlist #${count ?? "?"} — ${name}`,
      html: `
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;max-width:480px;">
          <h2 style="color:#241A3E;font-size:17px;margin:0 0 4px 0;">New waitlist signup</h2>
          <p style="color:#8E88A3;font-size:12px;margin:0 0 16px 0;">${count ?? "?"} total</p>
          <div style="background:#F5F3FF;border-radius:8px;padding:14px;">
            <p style="color:#5B5470;font-size:14px;margin:0 0 4px 0;"><strong style="color:#241A3E;">${esc(name)}</strong></p>
            <p style="color:#5B5470;font-size:14px;margin:0 0 4px 0;">${esc(email)}</p>
            <p style="color:#5B5470;font-size:14px;margin:0 0 4px 0;">${esc(university)} &middot; ${esc(year)}</p>
            <p style="color:#5B5470;font-size:14px;margin:0;">Wants: ${esc(platforms.join(", "))}</p>
          </div>
        </div>`,
    });
  } catch (e) {
    console.error("Waitlist alert failed:", e);
  }

  return NextResponse.json({ ok: true });
}

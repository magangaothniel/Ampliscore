import { createClient } from "@supabase/supabase-js";
import { createHmac } from "crypto";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const email = (req.nextUrl.searchParams.get("e") || "").toLowerCase();
  const token = req.nextUrl.searchParams.get("t") || "";

  const page = (title: string, body: string) =>
    new NextResponse(
      `<!DOCTYPE html><html><head><meta charset="utf-8">
      <meta name="viewport" content="width=device-width,initial-scale=1">
      <title>${title} · Ampliscore</title></head>
      <body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;background:#F5F3FF;margin:0;padding:48px 16px;">
        <div style="max-width:440px;margin:0 auto;background:#fff;border:1px solid #E5E2EF;border-radius:12px;padding:32px;">
          <p style="font-size:20px;font-weight:600;margin:0 0 16px 0;color:#241A3E;">ampli<span style="color:#7C3AED;">score</span></p>
          <h1 style="font-size:18px;color:#241A3E;margin:0 0 8px 0;">${title}</h1>
          <p style="color:#5B5470;font-size:15px;line-height:1.6;margin:0;">${body}</p>
        </div>
      </body></html>`,
      { headers: { "Content-Type": "text/html" } }
    );

  const expected = createHmac("sha256", process.env.DIGEST_SECRET || "")
    .update(email)
    .digest("hex")
    .slice(0, 32);

  if (!email || token !== expected) {
    return page("Link not valid", "This link is invalid or has expired.");
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  await admin.from("waitlist").delete().eq("email", email);

  return page(
    "You are off the list",
    "You will not hear from us about the app launch. No hard feelings."
  );
}

import { createClient } from "@supabase/supabase-js";
import { createHmac } from "crypto";
import { NextRequest, NextResponse } from "next/server";

function sign(userId: string) {
  return createHmac("sha256", process.env.DIGEST_SECRET || "")
    .update(userId)
    .digest("hex")
    .slice(0, 32);
}

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("u") || "";
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

  if (!id || token !== sign(id)) {
    return page("Link not valid", "This unsubscribe link is invalid or has expired. You can also turn the weekly email off in your account settings.");
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { error } = await admin
    .from("profiles")
    .update({ digest_enabled: false })
    .eq("id", id);

  if (error) {
    return page("Something went wrong", "We could not update your preferences. Please email magangaothniel@gmail.com and we will remove you manually.");
  }

  return page(
    "You are unsubscribed",
    "You will not receive the weekly grade summary again. Your account and your grades are untouched, and you can turn the email back on any time in Settings."
  );
}

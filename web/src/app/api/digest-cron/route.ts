import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  // Verify it's coming from Vercel cron
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/digest`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ secret: process.env.DIGEST_SECRET }),
  });

  const data = await res.json();
  return NextResponse.json(data);
}

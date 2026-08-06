import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
  }
  const token = authHeader.slice(7);

  const anon = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { data: { user }, error: userErr } = await anon.auth.getUser(token);
  if (userErr || !user) {
    return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
  }

  let body: any;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const code = String(body?.code || "").trim().slice(0, 40);
  if (!code) return NextResponse.json({ error: "Enter your code." }, { status: 400 });

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // The claim happens inside a single conditional UPDATE in the database, so
  // two people submitting the same code at once cannot both win.
  const { data, error } = await admin.rpc("redeem_beta_code", {
    p_code: code,
    p_user: user.id,
  });

  if (error) {
    return NextResponse.json({ error: "Could not check that code." }, { status: 500 });
  }

  switch (data) {
    case "ok":
      return NextResponse.json({ ok: true });
    case "used":
      return NextResponse.json({ error: "That code has already been used." }, { status: 409 });
    case "already_redeemed":
      return NextResponse.json({ error: "You have already redeemed a code on this account." }, { status: 409 });
    default:
      return NextResponse.json({ error: "That code is not valid." }, { status: 404 });
  }
}

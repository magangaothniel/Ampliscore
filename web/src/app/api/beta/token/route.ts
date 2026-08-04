import { createHmac } from "crypto";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

// Issues a notify token, but only for an address that has just been stored.
// The token proves the address really applied; it does not prove identity,
// which is fine because the only thing it unlocks is an email to the operator.
export async function GET(req: NextRequest) {
  const email = (req.nextUrl.searchParams.get("email") || "").slice(0, 200);
  if (!email) return NextResponse.json({ error: "Missing email" }, { status: 400 });

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { data } = await admin
    .from("beta_testers")
    .select("id, created_at")
    .eq("email", email)
    .limit(1)
    .single();

  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const token = createHmac("sha256", process.env.DIGEST_SECRET || "")
    .update(email.toLowerCase())
    .digest("hex")
    .slice(0, 24);

  return NextResponse.json({ token });
}

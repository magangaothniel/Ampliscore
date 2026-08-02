import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const REASONS = ["inaccurate", "offensive", "harassment", "spam", "not_a_review", "other"];

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

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { rating_id, reason, details } = body || {};
  if (!rating_id || !REASONS.includes(reason)) {
    return NextResponse.json({ error: "Pick a reason for the report." }, { status: 400 });
  }
  if (details && String(details).length > 1000) {
    return NextResponse.json({ error: "Details must be under 1000 characters." }, { status: 400 });
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { error } = await admin.from("rating_reports").insert({
    rating_id,
    reporter_id: user.id,
    reason,
    details: details ? String(details).slice(0, 1000) : null,
  });

  if (error) {
    return NextResponse.json({ error: "Could not submit report." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

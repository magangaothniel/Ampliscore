import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  const body = await req.json();

  // Init Supabase with service role to bypass RLS
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Get user from auth header
  const authHeader = req.headers.get("authorization");
  if (!authHeader) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Get profile
  const { data: profile } = await supabase.from("profiles").select("is_pro, is_beta, ai_predictions_used, ai_predictions_reset_date").eq("id", user.id).single();
  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  // Check access
  if (!profile.is_pro && !profile.is_beta) {
    return NextResponse.json({ error: "upgrade_required" }, { status: 403 });
  }

  // Reset counter if new month
  const resetDate = new Date(profile.ai_predictions_reset_date);
  const now = new Date();
  const isNewMonth = now.getMonth() !== resetDate.getMonth() || now.getFullYear() !== resetDate.getFullYear();
  if (isNewMonth) {
    await supabase.from("profiles").update({ ai_predictions_used: 0, ai_predictions_reset_date: now.toISOString() }).eq("id", user.id);
    profile.ai_predictions_used = 0;
  }

  // Enforce cap
  const cap = profile.is_beta ? 10 : 50;
  if (profile.ai_predictions_used >= cap) {
    return NextResponse.json({ error: "limit_reached", used: profile.ai_predictions_used, cap }, { status: 429 });
  }

  // Call Claude
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5",
      max_tokens: 1024,
      messages: body.messages,
    }),
  });
  const data = await res.json();

  // Increment counter
  await supabase.from("profiles").update({ ai_predictions_used: profile.ai_predictions_used + 1 }).eq("id", user.id);

  return NextResponse.json({ ...data, predictions_used: profile.ai_predictions_used + 1, cap });
}

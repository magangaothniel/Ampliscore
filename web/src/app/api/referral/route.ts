import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function POST(req: NextRequest) {
  try {
    const { newUserId, refCode } = await req.json();
    if (!newUserId || !refCode) return NextResponse.json({ error: "Missing params" }, { status: 400 });

    const supabase = getAdminClient();

    // Find referrer by code
    const { data: referrer } = await supabase
      .from("profiles")
      .select("id, referral_count, is_pro")
      .eq("referral_code", refCode.toUpperCase())
      .single();

    if (!referrer) return NextResponse.json({ error: "Invalid referral code" }, { status: 404 });

    // Set referred_by on new user
    await supabase.from("profiles").update({ referred_by: refCode.toUpperCase() }).eq("id", newUserId);

    // Increment referrer count
    const newCount = (referrer.referral_count || 0) + 1;
    const updates: any = { referral_count: newCount };

    // Grant Pro if they hit 3 referrals
    if (newCount >= 3 && !referrer.is_pro) {
      updates.is_pro = true;
    }

    await supabase.from("profiles").update(updates).eq("id", referrer.id);

    return NextResponse.json({ success: true, newCount });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

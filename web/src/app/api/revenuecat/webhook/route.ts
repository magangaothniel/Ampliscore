import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

type RevenueCatEvent = {
  type?: string;
  app_user_id?: string;
  original_app_user_id?: string;
  entitlement_ids?: string[] | null;
  expiration_at_ms?: number | null;
  store?: string;
};

// Matches the entitlement identifier configured in the RevenueCat dashboard
// and referenced by mobile/lib/purchases.ts.
const PRO_ENTITLEMENT = "pro";

export async function POST(req: NextRequest) {
  // RevenueCat sends whatever value is set as the Authorization header in
  // Project settings → Integrations → Webhooks. Without this check anyone who
  // finds the URL could grant themselves Pro.
  const expected = process.env.REVENUECAT_WEBHOOK_SECRET;
  if (!expected || req.headers.get("authorization") !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: { event?: RevenueCatEvent };
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const event = payload.event;
  if (!event) return NextResponse.json({ error: "Missing event" }, { status: 400 });

  // Fired from the dashboard's "Send test webhook" button. Acknowledge it so
  // the dashboard shows green, but never touch a profile.
  if (event.type === "TEST") return NextResponse.json({ received: true });

  // The app configures RevenueCat with the Supabase user id as appUserID, so
  // this is a profiles.id. Anonymous ids ($RCAnonymousID:...) mean the purchase
  // happened before login — the client syncs those on next launch instead.
  const userId = event.app_user_id ?? event.original_app_user_id;
  if (!userId || userId.startsWith("$RCAnonymousID")) {
    return NextResponse.json({ received: true, skipped: "no app user id" });
  }

  // Events scoped to a different entitlement (none exist today, but adding one
  // later shouldn't silently revoke Pro).
  const entitlements = event.entitlement_ids ?? [];
  if (entitlements.length > 0 && !entitlements.includes(PRO_ENTITLEMENT)) {
    return NextResponse.json({ received: true, skipped: "other entitlement" });
  }

  // Deciding on expiration rather than event type keeps CANCELLATION correct:
  // auto-renew is off but the user paid through the end of the period, so Pro
  // stays on until EXPIRATION actually arrives.
  const expiresAt = event.expiration_at_ms;
  const isPro = expiresAt == null || expiresAt > Date.now();

  const supabase = getAdminClient();

  if (isPro) {
    await supabase
      .from("profiles")
      .update({ is_pro: true, pro_source: "apple" })
      .eq("id", userId);
  } else {
    // Only revoke subscriptions that Apple granted. A user who also pays
    // through Stripe (or a beta tester granted Pro by hand) must not lose
    // access because their old Apple subscription lapsed.
    await supabase
      .from("profiles")
      .update({ is_pro: false, pro_source: null })
      .eq("id", userId)
      .eq("pro_source", "apple");
  }

  return NextResponse.json({ received: true });
}

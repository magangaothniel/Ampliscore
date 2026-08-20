import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_build_placeholder");

export async function POST(req: NextRequest) {
  try {
    // Web sends cookies; the mobile app has none and sends a Bearer token
    // instead. Accept either.
    const authHeader = req.headers.get("authorization");
    let user = null;

    if (authHeader?.startsWith("Bearer ")) {
      const anon = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      const { data } = await anon.auth.getUser(authHeader.slice(7));
      user = data.user;
    } else {
      const supabase = await createServerSupabaseClient();
      const { data } = await supabase.auth.getUser();
      user = data.user;
    }

    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Look up customer by email directly — works for ALL users
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    
    if (customers.data.length === 0) {
      return NextResponse.json({ error: "No subscription found" }, { status: 404 });
    }

    const customerId = customers.data[0].id;

    // Deliberately not writing stripe_customer_id here. This route runs as the
    // signed in user, and the profiles trigger reverts privileged columns for
    // anyone but the service role, so the write would be silently discarded.
    // The webhook sets the id at checkout, and this route looks the customer
    // up by email every time, so nothing depends on it being stored.

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: "https://ampliscore.app/settings",
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

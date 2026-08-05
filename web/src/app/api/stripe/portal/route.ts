import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createServerSupabaseClient } from "@/lib/supabase-server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
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

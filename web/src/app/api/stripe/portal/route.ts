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

    // Save it for future use
    await supabase.from("profiles").update({ stripe_customer_id: customerId }).eq("id", user.id);

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: "https://ampliscore.app/settings",
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

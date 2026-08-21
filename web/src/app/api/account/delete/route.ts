import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import {
  cancelSubscription,
  findBillingSubscriptions,
  getBillingDisclosure,
} from "@/lib/stripeRevenue";

async function authenticate(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const anonClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { data, error } = await anonClient.auth.getUser(authHeader.slice(7));
  if (error || !data.user) return null;
  return data.user;
}

/**
 * Tells the confirmation screen whether deleting will cancel a paid
 * subscription, so the user is told before they commit rather than after.
 * Deletion is never blocked on this — see the note in POST.
 */
export async function GET(req: NextRequest) {
  const user = await authenticate(req);
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  return NextResponse.json(await getBillingDisclosure(user.email));
}

export async function POST(req: NextRequest) {
  const user = await authenticate(req);
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const uid = user.id;

  // Cancel any active Stripe subscription first. If this fails outright
  // (Stripe API/network error), abort before touching any data — better to
  // leave the account intact than delete it while still billing the person.
  // No customer or no active subscription is a normal no-op, not a failure.
  //
  // Deliberately NOT blocking deletion when a subscription exists. Forcing the
  // user out to the billing portal first splits one atomic action across two
  // systems, and anyone who abandons halfway is left with a live account they
  // asked to have deleted. Cancelling here is the safer order.
  try {
    for (const sub of await findBillingSubscriptions(user.email)) {
      await cancelSubscription(sub.id);
    }
  } catch (stripeError: any) {
    return NextResponse.json(
      { error: "Failed cancelling subscription: " + stripeError.message },
      { status: 500 }
    );
  }

  const { error: ratingsError } = await admin
    .from("professor_ratings")
    .update({ user_id: null })
    .eq("user_id", uid);
  if (ratingsError) {
    return NextResponse.json(
      { error: "Failed anonymizing ratings: " + ratingsError.message },
      { status: 500 }
    );
  }

  const { error: assignmentsError } = await admin
    .from("assignments")
    .delete()
    .eq("user_id", uid);
  if (assignmentsError) {
    return NextResponse.json(
      { error: "Failed deleting assignments: " + assignmentsError.message },
      { status: 500 }
    );
  }

  const { data: courses } = await admin
    .from("courses")
    .select("id")
    .eq("user_id", uid);
  if (courses && courses.length > 0) {
    const courseIds = courses.map((c) => c.id);
    await admin.from("grade_categories").delete().in("course_id", courseIds);
  }

  const { error: coursesError } = await admin
    .from("courses")
    .delete()
    .eq("user_id", uid);
  if (coursesError) {
    return NextResponse.json(
      { error: "Failed deleting courses: " + coursesError.message },
      { status: 500 }
    );
  }

  const { data: avatarFiles } = await admin.storage.from("avatars").list(uid);
  if (avatarFiles && avatarFiles.length > 0) {
    await admin.storage
      .from("avatars")
      .remove(avatarFiles.map((f) => uid + "/" + f.name));
  }

  const { error: profileError } = await admin
    .from("profiles")
    .delete()
    .eq("id", uid);
  if (profileError) {
    return NextResponse.json(
      { error: "Failed deleting profile: " + profileError.message },
      { status: 500 }
    );
  }

  const { error: authError } = await admin.auth.admin.deleteUser(uid);
  if (authError) {
    return NextResponse.json(
      { error: "Failed deleting auth user: " + authError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}

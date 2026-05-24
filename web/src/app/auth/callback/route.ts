import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.exchangeCodeForSession(code);

    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("university")
        .eq("id", user.id)
        .single();

      if (!profile?.university) {
        return NextResponse.redirect(`${origin}/onboarding`);
      }

      return NextResponse.redirect(`${origin}/dashboard`);
    }
  }

  return NextResponse.redirect(`${origin}/login`);
}

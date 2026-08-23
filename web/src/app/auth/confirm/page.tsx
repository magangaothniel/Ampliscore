"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

/**
 * Landing point for Google OAuth.
 *
 * Google returns here with the tokens in the URL hash. supabase-js parses that
 * hash and persists the session ASYNCHRONOUSLY, so checking getUser() once on
 * mount is a race: it frequently runs first, finds no user, and bounces to
 * /login. The session lands a moment later, which is why a second attempt
 * always worked and the first often didn't.
 *
 * So instead of asking once, wait for the session to actually appear.
 */
export default function AuthConfirmPage() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    let settled = false;

    async function routeUser(userId: string) {
      if (settled) return;
      settled = true;

      const { data: profile } = await supabase
        .from("profiles")
        .select("university")
        .eq("id", userId)
        .single();

      router.replace(profile?.university ? "/dashboard" : "/onboarding");
    }

    // Fires for INITIAL_SESSION and SIGNED_IN, so it covers both the case where
    // the session is already stored and the case where it arrives moments later.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) return;
      // Deferred: calling back into supabase-js from inside this handler can
      // deadlock the client.
      const id = session.user.id;
      setTimeout(() => routeUser(id), 0);
    });

    // Covers the case where the session was already persisted before the
    // listener attached and no further event fires.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) routeUser(session.user.id);
    });

    // Don't spin forever if the hash is missing or the token is rejected.
    const timeout = setTimeout(() => {
      if (!settled) {
        settled = true;
        router.replace("/login?error=signin_failed");
      }
    }, 10000);

    return () => {
      sub.subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [router]);

  return (
    <main className="min-h-screen bg-[#F5F3FF] flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-purple-600 font-medium">Signing you in...</p>
      </div>
    </main>
  );
}

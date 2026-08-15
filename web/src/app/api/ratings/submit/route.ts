import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { NextRequest, NextResponse } from "next/server";

const resend = new Resend(process.env.RESEND_API_KEY || "re_build_placeholder");
const ALERT_TO = "magangaothniel@gmail.com";

/**
 * Two tiers.
 *
 * REFUSE covers slurs and threats. Nothing about a class justifies them, and
 * a single one of these on a public page is the kind of thing that follows a
 * product around.
 *
 * FLAG covers language that is often just frustration but is sometimes a
 * personal attack. Those get stored and surfaced to a human rather than
 * blocked, because "this class was hell" is a legitimate thing to say and an
 * automated filter is a poor judge of which is which.
 */
const REFUSE = [
  "\\bn[i1]gg", "\\bf[a4]gg", "\\bk[i1]ke\\b", "\\bsp[i1]c\\b", "\\bch[i1]nk\\b",
  "\\btr[a4]nny\\b", "\\bret[a4]rd", "\\bc[u\\*]nt\\b",
  "kill your ?self", "\\bkys\\b", "should die", "hope (he|she|they) dies?",
  "\\brapist\\b", "\\bpedo", "\\bmolest",
];

const FLAG = [
  "\\bf[u\\*]ck", "\\bsh[i\\*]t\\b", "\\bb[i\\*]tch", "\\ba[s\\*]{2}hole",
  "\\bd[i\\*]ck\\b", "\\bidiot\\b", "\\bstupid\\b", "\\bmoron",
  "\\bhate (him|her|them|this guy)", "\\bworst human", "\\bincompetent\\b",
  "\\bracist\\b", "\\bsexist\\b", "\\bcreep\\b", "\\bpervert",
  "\\bdrunk\\b", "\\bdoes ?n.?t deserve", "\\bfired\\b",
];

function screen(text: string): { refuse: boolean; flag: boolean; reason: string } {
  const t = (text || "").toLowerCase();

  for (const p of REFUSE) {
    if (new RegExp(p, "i").test(t)) {
      return { refuse: true, flag: true, reason: "slur or threat" };
    }
  }
  const hits = FLAG.filter((p) => new RegExp(p, "i").test(t));
  if (hits.length > 0) {
    return { refuse: false, flag: true, reason: `strong language (${hits.length} match${hits.length === 1 ? "" : "es"})` };
  }
  // Shouting is not against the rules but it correlates with venting.
  const letters = (text || "").replace(/[^A-Za-z]/g, "");
  if (letters.length > 25) {
    const caps = (text.match(/[A-Z]/g) || []).length / letters.length;
    if (caps > 0.6) return { refuse: false, flag: true, reason: "written in capitals" };
  }
  return { refuse: false, flag: false, reason: "" };
}

const esc = (s: any) =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  }
  const token = authHeader.slice(7);

  const anon = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { data: { user }, error: userErr } = await anon.auth.getUser(token);
  if (userErr || !user) {
    return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  }

  let body: any;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const clean = (v: any, max: number) => String(v ?? "").slice(0, max).trim();
  const professor_name = clean(body.professor_name, 100);
  const university     = clean(body.university, 120);
  const course_code    = clean(body.course_code, 20);
  const review         = clean(body.review, 1500);
  const success_tips   = clean(body.success_tips, 800);
  const rating     = Number(body.rating);
  const difficulty = Number(body.difficulty);
  const would_take_again = Boolean(body.would_take_again);

  if (!professor_name || !university) {
    return NextResponse.json({ error: "Professor name and school are required." }, { status: 400 });
  }
  if (!(rating >= 1 && rating <= 5)) {
    return NextResponse.json({ error: "Pick a rating from 1 to 5." }, { status: 400 });
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // ---- restriction ----
  const { data: profile } = await admin
    .from("profiles")
    .select("review_restricted_until")
    .eq("id", user.id)
    .single();

  if (profile?.review_restricted_until) {
    const until = new Date(profile.review_restricted_until);
    if (until > new Date()) {
      return NextResponse.json({
        error: `A review you posted was removed for breaking our rules, so posting is paused until ${until.toLocaleDateString()}.`,
      }, { status: 403 });
    }
  }

  // ---- language ----
  const verdict = screen(`${review} ${success_tips}`);
  if (verdict.refuse) {
    return NextResponse.json({
      error: "That review contains language we do not publish. Criticise the teaching, not the person, and try again.",
    }, { status: 422 });
  }

  const { data: inserted, error } = await admin
    .from("professor_ratings")
    .insert({
      user_id: user.id,
      professor_name, university, course_code,
      rating, difficulty, review, success_tips,
      would_take_again,
      auto_flagged: verdict.flag,
      flag_reason: verdict.flag ? verdict.reason : null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: "Could not save that review." }, { status: 500 });
  }

  if (verdict.flag) {
    try {
      await resend.emails.send({
        from: "Ampliscore <alerts@ampliscore.app>",
        to: ALERT_TO,
        subject: `Flagged review: ${professor_name}`,
        html: `
          <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;max-width:520px;">
            <h2 style="color:#241A3E;font-size:17px;margin:0 0 4px 0;">A review was auto flagged</h2>
            <p style="color:#8E88A3;font-size:12px;margin:0 0 16px 0;">${esc(verdict.reason)} &middot; it is live on the site until you act</p>
            <div style="background:#F5F3FF;border-radius:8px;padding:14px;">
              <p style="color:#241A3E;font-size:14px;margin:0 0 6px 0;"><strong>${esc(professor_name)}</strong> &middot; ${esc(university)} ${course_code ? "&middot; " + esc(course_code) : ""}</p>
              <p style="color:#5B5470;font-size:14px;margin:0 0 8px 0;">${esc(review) || "<em>no written review</em>"}</p>
              ${success_tips ? `<p style="color:#5B5470;font-size:13px;margin:0;"><strong>Tips:</strong> ${esc(success_tips)}</p>` : ""}
            </div>
            <p style="color:#8E88A3;font-size:12px;margin:16px 0 0 0;">
              To remove it and restrict the author for 14 days, run this in the SQL editor:<br>
              <code>SELECT public.take_down_review('${esc(inserted.id)}', 'reason here');</code>
            </p>
          </div>`,
      });
    } catch (e) {
      console.error("Flag alert failed:", e);
    }
  }

  return NextResponse.json({ ok: true, flagged: verdict.flag });
}

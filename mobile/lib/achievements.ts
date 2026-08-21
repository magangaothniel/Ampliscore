/**
 * Badges. Mirror of web/src/lib/achievements.ts.
 *
 * Kept deliberately identical. If a badge is added or a rule changes here it
 * must change in both, or a student earns something on one platform and not
 * the other.
 */

export type Badge = {
  code: string;
  name: string;
  description: string;
  /** Emoji shown on the badge chip. */
  icon: string;
};

export const BADGES: Badge[] = [
  {
    code: "first_blood",
    name: "First Grade In",
    description: "Entered your first assignment grade.",
    icon: "🌱",
  },
  {
    code: "deans_list",
    name: "Dean's List",
    description: "Reached a 3.5 semester GPA.",
    icon: "🎓",
  },
  {
    code: "comeback",
    name: "Comeback",
    description: "Pulled a course grade up 5 points from its low.",
    icon: "📈",
  },
  {
    code: "dialed_in",
    name: "Dialed In",
    description: "Entered grades four weeks running.",
    icon: "🎯",
  },
  {
    code: "streak",
    name: "Seven Weeks",
    description: "Opened Ampliscore seven weeks in a row.",
    icon: "🔥",
  },
  {
    code: "finisher",
    name: "Finisher",
    description: "Every assignment in a course graded.",
    icon: "🏁",
  },
];

export const BADGES_BY_CODE: Record<string, Badge> = Object.fromEntries(
  BADGES.map((b) => [b.code, b])
);

/** ISO week key like "2026-W34". Weeks start Monday. */
export function isoWeek(date: Date = new Date()): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  // Thursday of the current week decides the year, per ISO 8601.
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

/** How many ISO weeks apart two week keys are. Null if either is unparseable. */
export function weeksBetween(a: string, b: string): number | null {
  const parse = (k: string) => {
    const m = /^(\d{4})-W(\d{2})$/.exec(k);
    if (!m) return null;
    // Monday of that ISO week.
    const jan4 = new Date(Date.UTC(Number(m[1]), 0, 4));
    const day = jan4.getUTCDay() || 7;
    const week1Monday = new Date(jan4);
    week1Monday.setUTCDate(jan4.getUTCDate() - day + 1);
    week1Monday.setUTCDate(week1Monday.getUTCDate() + (Number(m[2]) - 1) * 7);
    return week1Monday.getTime();
  };
  const ta = parse(a);
  const tb = parse(b);
  if (ta === null || tb === null) return null;
  return Math.round((tb - ta) / (7 * 86400000));
}

/**
 * Records that the user opened the app this week and returns the running
 * streak. Same week is a no-op, consecutive week increments, a gap resets to 1.
 * Cannot be backfilled, so every existing user starts from 1.
 */
export async function touchWeeklyStreak(supabase: any, userId: string): Promise<number> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("last_active_week, week_streak")
    .eq("id", userId)
    .single();

  if (!profile) return 0;

  const thisWeek = isoWeek();
  const last = profile.last_active_week as string | null;
  const current = Number(profile.week_streak ?? 0);

  if (last === thisWeek) return current;

  const gap = last ? weeksBetween(last, thisWeek) : null;
  const next = gap === 1 ? current + 1 : 1;

  await supabase
    .from("profiles")
    .update({ last_active_week: thisWeek, week_streak: next })
    .eq("id", userId);

  return next;
}

/**
 * Writes a course grade and keeps `lowest_grade` as the floor it has ever hit.
 * Comeback compares against this, since no grade history is stored.
 * A grade of 0 means "nothing entered yet" and is not treated as a low point.
 */
export async function persistCourseGrade(
  supabase: any,
  courseId: string,
  grade: number
): Promise<void> {
  const patch: Record<string, any> = { current_grade: grade };

  if (grade > 0) {
    const { data: course } = await supabase
      .from("courses")
      .select("lowest_grade")
      .eq("id", courseId)
      .single();

    const floor = course?.lowest_grade;
    if (floor === null || floor === undefined || grade < Number(floor)) {
      patch.lowest_grade = grade;
    }
  }

  await supabase.from("courses").update(patch).eq("id", courseId);
}

/** 4.0-scale points for a percentage. Mirrors getGradePoints on web. */
function points(grade: number): number {
  if (grade >= 93) return 4.0;
  if (grade >= 90) return 3.7;
  if (grade >= 87) return 3.3;
  if (grade >= 83) return 3.0;
  if (grade >= 80) return 2.7;
  if (grade >= 77) return 2.3;
  if (grade >= 73) return 2.0;
  if (grade >= 70) return 1.7;
  if (grade >= 67) return 1.3;
  if (grade >= 63) return 1.0;
  if (grade >= 60) return 0.7;
  return 0.0;
}

/**
 * Works out which badges the user now qualifies for and inserts the new ones.
 * Returns only the newly earned badges, so the caller can celebrate exactly
 * once. Safe to call repeatedly: the unique constraint plus ignoreDuplicates
 * makes re-earning a no-op.
 */
export async function evaluateAchievements(
  supabase: any,
  userId: string
): Promise<Badge[]> {
  const [{ data: earnedRows }, { data: courses }, { data: assignments }, { data: profile }] =
    await Promise.all([
      supabase.from("achievements").select("code").eq("user_id", userId),
      supabase.from("courses").select("id, credits, current_grade, lowest_grade").eq("user_id", userId),
      supabase.from("assignments").select("id, course_id, grade, created_at").eq("user_id", userId),
      supabase.from("profiles").select("week_streak").eq("id", userId).single(),
    ]);

  const already = new Set((earnedRows ?? []).map((r: any) => r.code));
  const qualified: string[] = [];
  const graded = (assignments ?? []).filter((a: any) => a.grade !== null && a.grade !== undefined);

  if (graded.length > 0) qualified.push("first_blood");

  // Dean's List: credit-weighted GPA across courses that have a grade.
  const scored = (courses ?? []).filter((c: any) => (c.current_grade ?? 0) > 0);
  if (scored.length > 0) {
    const credits = scored.reduce((s: number, c: any) => s + (c.credits || 3), 0);
    const quality = scored.reduce(
      (s: number, c: any) => s + points(c.current_grade) * (c.credits || 3),
      0
    );
    if (credits > 0 && quality / credits >= 3.5) qualified.push("deans_list");
  }

  // Comeback: any course now 5+ points above the floor it once hit.
  const clawedBack = (courses ?? []).some((c: any) => {
    const low = c.lowest_grade;
    if (low === null || low === undefined) return false;
    return (c.current_grade ?? 0) - Number(low) >= 5;
  });
  if (clawedBack) qualified.push("comeback");

  // Dialed In: a graded assignment entered in four consecutive ISO weeks.
  const weeks = new Set<string>(
    graded.map((a: any) => isoWeek(new Date(a.created_at)))
  );
  const sortedWeeks = Array.from(weeks).sort();
  let run = sortedWeeks.length > 0 ? 1 : 0;
  let best = run;
  for (let i = 1; i < sortedWeeks.length; i++) {
    run = weeksBetween(sortedWeeks[i - 1], sortedWeeks[i]) === 1 ? run + 1 : 1;
    best = Math.max(best, run);
  }
  if (best >= 4) qualified.push("dialed_in");

  if (Number(profile?.week_streak ?? 0) >= 7) qualified.push("streak");

  // Finisher: some course where every assignment carries a grade.
  const byCourse = new Map<string, any[]>();
  for (const a of assignments ?? []) {
    const list = byCourse.get(a.course_id) ?? [];
    list.push(a);
    byCourse.set(a.course_id, list);
  }
  const finished = Array.from(byCourse.values()).some(
    (list) => list.length >= 3 && list.every((a) => a.grade !== null && a.grade !== undefined)
  );
  if (finished) qualified.push("finisher");

  const fresh = qualified.filter((code) => !already.has(code));
  if (fresh.length === 0) return [];

  const { error } = await supabase
    .from("achievements")
    .upsert(
      fresh.map((code) => ({ user_id: userId, code })),
      { onConflict: "user_id,code", ignoreDuplicates: true }
    );

  // A failed insert shouldn't pop a celebration for something not recorded.
  if (error) return [];

  return fresh.map((code) => BADGES_BY_CODE[code]).filter(Boolean);
}

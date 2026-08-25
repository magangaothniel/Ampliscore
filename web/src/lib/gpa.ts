/**
 * GPA maths, in one place. Mirror of mobile/lib/gpa.ts.
 *
 * The 4.0 scale was previously duplicated across both apps. Any copy drifting
 * would mean two screens disagreeing about the same student's GPA, which is
 * the one number this whole product exists to get right.
 */

export type GradedCourse = { current_grade: number | null; credits: number | null }

/** Percentage to 4.0-scale points. */
export function gradePoints(pct: number): number {
  if (pct >= 93) return 4.0
  if (pct >= 90) return 3.7
  if (pct >= 87) return 3.3
  if (pct >= 83) return 3.0
  if (pct >= 80) return 2.7
  if (pct >= 77) return 2.3
  if (pct >= 73) return 2.0
  if (pct >= 70) return 1.7
  if (pct >= 67) return 1.3
  if (pct >= 63) return 1.0
  if (pct >= 60) return 0.7
  return 0.0
}

export type SemesterGpa = {
  /** Null when no course has a grade yet, which is different from a 0.00. */
  gpa: number | null
  credits: number
  qualityPoints: number
}

/** Credit-weighted GPA for this semester's graded courses. */
export function semesterGpa(courses: GradedCourse[]): SemesterGpa {
  const graded = courses.filter(c => c.current_grade !== null && c.current_grade > 0)
  const credits = graded.reduce((s, c) => s + (c.credits || 3), 0)
  const qualityPoints = graded.reduce(
    (s, c) => s + gradePoints(c.current_grade as number) * (c.credits || 3),
    0
  )
  if (graded.length === 0 || credits === 0) {
    return { gpa: null, credits: 0, qualityPoints: 0 }
  }
  return { gpa: qualityPoints / credits, credits, qualityPoints }
}

/**
 * Cumulative GPA, blending what the student earned before this semester with
 * what they are earning now:
 *
 *   (prior_gpa × prior_credits + semester quality points)
 *   ÷ (prior_credits + semester credits)
 *
 * Returns null when there is nothing to blend. Prior GPA and prior credits are
 * only meaningful together — a GPA with no credit count can't be weighted, so
 * one without the other is treated as absent.
 */
export function cumulativeGpa(
  semester: SemesterGpa,
  priorGpa: number | null | undefined,
  priorCredits: number | null | undefined
): number | null {
  const pg = typeof priorGpa === 'number' ? priorGpa : null
  const pc = typeof priorCredits === 'number' ? priorCredits : null
  if (pg === null || pc === null || pc <= 0) return null

  const totalCredits = pc + semester.credits
  if (totalCredits === 0) return null

  return (pg * pc + semester.qualityPoints) / totalCredits
}

/** Formats a GPA for display, or an em dash when there isn't one yet. */
export function formatGpa(value: number | null): string {
  return value === null ? '—' : value.toFixed(2)
}

/** Whether a typed prior GPA is usable. Matches the numeric(3,2) 0–4.0 column. */
export function isValidPriorGpa(raw: string): boolean {
  const n = Number(raw)
  return raw.trim() !== '' && Number.isFinite(n) && n >= 0 && n <= 4.0
}

/** Whether a typed credit count is usable. Matches the 0–400 column check. */
export function isValidPriorCredits(raw: string): boolean {
  const n = Number(raw)
  return raw.trim() !== '' && Number.isInteger(n) && n >= 0 && n <= 400
}

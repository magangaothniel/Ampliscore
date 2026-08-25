/**
 * Academic terms.
 *
 * The year options used to be a hardcoded list. It said 2024, 2025, 2026,
 * which meant a student in August 2026 could not add a Spring 2027 course at
 * all. Deriving the range from today means it stays correct every year without
 * anyone remembering to edit it.
 *
 * Keep identical to the copy on the other platform.
 */

export const TERMS = ['Fall', 'Spring', 'Summer'] as const
export type Term = typeof TERMS[number]

/**
 * The year an academic year begins. August through December belong to the year
 * they fall in; January through July belong to the previous one, because a
 * Spring 2027 term is part of the academic year that started in Fall 2026.
 */
export function academicStartYear(now: Date = new Date()): number {
  const y = now.getFullYear()
  return now.getMonth() >= 7 ? y : y - 1
}

/**
 * The current academic year and the next one. Two years is enough to add
 * anything a student is actually enrolled in, and it stops them backdating a
 * course to a term that has already been graded.
 */
export function availableYears(now: Date = new Date()): number[] {
  const start = academicStartYear(now)
  return [start, start + 1]
}

/** Whichever term the student is most likely adding a course for right now. */
export function currentTerm(now: Date = new Date()): Term {
  const m = now.getMonth()
  if (m <= 4) return 'Spring'   // January through May
  if (m <= 6) return 'Summer'   // June and July
  return 'Fall'                 // August through December
}

/** The year that pairs with a term inside the current academic year. */
export function defaultYearFor(term: Term, now: Date = new Date()): number {
  const start = academicStartYear(now)
  // Fall opens the academic year; Spring and Summer both fall in the calendar
  // year after it. Summer 2027 belongs to the year that began Fall 2026.
  return term === 'Fall' ? start : start + 1
}

/** Years valid for a given term, so Spring can't be paired with a past year. */
export function yearsForTerm(term: Term, now: Date = new Date()): number[] {
  const start = academicStartYear(now)
  // Fall belongs to the start year; Spring and Summer to the one after.
  // Offering both years for every term would let someone create "Spring 2026",
  // a term that has already finished.
  return term === 'Fall' ? [start, start + 1] : [start + 1, start + 2]
}

/** "Fall 2026". Falls back gracefully for older rows with no term set. */
export function formatTerm(semester?: string | null, year?: number | null): string {
  if (!semester && !year) return ''
  if (!semester) return String(year)
  if (!year) return semester
  return `${semester} ${year}`
}


/**
 * Whether a course belongs to the term being shown right now.
 *
 * A course with no term set counts as current. Existing rows were backfilled,
 * so in practice this only covers anything created between that backfill and
 * this code shipping, and counting it is safer than silently dropping a
 * student's course out of their GPA.
 */
export function isCurrentTerm(
  semester?: string | null,
  year?: number | null,
  now: Date = new Date()
): boolean {
  if (!semester && !year) return true
  return semester === currentTerm(now) && year === defaultYearFor(currentTerm(now), now)
}

/** "Fall 2026", for labelling which term a figure covers. */
export function currentTermLabel(now: Date = new Date()): string {
  const t = currentTerm(now)
  return `${t} ${defaultYearFor(t, now)}`
}

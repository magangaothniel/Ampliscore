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

export const TERMS = ['Fall', 'Spring'] as const
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
  // January through May is Spring. June and July default to Fall, since that's
  // what students are registering for over the summer.
  return m >= 0 && m <= 4 ? 'Spring' : 'Fall'
}

/** The year that pairs with a term inside the current academic year. */
export function defaultYearFor(term: Term, now: Date = new Date()): number {
  const start = academicStartYear(now)
  return term === 'Fall' ? start : start + 1
}

/** Years valid for a given term, so Spring can't be paired with a past year. */
export function yearsForTerm(term: Term, now: Date = new Date()): number[] {
  const start = academicStartYear(now)
  // Fall belongs to the start year, Spring to the one after. Offering both
  // years for both terms would let someone create "Spring 2026", a term that
  // has already finished.
  return term === 'Fall' ? [start, start + 1] : [start + 1, start + 2]
}

/** "Fall 2026". Falls back gracefully for older rows with no term set. */
export function formatTerm(semester?: string | null, year?: number | null): string {
  if (!semester && !year) return ''
  if (!semester) return String(year)
  if (!year) return semester
  return `${semester} ${year}`
}

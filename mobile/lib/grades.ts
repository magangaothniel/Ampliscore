// Single source of truth for grade display, mirroring the web app.
//
// Web deliberately uses two palettes and mobile must match both:
//   - text on white uses darker, accessible tones (globals.css --color-good/warn/bad)
//   - the progress bar fill uses brighter hexes
// Collapsing these into one function drops the amber to a 2.15:1 contrast
// ratio on white, which fails WCAG AA even for large text.

export function getLetterGrade(pct: number): string {
  if (pct >= 93) return 'A'
  if (pct >= 90) return 'A-'
  if (pct >= 87) return 'B+'
  if (pct >= 83) return 'B'
  if (pct >= 80) return 'B-'
  if (pct >= 77) return 'C+'
  if (pct >= 73) return 'C'
  if (pct >= 70) return 'C-'
  if (pct >= 67) return 'D+'
  if (pct >= 63) return 'D'
  if (pct >= 60) return 'D-'
  return 'F'
}

export function getGradeTextColor(pct: number): string {
  if (pct >= 70) return '#0A7350'
  if (pct >= 60) return '#A8500A'
  return '#BE1B1B'
}

export function getGradeBarColor(pct: number): string {
  if (pct >= 70) return '#10B981'
  if (pct >= 60) return '#F59E0B'
  return '#EF4444'
}

export function getGradeStatus(pct: number): 'on-track' | 'at-risk' | 'failing' {
  if (pct >= 70) return 'on-track'
  if (pct >= 60) return 'at-risk'
  return 'failing'
}

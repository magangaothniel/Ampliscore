/**
 * Avatar colour and initials for mobile.
 *
 * Kept deliberately identical to web/src/lib/avatar.ts. If the palette changes
 * in one place it must change in both, or the same student sees a different
 * colour on their phone than on the web.
 */

/** Every colour must carry white text legibly. */
export const AVATAR_COLORS = [
  '#7C3AED', // brand purple
  '#2563EB', // blue
  '#0891B2', // teal
  '#16A34A', // green
  '#CA8A04', // gold
  '#EA580C', // orange
  '#DC2626', // red
  '#DB2777', // pink
] as const

export const DEFAULT_AVATAR_COLOR = '#7C3AED'

/** Only palette colours are honoured; anything else falls back to brand purple. */
export function avatarColor(profile: any): string {
  const stored = profile?.avatar_color
  return (AVATAR_COLORS as readonly string[]).includes(stored)
    ? stored
    : DEFAULT_AVATAR_COLOR
}

/** First initial of the first and last name, falling back to the email. */
export function avatarInitials(profile: any, email?: string): string {
  const name = String(profile?.full_name ?? '').trim()
  if (name) {
    const parts = name.split(/\s+/)
    const first = parts[0]?.[0] ?? ''
    const last = parts.length > 1 ? parts[parts.length - 1][0] : ''
    return (first + last).toUpperCase()
  }
  const fallback = String(profile?.email ?? email ?? '').trim()
  return fallback ? fallback[0].toUpperCase() : 'U'
}

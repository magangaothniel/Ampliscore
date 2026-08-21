/**
 * Avatar colour and initials, in one place.
 *
 * The fallback avatar previously existed in three copies (NavBar, profile page,
 * mobile ProfileScreen) and had already drifted — NavBar used purple-600 while
 * the profile page used brand-600, so the same user had two different avatars
 * depending on the screen.
 */

/** Every colour must carry white text legibly. */
export const AVATAR_COLORS = [
  "#7C3AED", // brand purple
  "#2563EB", // blue
  "#0891B2", // teal
  "#16A34A", // green
  "#CA8A04", // gold
  "#EA580C", // orange
  "#DC2626", // red
  "#DB2777", // pink
] as const;

export const DEFAULT_AVATAR_COLOR = "#7C3AED";

/**
 * Only colours from the palette are honoured. A value that isn't in the list
 * falls back to brand purple rather than being trusted into a style attribute.
 */
export function avatarColor(profile: any): string {
  const stored = profile?.avatar_color;
  return (AVATAR_COLORS as readonly string[]).includes(stored)
    ? stored
    : DEFAULT_AVATAR_COLOR;
}

/** First initial of the first and last name, falling back to the email. */
export function avatarInitials(profile: any, email?: string): string {
  const name = String(profile?.full_name ?? "").trim();
  if (name) {
    const parts = name.split(/\s+/);
    const first = parts[0]?.[0] ?? "";
    const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
    return (first + last).toUpperCase();
  }
  const fallback = String(profile?.email ?? email ?? "").trim();
  return fallback ? fallback[0].toUpperCase() : "U";
}

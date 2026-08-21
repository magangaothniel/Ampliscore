"use client";

import { avatarColor, avatarInitials } from "@/lib/avatar";

/**
 * Sizing is inline rather than Tailwind classes on purpose. Tailwind builds its
 * stylesheet by scanning source text, so a class assembled at runtime like
 * `w-${size}` is never generated and silently renders at zero.
 */
export default function Avatar({
  profile,
  size = 32,
  email,
  className = "",
}: {
  profile: any;
  size?: number;
  email?: string;
  className?: string;
}) {
  const dimension = { width: size, height: size };

  if (profile?.avatar_url) {
    return (
      <img
        src={profile.avatar_url}
        alt="Profile"
        style={dimension}
        className={`rounded-full object-cover ${className}`}
      />
    );
  }

  return (
    <div
      style={{
        ...dimension,
        backgroundColor: avatarColor(profile),
        fontSize: Math.round(size * 0.4),
      }}
      className={`rounded-full flex items-center justify-center text-white font-medium select-none ${className}`}
    >
      {avatarInitials(profile, email)}
    </div>
  );
}

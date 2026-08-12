import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Calendar",
  description: "See every assignment and exam due date in one place, with email reminders 24 hours before.",
  openGraph: {
    title: "Calendar | Ampliscore",
    description: "See every assignment and exam due date in one place, with email reminders 24 hours before.",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Calendar | Ampliscore",
    description: "See every assignment and exam due date in one place, with email reminders 24 hours before.",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

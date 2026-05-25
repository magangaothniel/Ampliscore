import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "See your current GPA, active courses, and at-risk alerts all in one place.",
  openGraph: {
    title: "Dashboard | Ampliscore",
    description: "See your current GPA, active courses, and at-risk alerts all in one place.",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Dashboard | Ampliscore",
    description: "See your current GPA, active courses, and at-risk alerts all in one place.",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

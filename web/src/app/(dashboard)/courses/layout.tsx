import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "My Courses",
  description: "Track grades across all your courses and stay on top of your academic performance.",
  openGraph: {
    title: "My Courses | Ampliscore",
    description: "Track grades across all your courses and stay on top of your academic performance.",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "My Courses | Ampliscore",
    description: "Track grades across all your courses and stay on top of your academic performance.",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

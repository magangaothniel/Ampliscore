import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "GPA Planner",
  description: "Run what-if grade scenarios and plan your path to your target GPA.",
  openGraph: {
    title: "GPA Planner | Ampliscore",
    description: "Run what-if grade scenarios and plan your path to your target GPA.",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "GPA Planner | Ampliscore",
    description: "Run what-if grade scenarios and plan your path to your target GPA.",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Professor Ratings",
  description: "Find honest professor ratings from real students at your university.",
  openGraph: {
    title: "Professor Ratings | Ampliscore",
    description: "Find honest professor ratings from real students at your university.",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Professor Ratings | Ampliscore",
    description: "Find honest professor ratings from real students at your university.",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

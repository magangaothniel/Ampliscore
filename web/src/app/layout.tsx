import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Ampliscore — Know where you stand",
    template: "%s | Ampliscore",
  },
  description: "Track your grades, predict your final score, find the best professors, and plan your GPA — all in one place. Free for US college students.",
  keywords: ["grade tracker", "GPA calculator", "college grades", "professor ratings", "GPA planner", "student app"],
  metadataBase: new URL("https://ampliscore.vercel.app"),
  openGraph: {
    type: "website",
    siteName: "Ampliscore",
    title: "Ampliscore — Know where you stand",
    description: "Track your grades, predict your final score, find the best professors, and plan your GPA — all in one place.",
    url: "https://ampliscore.vercel.app",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Ampliscore — Know where you stand" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Ampliscore — Know where you stand",
    description: "Track your grades, predict your final score, find the best professors, and plan your GPA.",
    images: ["/og-image.png"],
  },
  icons: {
    icon: "/icon.png",
    apple: "/icon.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans antialiased" style={{ fontFamily: "var(--font-inter), sans-serif" }}>
        {children}
      </body>
    </html>
  );
}

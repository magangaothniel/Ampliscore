import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "700"],
  variable: "--font-space-grotesk",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Ampliscore — Know where you stand",
    template: "%s | Ampliscore",
  },
  description: "Track your grades, predict your final score, find the best professors, and plan your GPA — all in one place. Free for US college students.",
  keywords: ["grade tracker", "GPA calculator", "college grades", "professor ratings", "GPA planner", "student app"],
  metadataBase: new URL("https://ampliscore.app"),
  openGraph: {
    type: "website",
    siteName: "Ampliscore",
    title: "Ampliscore — Know where you stand",
    description: "Track your grades, predict your final score, find the best professors, and plan your GPA — all in one place.",
    url: "https://ampliscore.app",
    images: [{ url: "/api/og", width: 1200, height: 630, alt: "Ampliscore — Know where you stand" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Ampliscore — Know where you stand",
    description: "Track your grades, predict your final score, find the best professors, and plan your GPA.",
    images: ["/api/og"],
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon-96x96.png", sizes: "96x96", type: "image/png" },
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${spaceGrotesk.variable}`}>
      <body className="font-sans antialiased">
        {children}
      </body>
    </html>
  );
}

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Join the waitlist · Ampliscore",
  description:
    "Ampliscore is coming to iPhone and Android. Join the waitlist and we will email you a download link the day it launches.",
  openGraph: {
    title: "Get Ampliscore first",
    description:
      "Live GPA tracking for college students, coming to iPhone and Android.",
    url: "https://ampliscore.app/waitlist",
  },
};

export default function WaitlistLayout({ children }: { children: React.ReactNode }) {
  return children;
}

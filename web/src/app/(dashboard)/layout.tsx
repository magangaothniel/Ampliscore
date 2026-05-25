"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import NavBar from "@/components/NavBar";
import GuidedTour from "@/components/GuidedTour";
import TermsGate from "@/components/TermsGate";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<any>(null);
  const fetchProfile = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
    setProfile({ ...data, email: user.email });
  };
  useEffect(() => {
    fetchProfile();
    window.addEventListener("profile-updated", fetchProfile);
    return () => window.removeEventListener("profile-updated", fetchProfile);
  }, []);
  return (
    <div className="min-h-screen bg-[#F5F3FF]">
      <NavBar profile={profile} />
      <GuidedTour profile={profile} />
      <TermsGate profile={profile} />
      {children}
    </div>
  );
}

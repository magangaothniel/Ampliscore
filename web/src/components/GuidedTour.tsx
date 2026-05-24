"use client";
import { useEffect } from "react";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";
import { createClient } from "@/lib/supabase";

export default function GuidedTour({ profile }: { profile: any }) {
  useEffect(() => {
    if (!profile || profile.has_taken_tour) return;
    const driverObj = driver({
      showProgress: true,
      animate: true,
      overlayOpacity: 0.6,
      smoothScroll: true,
      allowClose: true,
      progressText: "{{current}} of {{total}}",
      nextBtnText: "Next →",
      prevBtnText: "← Back",
      doneBtnText: "Let's go! 🚀",
      steps: [
        { element: "#tour-navbar", popover: { title: "👋 Welcome to Ampliscore!", description: "This is your navigation bar. Use it to jump between any section of the app.", side: "bottom", align: "start" } },
        { element: "#tour-dashboard", popover: { title: "📊 Your Dashboard", description: "See your overall GPA, at-risk courses, and a summary of all your classes at a glance.", side: "bottom", align: "start" } },
        { element: "#tour-courses", popover: { title: "📚 Courses", description: "Add your courses here. Track grades by category with weighted averages calculated automatically.", side: "bottom", align: "start" } },
        { element: "#tour-professors", popover: { title: "⭐ Professor Ratings", description: "Rate your professors and see honest reviews from other students at your university.", side: "bottom", align: "start" } },
        { element: "#tour-gpa", popover: { title: "�� GPA Planner", description: "Run what-if scenarios. See exactly what grades you need to hit your GPA goal.", side: "bottom", align: "start" } },
        { element: "#tour-profile", popover: { title: "👤 Your Profile", description: "Upload a profile picture and manage your account settings here.", side: "bottom", align: "end" } },
      ],
      onDestroyStarted: async () => {
        driverObj.destroy();
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) await supabase.from("profiles").update({ has_taken_tour: true }).eq("id", user.id);
      },
    });
    const timer = setTimeout(() => driverObj.drive(), 800);
    return () => clearTimeout(timer);
  }, [profile]);
  return null;
}

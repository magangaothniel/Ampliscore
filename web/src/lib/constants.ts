export const BRAND = {
  name: "Ampliscore",
  tagline: "Know where you stand",
  colors: {
    purple: "#7C3AED",
    purpleLight: "#DDD6FE",
    purpleBg: "#F5F3FF",
    green: "#10B981",
    amber: "#F59E0B",
    red: "#EF4444",
    dark: "#1E1040",
  },
};

export const GRADE_THRESHOLDS = {
  PASSING: 70,
  AT_RISK: 60,
};

export const PLANS = {
  FREE: {
    name: "Free",
    price: 0,
    maxCourses: 4,
    features: [
      "Track up to 4 classes",
      "Basic grade calculator",
      "Professor ratings",
    ],
  },
  PRO: {
    name: "Pro",
    price: 4.99,
    maxCourses: Infinity,
    features: [
      "Unlimited classes",
      "AI grade predictor",
      "GPA what-if planner",
      "At-risk alerts",
      "Transcript tracker",
    ],
  },
};

export const NAV_LINKS = [
  { label: "Dashboard", href: "/dashboard", icon: "LayoutDashboard" },
  { label: "Courses", href: "/courses", icon: "BookOpen" },
  { label: "Professors", href: "/professors", icon: "Star" },
  { label: "GPA Planner", href: "/gpa", icon: "Calculator" },
];

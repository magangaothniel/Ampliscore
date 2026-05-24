"use client";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase";

function Logo() {
  return (
    <svg width="32" height="32" viewBox="0 0 36 36" fill="none">
      <rect width="36" height="36" rx="10" fill="#EDE9FE"/>
      <circle cx="18" cy="18" r="9" fill="none" stroke="#7C3AED" strokeWidth="2"/>
      <circle cx="18" cy="18" r="5" fill="#DDD6FE"/>
      <circle cx="18" cy="18" r="2.5" fill="#7C3AED"/>
      <line x1="18" y1="9" x2="18" y2="12" stroke="#7C3AED" strokeWidth="1.8" strokeLinecap="round"/>
      <line x1="18" y1="24" x2="18" y2="27" stroke="#7C3AED" strokeWidth="1.8" strokeLinecap="round"/>
      <line x1="9" y1="18" x2="12" y2="18" stroke="#7C3AED" strokeWidth="1.8" strokeLinecap="round"/>
      <line x1="24" y1="18" x2="27" y2="18" stroke="#7C3AED" strokeWidth="1.8" strokeLinecap="round"/>
      <line x1="13" y1="13" x2="15.5" y2="15.5" stroke="#7C3AED" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

const NAV_LINKS = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Courses", href: "/courses" },
  { label: "Professors", href: "/professors" },
  { label: "GPA Planner", href: "/gpa" },
];

export default function NavBar({ profile }: { profile: any }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  };

  return (
    <nav className="bg-white border-b border-purple-100 px-4 md:px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Logo */}
        <Link href="/dashboard" className="flex items-center gap-2.5 flex-shrink-0">
          <Logo />
          <span className="text-lg font-medium text-[#1E1040]">ampli<span className="text-purple-600">score</span></span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-6">
          {NAV_LINKS.map(link => (
            <Link key={link.href} href={link.href}
              className={`text-sm font-medium transition-colors ${pathname === link.href ? "text-purple-600" : "text-purple-900/50 hover:text-purple-600"}`}>
              {link.label}
            </Link>
          ))}
          {!profile?.is_pro && (
            <Link href="/upgrade" className="text-sm bg-purple-600 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-purple-700 transition-colors">
              ⚡ Upgrade
            </Link>
          )}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {/* Profile dropdown - desktop */}
          <div className="relative hidden md:block" ref={dropdownRef}>
            <button onClick={() => setDropdownOpen(!dropdownOpen)}
              className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white text-xs font-medium hover:bg-purple-700 transition-colors">
              {profile?.full_name?.charAt(0)?.toUpperCase() || "U"}
            </button>
            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl border border-purple-100 shadow-lg z-50 overflow-hidden">
                <div className="px-4 py-3 border-b border-purple-50">
                  <div className="text-sm font-medium text-[#1E1040]">{profile?.full_name || "Student"}</div>
                  <div className="text-xs text-purple-900/40 mt-0.5">{profile?.email}</div>
                </div>
                <div className="py-1">
                  <Link href="/profile" onClick={() => setDropdownOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-[#1E1040] hover:bg-purple-50">
                    👤 Account settings
                  </Link>
                  {!profile?.is_pro && (
                    <Link href="/upgrade" onClick={() => setDropdownOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-purple-600 font-medium hover:bg-purple-50">
                      ⚡ Upgrade to Pro
                    </Link>
                  )}
                </div>
                <div className="border-t border-purple-50">
                  <button onClick={handleSignOut} className="flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 w-full text-left">
                    🚪 Sign out
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Hamburger - mobile */}
          <button onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden flex flex-col gap-1.5 p-2">
            <span className={`block w-5 h-0.5 bg-[#1E1040] transition-all ${menuOpen ? "rotate-45 translate-y-2" : ""}`} />
            <span className={`block w-5 h-0.5 bg-[#1E1040] transition-all ${menuOpen ? "opacity-0" : ""}`} />
            <span className={`block w-5 h-0.5 bg-[#1E1040] transition-all ${menuOpen ? "-rotate-45 -translate-y-2" : ""}`} />
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden mt-4 pb-2 border-t border-purple-50 pt-4 space-y-1">
          {/* User info */}
          <div className="flex items-center gap-3 px-2 pb-3 mb-2 border-b border-purple-50">
            <div className="w-9 h-9 rounded-full bg-purple-600 flex items-center justify-center text-white text-sm font-medium">
              {profile?.full_name?.charAt(0)?.toUpperCase() || "U"}
            </div>
            <div>
              <div className="text-sm font-medium text-[#1E1040]">{profile?.full_name || "Student"}</div>
              <div className="text-xs text-purple-900/40">{profile?.university || "No university set"}</div>
            </div>
          </div>

          {NAV_LINKS.map(link => (
            <Link key={link.href} href={link.href} onClick={() => setMenuOpen(false)}
              className={`flex items-center px-2 py-2.5 rounded-xl text-sm font-medium transition-colors ${pathname === link.href ? "bg-purple-50 text-purple-600" : "text-[#1E1040] hover:bg-purple-50"}`}>
              {link.label}
            </Link>
          ))}

          {!profile?.is_pro && (
            <Link href="/upgrade" onClick={() => setMenuOpen(false)}
              className="flex items-center px-2 py-2.5 rounded-xl text-sm font-medium text-purple-600 bg-purple-50">
              ⚡ Upgrade to Pro — $4.99/mo
            </Link>
          )}

          <div className="pt-2 border-t border-purple-50 mt-2 space-y-1">
            <Link href="/profile" onClick={() => setMenuOpen(false)}
              className="flex items-center px-2 py-2.5 rounded-xl text-sm text-[#1E1040] hover:bg-purple-50">
              👤 Account settings
            </Link>
            <button onClick={handleSignOut}
              className="flex items-center w-full px-2 py-2.5 rounded-xl text-sm text-red-500 hover:bg-red-50">
              🚪 Sign out
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}

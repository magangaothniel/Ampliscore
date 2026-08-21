"use client";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { invalidateAll } from "@/lib/cache";
import Avatar from "@/components/Avatar";

function Logo() {
  return (
    <svg aria-hidden="true" width="32" height="32" viewBox="0 0 64 64" fill="none">
      <defs>
        <linearGradient id="capG" gradientUnits="userSpaceOnUse" x1="0" y1="64" x2="64" y2="0">
          <stop offset="0" stopColor="#5B21B6" />
          <stop offset="1" stopColor="#7C3AED" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill="#EDE9FE" />
      <g transform="translate(32,34) scale(0.78) translate(-32,-29)">
        <path d="M32 11 L59 23.5 L32 36 L5 23.5 Z" stroke="url(#capG)" strokeWidth="4.6" strokeLinejoin="round" />
        <path d="M16.5 29 L16.5 41.5 C16.5 46.8 47.5 46.8 47.5 41.5 L47.5 29" stroke="url(#capG)" strokeWidth="4.6" strokeLinecap="round" />
        <path d="M59 23.5 L59 43" stroke="url(#capG)" strokeWidth="5.5" strokeLinecap="round" />
        <circle cx="59" cy="45.6" r="4.9" fill="#7C3AED" />
      </g>
    </svg>
  );
}

const NAV_LINKS = [
  { label: "Dashboard", href: "/dashboard", id: "tour-dashboard" },
  { label: "Courses", href: "/courses", id: "tour-courses" },
  { label: "Professors", href: "/professors", id: "tour-professors" },
  { label: "Calendar", href: "/calendar", id: "tour-calendar" },
  { label: "GPA Planner", href: "/gpa", id: "tour-gpa" },
];

const ADMIN_LINK = { label: "Admin", href: "/admin", id: "nav-admin" };

export default function NavBar({ profile }: { profile: any }) {
  const links = profile?.is_admin ? [...NAV_LINKS, ADMIN_LINK] : NAV_LINKS;
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
    invalidateAll();
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  };

  return (
    <nav id="tour-navbar" className="bg-white border-b border-purple-100 px-4 md:px-6 py-4">
      <div className="flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2.5 flex-shrink-0">
          <Logo />
          <span className="text-lg font-medium text-ink-900">ampli<span className="text-purple-600">score</span></span>
        </Link>
        <div className="hidden md:flex items-center gap-6">
          {links.map(link => (
            <Link key={link.href} href={link.href} id={link.id}
              className={`text-sm font-medium transition-colors ${pathname === link.href ? "text-purple-600" : "text-ink-600 hover:text-purple-600"}`}>
              {link.label}
            </Link>
          ))}
          {!profile?.is_pro && (
            <Link href="/upgrade" className="text-sm bg-purple-600 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-purple-700 transition-colors">
               Upgrade
            </Link>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div id="tour-profile" className="relative hidden md:block" ref={dropdownRef}>
            <button onClick={() => setDropdownOpen(!dropdownOpen)} className="hover:opacity-80 transition-opacity">
              <Avatar profile={profile} />
            </button>
            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl border border-purple-100 shadow-lg z-50 overflow-hidden">
                <div className="px-4 py-3 border-b border-purple-50 flex items-center gap-3">
                  <Avatar profile={profile} size={40} />
                  <div>
                    <div className="text-sm font-medium text-ink-900">{profile?.full_name || "Student"}</div>
                    <div className="text-xs text-ink-400 mt-0.5 truncate max-w-[140px]">{profile?.email}</div>
                  </div>
                </div>
                <div className="py-1">
                  <Link href="/profile" onClick={() => setDropdownOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-ink-900 hover:bg-purple-50">
                     Profile
                  </Link>
                  <Link href="/settings" onClick={() => setDropdownOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-ink-900 hover:bg-purple-50">
                     Settings
                  </Link>
                  <Link href="/help" onClick={() => setDropdownOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-ink-900 hover:bg-purple-50">
                     Help &amp; support
                  </Link>
                  {!profile?.is_pro && (
                    <Link href="/upgrade" onClick={() => setDropdownOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-purple-600 font-medium hover:bg-purple-50">
                       Upgrade to Pro
                    </Link>
                  )}
                </div>
                <div className="border-t border-purple-50">
                  <button onClick={handleSignOut} className="flex items-center gap-3 px-4 py-2.5 text-sm text-bad hover:bg-red-50 w-full text-left">
                     Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
          <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden flex flex-col gap-1.5 p-2">
            <span className={`block w-5 h-0.5 bg-[#1E1040] transition-all ${menuOpen ? "rotate-45 translate-y-2" : ""}`} />
            <span className={`block w-5 h-0.5 bg-[#1E1040] transition-all ${menuOpen ? "opacity-0" : ""}`} />
            <span className={`block w-5 h-0.5 bg-[#1E1040] transition-all ${menuOpen ? "-rotate-45 -translate-y-2" : ""}`} />
          </button>
        </div>
      </div>
      {menuOpen && (
        <div className="md:hidden mt-4 pb-2 border-t border-purple-50 pt-4 space-y-1">
          <div className="flex items-center gap-3 px-2 pb-3 mb-2 border-b border-purple-50">
            <Avatar profile={profile} size={40} />
            <div>
              <div className="text-sm font-medium text-ink-900">{profile?.full_name || "Student"}</div>
              <div className="text-xs text-ink-400">{profile?.university || "No university set"}</div>
            </div>
          </div>
          {links.map(link => (
            <Link key={link.href} href={link.href} onClick={() => setMenuOpen(false)}
              className={`flex items-center px-2 py-2.5 rounded-xl text-sm font-medium transition-colors ${pathname === link.href ? "bg-purple-50 text-purple-600" : "text-ink-900 hover:bg-purple-50"}`}>
              {link.label}
            </Link>
          ))}
          {!profile?.is_pro && (
            <Link href="/upgrade" onClick={() => setMenuOpen(false)} className="flex items-center px-2 py-2.5 rounded-xl text-sm font-medium text-purple-600 bg-purple-50">
               Upgrade to Pro — $4.99/mo
            </Link>
          )}
          <div className="pt-2 border-t border-purple-50 mt-2 space-y-1">
            <Link href="/profile" onClick={() => setMenuOpen(false)} className="flex items-center px-2 py-2.5 rounded-xl text-sm text-ink-900 hover:bg-purple-50"> Profile
            </Link>
            <Link href="/settings" onClick={() => setMenuOpen(false)} className="flex items-center px-2 py-2.5 rounded-xl text-sm text-ink-900 hover:bg-purple-50">
               Settings
            </Link>
            <Link href="/help" onClick={() => setMenuOpen(false)} className="flex items-center px-2 py-2.5 rounded-xl text-sm text-ink-900 hover:bg-purple-50">
               Help &amp; support
            </Link>
            <button onClick={handleSignOut} className="flex items-center w-full px-2 py-2.5 rounded-xl text-sm text-bad hover:bg-red-50">
               Sign out
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}

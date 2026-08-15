import type { NextConfig } from "next";

const SUPABASE = "https://zykldxurxazvcatvfxkd.supabase.co";

// Scripts stay 'unsafe-inline' because Next injects inline hydration scripts.
// Locking that down needs nonces and middleware, which is a bigger change than
// it is worth right now. The directives that actually stop clickjacking, plugin
// injection and base-tag hijacking are all strict.
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: https://lh3.googleusercontent.com ${SUPABASE}`,
  "font-src 'self' data:",
  `connect-src 'self' ${SUPABASE} wss://zykldxurxazvcatvfxkd.supabase.co https://api.anthropic.com https://api.stripe.com`,
  "frame-src https://js.stripe.com https://hooks.stripe.com",
  "form-action 'self' https://checkout.stripe.com https://accounts.google.com",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "upgrade-insecure-requests",
].join("; ");

const nextConfig: NextConfig = {
  poweredByHeader: false,

  async redirects() {
    return [
      { source: "/wishlist", destination: "/waitlist", permanent: false },
      { source: "/join", destination: "/waitlist", permanent: false },
    ];
  },

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
          { key: "X-DNS-Prefetch-Control", value: "on" },
        ],
      },
    ];
  },
};

export default nextConfig;

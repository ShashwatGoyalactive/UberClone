import type { NextConfig } from "next";

/**
 * Cache Components is off on purpose. Nearly every screen in Comet is
 * per-user and live (a ride, a wallet, a Pilot's offers), so the static
 * shell it optimises for would be almost empty, and every session read
 * would need its own Suspense boundary to build at all. Krama made the
 * same call.
 *
 * Response headers follow Krama's, widened only for the origins Comet
 * genuinely talks to from the browser:
 *
 *   connect-src  Supabase (REST for auth, wss for Realtime), Mapbox
 *                (tiles, styles, telemetry), Razorpay checkout.
 *   script-src   'unsafe-inline' for the blocking theme script in
 *                <head>; Razorpay's checkout script is loaded from its
 *                own origin when the wallet top-up opens.
 *   worker-src   blob: because Mapbox GL runs its tile parsing in a
 *                web worker created from a blob URL.
 *   img-src      Mapbox tiles and sprites arrive as https and blob:.
 *   frame-src    Razorpay renders checkout in an iframe.
 *   geolocation  allowed for this origin only — the map needs it.
 */
const dev = process.env.NODE_ENV === "development";
const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseWs = supabase.replace(/^http/, "ws");

const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' https://checkout.razorpay.com${dev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  [
    "connect-src 'self'",
    supabase,
    supabaseWs,
    "https://api.mapbox.com https://events.mapbox.com",
    "https://*.razorpay.com",
    dev ? "ws: wss:" : "",
  ]
    .filter(Boolean)
    .join(" "),
  "worker-src 'self' blob:",
  "frame-src https://api.razorpay.com https://checkout.razorpay.com",
  "form-action 'self'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  ...(dev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const nextConfig: NextConfig = {
  poweredByHeader: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(self), payment=(self)",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains",
          },
        ],
      },
    ];
  },
};

export default nextConfig;

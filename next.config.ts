import type { NextConfig } from "next";

// Where the Next.js SERVER reaches the Supabase gateway. Campus mode:
// localhost gateway (port from SUPABASE_INTERNAL_URL, default 54321).
// Cloud mode (Vercel): leave SUPABASE_INTERNAL_URL unset - rewrites are not
// needed there because NEXT_PUBLIC_SUPABASE_URL is then an absolute URL.
const INTERNAL = process.env.SUPABASE_INTERNAL_URL ?? "http://localhost:54321";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["pdf-parse"],
  // SINGLE-PORT ACCESS: students only ever need the app port. The browser's
  // Supabase client uses the RELATIVE url /supa (see env.campus.template), and
  // these rewrites forward it to the real gateway on localhost. This also
  // makes the build IP-independent - the college WiFi IP can change freely.
  async rewrites() {
    return [
      { source: "/supa/auth/v1/:path*", destination: `${INTERNAL}/auth/v1/:path*` },
      { source: "/supa/rest/v1/:path*", destination: `${INTERNAL}/rest/v1/:path*` },
      { source: "/supa/storage/v1/:path*", destination: `${INTERNAL}/storage/v1/:path*` },
      { source: "/supa/functions/v1/:path*", destination: `${INTERNAL}/functions/v1/:path*` },
    ];
  },
  webpack: (config) => {
    config.resolve.alias.canvas = false;
    return config;
  },
};

export default nextConfig;

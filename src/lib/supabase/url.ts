// Which URL the Next.js SERVER uses to reach Supabase in a server-side fetch.
//
// Campus mode: the browser gets NEXT_PUBLIC_SUPABASE_URL = "/supa" (relative,
// same-origin, forwarded to the real gateway by next.config rewrites). That
// makes the whole site work from ONE open port and survives college WiFi IP
// changes. But Node fetch cannot resolve a relative URL, so server-side code
// (API routes, middleware, RSC) uses SUPABASE_INTERNAL_URL instead -
// http://localhost:54321 in campus mode.
//
// Cloud mode (Vercel): SUPABASE_INTERNAL_URL is unset, so this falls back to
// the absolute NEXT_PUBLIC_SUPABASE_URL and behaves exactly as before.

export function supabaseUrlForServer(): string {
    return (
        process.env.SUPABASE_INTERNAL_URL ||
        process.env.NEXT_PUBLIC_SUPABASE_URL ||
        ""
    );
}

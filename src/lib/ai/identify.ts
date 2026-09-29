// Identify the caller of an API route for rate limiting.
// Preference order: authenticated Supabase user id -> client IP.

import { createClient } from "@/lib/supabase/server";

export async function requestIdentifier(req?: Request): Promise<string> {
    try {
        const supabase = await createClient();
        const {
            data: { user },
        } = await supabase.auth.getUser();
        if (user?.id) return `user:${user.id}`;
    } catch {
        // fall through to IP
    }
    return req ? `ip:${clientIp(req)}` : "ip:unknown";
}

/** Best-effort client IP from proxy headers (Vercel / Cloudflare). */
export function clientIp(req: Request): string {
    const fwd = req.headers.get("x-forwarded-for");
    if (fwd) return fwd.split(",")[0].trim();
    return req.headers.get("cf-connecting-ip") || "unknown";
}
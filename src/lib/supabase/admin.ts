// Service-role Supabase client for admin operations (account deletion).
//
// The service-role key bypasses RLS and must ONLY be used server-side, never
// imported from client components. On Vercel set SUPABASE_SERVICE_ROLE_KEY
// from Supabase Studio -> Settings -> API (or, on self-hosted Supabase, the
// `service_role` secret inside server/supabase/docker/.env).

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { supabaseUrlForServer } from "./url";

let cached: ReturnType<typeof createSupabaseClient> | null = null;

export function createAdminClient() {
    const url = supabaseUrlForServer();
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !serviceKey) {
        throw new Error(
            "SUPABASE_SERVICE_ROLE_KEY is not configured - account deletion is unavailable."
        );
    }
    if (!cached) {
        cached = createSupabaseClient(url, serviceKey, {
            auth: { autoRefreshToken: false, persistSession: false },
        });
    }
    return cached;
}

// POST /api/account/delete - delete the signed-in user's account and data.
//
// Backs the promise made on /privacy ("delete everything, no email required").
// Flow:
//   1. must be authenticated (anon callers get 401)
//   2. server-side password re-confirmation (CSRF protection - a drive-by page
//      cannot delete your account without knowing the password)
//   3. deletes all owned rows + the auth user via the SQL function
//      public.delete_user_data (schema.sql)
//   4. signs the (now-deleted) session out client-side via cookies
//
// Rate limited (3 per 10 minutes) because failures here are scary by design.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { newRequestId, logEvent, logError } from "@/lib/obs/request-id";

export const runtime = "nodejs";

// plain in-memory limiter reuse: 3 deletions / 10 min per identifier
const WINDOW_MS = 10 * 60_000;
const deleteHits = new Map<string, number[]>();
function limitDeletes(key: string): boolean {
    const now = Date.now();
    const window = (deleteHits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
    if (window.length >= 3) {
        deleteHits.set(key, window);
        return false;
    }
    window.push(now);
    deleteHits.set(key, window);
    return true;
}

export async function POST(request: NextRequest) {
    const requestId = newRequestId();

    try {
        const { email, password } = (await request.json()) as {
            email?: string;
            password?: string;
        };
        if (!email || !password) {
            return NextResponse.json(
                { error: "Email and password are required to confirm deletion." },
                { status: 400 }
            );
        }

        const supabase = await createClient();
        const {
            data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: "Not signed in." }, { status: 401 });
        }

        if (!limitDeletes(`user:${user.id}`)) {
            return NextResponse.json(
                { error: "Too many deletion attempts - try again later." },
                { status: 429, headers: { "Retry-After": "600" } }
            );
        }

        // Re-authenticate with the supplied credentials (also validates that
        // `email` really belongs to this account).
        const { error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password,
        });
        if (signInError) {
            logEvent(requestId, "delete.confirm_failed", { userId: user.id });
            return NextResponse.json(
                { error: "Incorrect email or password - nothing was deleted." },
                { status: 403 }
            );
        }

        const admin = createAdminClient();

        // 1. delete avatar files via the Storage API (direct SQL deletes on
        //    storage.tables are blocked by supabase storage by design)
        try {
            const { data: files } = await admin.storage.from("avatars").list(user.id);
            if (files && files.length > 0) {
                await admin.storage
                    .from("avatars")
                    .remove(files.map((f) => `${user.id}/${f.name}`));
            }
        } catch {
            // storage cleanup is best-effort; account deletion continues
        }

        // 2. wipe owned rows + the auth user (SECURITY DEFINER SQL function)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- rpc not in generated types yet
        const { error: rpcError } = await (admin as any).rpc("delete_user_data", {
            target: user.id,
        });
        if (rpcError) {
            logError(requestId, "delete.rpc_failed", rpcError, { userId: user.id });
            return NextResponse.json(
                { error: "Deletion failed - please contact the administrators." },
                { status: 500 }
            );
        }

        // 3. clear the session cookies (user row is gone; local session is stale)
        await supabase.auth.signOut();

        logEvent(requestId, "delete.success", { userId: user.id });
        return NextResponse.json({ ok: true });
    } catch (error: unknown) {
        logError(requestId, "delete.unhandled", error);
        return NextResponse.json({ error: "Unexpected error." }, { status: 500 });
    }
}

// Auth Callback Route - Handles OAuth redirects and checks onboarding status

import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get("code");

    if (code) {
        const supabase = await createClient();
        const { error, data } = await supabase.auth.exchangeCodeForSession(code);

        if (!error && data.user) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data: profile } = await (supabase as any)
                .from("profiles")
                .select("onboarding_complete, role")
                .eq("id", data.user.id)
                .single() as { data: { onboarding_complete: boolean, role: string } | null };

            if (profile?.role === 'teacher') {
                return NextResponse.redirect(`${origin}/teacher/dashboard`);
            }

            if (profile?.onboarding_complete) {
                return NextResponse.redirect(`${origin}/profile`);
            } else {
                return NextResponse.redirect(`${origin}/onboarding/career`);
            }
        }
    }

    // Return the user to an error page with instructions
    return NextResponse.redirect(`${origin}/login?error=auth_code_error`);
}

import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function GET(request: NextRequest) {
    let response = NextResponse.json({ success: true, message: "Role updated to teacher" });

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) =>
                        request.cookies.set(name, value)
                    );
                },
            },
        }
    );

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: "Not logged in" }, { status: 401 });
    }

    // Update their own profile to teacher (allowed by RLS because auth.uid() = id)
    const { error } = await supabase
        .from("profiles")
        .update({ role: "teacher" })
        .eq("id", user.id);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Also update user metadata just to be thorough
    await supabase.auth.updateUser({
        data: { role: "teacher" }
    });

    return NextResponse.redirect(new URL("/teacher", request.url));
}

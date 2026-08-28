import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
    try {
        const { session_id } = await request.json();

        if (!session_id) {
            return NextResponse.json({ error: "session_id required" }, { status: 400 });
        }

        // Use service role key to bypass RLS for unbanning
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; // Must have this in env
        
        // Fallback to anon key if service role is not available (though RLS might block it)
        const supabase = createClient(supabaseUrl, supabaseServiceKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

        // Update the session to in_progress and remove the completed_at timestamp
        const { error } = await supabase.from('test_sessions')
            .update({ status: 'in_progress', completed_at: null })
            .eq('id', session_id);

        if (error) {
            console.error("Supabase Error unbanning:", error);
            return NextResponse.json({ error: "Failed to unban" }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("API error:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}

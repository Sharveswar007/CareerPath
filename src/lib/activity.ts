// Activity Tracking Helper - For calculating user streaks

import { SupabaseClient } from "@supabase/supabase-js";

export interface ActivityStats {
    currentStreak: number;
    longestStreak: number;
    totalDays: number;
    lastActive: string | null;
}

// Record user activity for today (called on page load)
export async function recordActivity(supabase: SupabaseClient, userId: string): Promise<void> {
    try {
        // Use upsert to avoid duplicate entries for the same day
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any)
            .from("user_activity")
            .upsert(
                {
                    user_id: userId,
                    activity_date: new Date().toISOString().split("T")[0],
                    activity_type: "login",
                },
                {
                    onConflict: "user_id,activity_date",
                }
            );
    } catch (error) {
        console.error("Failed to record activity:", error);
    }
}

// Calculate user's current streak
export async function getActivityStats(supabase: SupabaseClient, userId: string): Promise<ActivityStats> {
    try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: activities, error } = await (supabase as any)
            .from("user_activity")
            .select("activity_date")
            .eq("user_id", userId)
            .order("activity_date", { ascending: false });

        if (error || !activities || activities.length === 0) {
            return {
                currentStreak: 0,
                longestStreak: 0,
                totalDays: 0,
                lastActive: null,
            };
        }

        // Calculate current streak
        let currentStreak = 0;
        let longestStreak = 0;
        let tempStreak = 1;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const dates = activities.map((a: { activity_date: string }) => {
            const d = new Date(a.activity_date);
            d.setHours(0, 0, 0, 0);
            return d;
        });

        // Check if most recent activity is today or yesterday
        const mostRecent = dates[0];
        const diffFromToday = Math.floor((today.getTime() - mostRecent.getTime()) / (1000 * 60 * 60 * 24));

        if (diffFromToday <= 1) {
            // Streak is active
            currentStreak = 1;

            for (let i = 1; i < dates.length; i++) {
                const diff = Math.floor((dates[i - 1].getTime() - dates[i].getTime()) / (1000 * 60 * 60 * 24));

                if (diff === 1) {
                    currentStreak++;
                } else {
                    break;
                }
            }
        }

        // Calculate longest streak
        for (let i = 1; i < dates.length; i++) {
            const diff = Math.floor((dates[i - 1].getTime() - dates[i].getTime()) / (1000 * 60 * 60 * 24));

            if (diff === 1) {
                tempStreak++;
            } else {
                longestStreak = Math.max(longestStreak, tempStreak);
                tempStreak = 1;
            }
        }
        longestStreak = Math.max(longestStreak, tempStreak, currentStreak);

        return {
            currentStreak,
            longestStreak,
            totalDays: activities.length,
            lastActive: activities[0]?.activity_date || null,
        };
    } catch (error) {
        console.error("Failed to get activity stats:", error);
        return {
            currentStreak: 0,
            longestStreak: 0,
            totalDays: 0,
            lastActive: null,
        };
    }
}

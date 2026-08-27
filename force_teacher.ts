import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data, error } = await supabase
    .from("profiles")
    .update({ role: "teacher" })
    .in("email", ["sharvesh.teacher@gmail.com", "sm9187@stmist.edu.in", "sm9187@gmail.com"])
    .select();
    
  console.log("Updated to teacher:", data);
  console.log("Update error:", error);
}

main();

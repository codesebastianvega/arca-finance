import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const admin = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data: goals, error } = await admin.from("savings_goals")
    .select("*")
    .eq("archived", true)
    .gt("current", 0);

  if (error || !goals || goals.length === 0) {
    console.log("No trapped pockets found.");
    return;
  }

  for (const goal of goals) {
    console.log(`Fixing trapped pocket: ${goal.name} with ${goal.current}`);
    
    // 1. Get primary account (Nu)
    const { data: acc } = await admin.from("accounts").select("*").eq("workspace_id", goal.workspace_id).eq("name", "Nu").single();
    if (!acc) {
      console.log("Could not find Nu account");
      continue;
    }

    // 2. Return money to account
    await admin.from("accounts").update({ balance: Number(acc.balance) + Number(goal.current) }).eq("id", acc.id);
    
    // 3. Create transaction
    await admin.from("transactions").insert({
      workspace_id: goal.workspace_id,
      kind: "income",
      status: "confirmed",
      amount: goal.current,
      concept: `Liberación: ${goal.name}`,
      account_id: acc.id,
      category: "ahorro",
      unit: "general",
      date: new Date().toISOString(),
      posted_at: new Date().toISOString(),
      metadata: { released_pocket_id: goal.id, backfill: true }
    });

    // 4. Set pocket current to 0
    await admin.from("savings_goals").update({ current: 0 }).eq("id", goal.id);
    console.log(`Successfully fixed ${goal.name}! Returned ${goal.current} to ${acc.name}.`);
  }
}
main();

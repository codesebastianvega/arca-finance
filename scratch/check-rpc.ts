import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const admin = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data: dbSummary, error } = await admin.rpc("get_dashboard_summary", { p_workspace_id: "a25db65a-888a-442e-a4dc-3e9940817df6" });
  console.log("RPC:", dbSummary, error);
}
main();

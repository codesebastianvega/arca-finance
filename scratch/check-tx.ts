import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const admin = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data: txs, error } = await admin.from("transactions").select("*").order("created_at", { ascending: false }).limit(5);
  console.log("Tx:", txs);
}
main();

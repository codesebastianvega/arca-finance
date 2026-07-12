import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function resetDatabase() {
  console.log('🧹 Limpiando toda la data de Arca...\n');

  const tables = [
    'financial_events',
    'monthly_projections',
    'monthly_budgets',
    'savings_transactions',
    'savings_goals',
    'credit_card_payments',
    'credit_card_purchases',
    'credit_cards',
    'debt_payments',
    'debts',
    'expenses',
    'incomes',
    'transactions',
    'scheduled_events',
    'receivables',
    'income_templates',
    'expense_templates',
    'income_sources',
    'expense_categories',
    'accounts',
    'business_units',
  ];

  for (const table of tables) {
    const { error, count } = await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (error) {
      console.log(`  ⚠️  ${table}: ${error.message}`);
    } else {
      console.log(`  ✅ ${table} limpiada`);
    }
  }

  console.log('\n✨ Base de datos limpia. Arca está en ceros, como usuario nuevo.\n');
}

resetDatabase().catch(console.error);

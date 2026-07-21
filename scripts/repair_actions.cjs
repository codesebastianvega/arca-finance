const fs = require('fs');

const path = 'app/actions.ts';
const content = fs.readFileSync(path, 'utf8');
const lines = content.split('\n');

const newFunction = `export async function confirmScheduledEventNow(eventId: string, overrideAmount?: number) {
  const context = await requireWorkspaceContext();
  const admin = await createSupabaseServerComponentClient();

  if (!admin) {
    throw new Error("Supabase client no disponible.");
  }

  const { data: event, error: eventError } = await admin
    .from("scheduled_events")
    .select("id, workspace_id, due_date, title, amount, kind, status, business_unit_key, account_id, notes, confirmed_transaction_id")
    .eq("id", eventId)
    .eq("workspace_id", context.workspace.id)
    .maybeSingle();

  if (eventError || !event) {
    throw new Error(\`No se pudo leer el evento: \${eventError?.message ?? "sin respuesta"}\`);
  }

  if (event.confirmed_transaction_id || event.status === "confirmed" || event.status === "confirmado") {
    revalidatePath("/app");
    return { ok: true, alreadyConfirmed: true };
  }

  if (!event.account_id) {
    throw new Error("Este evento no tiene una cuenta ligada para confirmarlo.");
  }

  const today = todayDateInBogota();
  const originalAmount = typeof event.amount === "number" ? event.amount : Number(event.amount ?? 0);
  const amount = overrideAmount !== undefined ? overrideAmount : originalAmount;
  const kind = String(event.kind ?? "expense");
  const isIncome = kind === "income";
  const delta = isIncome ? amount : -amount;

  const { data: account, error: accountError } = await admin
    .from("accounts")
    .select("id, name, workspace_id")
    .eq("id", event.account_id)
    .eq("workspace_id", context.workspace.id)
    .maybeSingle();

  if (accountError || !account) {
    throw new Error(\`No se pudo leer la cuenta del evento: \${accountError?.message ?? "sin respuesta"}\`);
  }

  const { data: nextBalance, error: accountUpdateError } = await admin.rpc("increment_account_balance", {
    p_account_id: event.account_id,
    p_amount: delta,
    p_allow_negative: false
  });

  if (accountUpdateError) {
    if (accountUpdateError.message.includes("INSUFFICIENT_FUNDS")) {
      throw new Error("La cuenta no tiene saldo suficiente para confirmar este movimiento.");
    }
    throw new Error(\`No se pudo actualizar la cuenta: \${accountUpdateError.message}\`);
  }

  const { data: transaction, error: transactionError } = await admin
    .from("transactions")
    .insert({
      workspace_id: context.workspace.id,
      kind,
      status: "confirmed",
      amount,
      concept: event.title,
      account_id: event.account_id,
      category: kind,
      unit: event.business_unit_key ?? "general",
      due_date: \`\${event.due_date}T00:00:00-05:00\`,
      date: \`\${today}T00:00:00-05:00\`,
      posted_at: new Date().toISOString(),
      source_type: "scheduled_event",
      source_id: event.id,
      metadata: {
        scheduled_event_id: event.id,
        notes: event.notes ?? null,
      },
    })
    .select("id")
    .single();

  if (transactionError || !transaction) {
    await admin.rpc("increment_account_balance", { p_account_id: event.account_id, p_amount: -delta, p_allow_negative: true });
    throw new Error(\`No se pudo crear la transacción: \${transactionError?.message ?? "sin respuesta"}\`);
  }

  const timingStatus = timingStatusFromDates(String(event.due_date), today);
  const { error: eventUpdateError } = await admin
    .from("scheduled_events")
    .update({
      status: "confirmed",
      timing_status: timingStatus,
      confirmed_transaction_id: transaction.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", event.id)
    .eq("workspace_id", context.workspace.id);

  if (eventUpdateError) {
    await admin.rpc("increment_account_balance", { p_account_id: event.account_id, p_amount: -delta, p_allow_negative: true });
    await admin.from("transactions").delete().eq("id", transaction.id).eq("workspace_id", context.workspace.id);
    throw new Error(\`Se creó la transacción, pero no se pudo cerrar el evento: \${eventUpdateError.message}\`);
  }

  revalidatePath("/app");
  return {
    ok: true,
    transactionId: String(transaction.id),
    accountId: String(account.id),
    accountName: String(account.name),
    amount,
    effect: delta,
    date: today,
    category: kind,
  };
}`;

const startIndex = lines.findIndex(l => l.startsWith('export async function confirmScheduledEventNow'));
// find the end of this function
let braceCount = 0;
let endIndex = -1;
let started = false;

for (let i = startIndex; i < lines.length; i++) {
  const line = lines[i];
  if (line.includes('{')) {
    braceCount += (line.match(/{/g) || []).length;
    started = true;
  }
  if (line.includes('}')) {
    braceCount -= (line.match(/}/g) || []).length;
  }
  if (started && braceCount === 0) {
    endIndex = i;
    break;
  }
}

if (startIndex !== -1 && endIndex !== -1) {
  lines.splice(startIndex, endIndex - startIndex + 1, newFunction);
  fs.writeFileSync(path, lines.join('\n'));
  console.log('Function successfully replaced.');
} else {
  console.error('Could not find function bounds.');
}

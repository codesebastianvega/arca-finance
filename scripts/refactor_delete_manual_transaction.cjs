const fs = require('fs');

const path = 'app/actions.ts';
const content = fs.readFileSync(path, 'utf8');
const lines = content.split('\n');

const newFunction = `export async function deleteManualTransaction(transactionId: string) {
  const context = await requireWorkspaceContext();
  const admin = await createSupabaseServerComponentClient();

  if (!admin) throw new Error("Supabase client no disponible.");

  const { data: transaction, error: transactionError } = await admin
    .from("transactions")
    .select("id, workspace_id, kind, amount, account_id, source_type, status")
    .eq("id", transactionId)
    .eq("workspace_id", context.workspace.id)
    .maybeSingle();

  if (transactionError || !transaction) {
    throw new Error(\`No se encontró el movimiento: \${transactionError?.message ?? "sin respuesta"}\`);
  }

  const previousAmount = typeof transaction.amount === "number" ? transaction.amount : Number(transaction.amount ?? 0);
  const previousDelta = transactionDelta(String(transaction.kind), previousAmount);

  // 1. Revert transaction delta using RPC
  if (transaction.account_id) {
    // @ts-expect-error
    const { error: revErr } = await admin.rpc("increment_account_balance", {
      p_account_id: transaction.account_id,
      p_amount: -previousDelta,
      p_allow_negative: true
    });
    if (revErr) throw new Error(\`No se pudo revertir el saldo de la cuenta: \${revErr.message}\`);
  }

  const { error: deleteError } = await admin
    .from("transactions")
    .delete()
    .eq("id", transactionId)
    .eq("workspace_id", context.workspace.id);

  if (deleteError) {
    // Re-apply delta to rollback the revert
    if (transaction.account_id) {
      // @ts-expect-error
      await admin.rpc("increment_account_balance", {
        p_account_id: transaction.account_id,
        p_amount: previousDelta,
        p_allow_negative: true
      });
    }
    throw new Error(\`No se pudo eliminar el movimiento: \${deleteError.message}\`);
  }

  revalidatePath("/app");
  return { ok: true };
}`;

const startIndex = lines.findIndex(l => l.startsWith('export async function deleteManualTransaction'));
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
  console.log('deleteManualTransaction successfully replaced.');
} else {
  console.error('Could not find function bounds for deleteManualTransaction.');
}

const fs = require('fs');

const path = 'app/actions.ts';
const content = fs.readFileSync(path, 'utf8');
const lines = content.split('\n');

const newFunction = `export async function createTransfer(input: {
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  concept: string;
  date: string;
}) {
  const context = await requireWorkspaceContext();
  const admin = await createSupabaseServerComponentClient();

  if (!admin) throw new Error("Supabase client no disponible.");

  if (!input.fromAccountId || !input.toAccountId) {
    throw new Error("Debes elegir cuenta origen y cuenta destino.");
  }

  if (input.fromAccountId === input.toAccountId) {
    throw new Error("La cuenta origen y destino no pueden ser la misma.");
  }

  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    throw new Error("El monto de la transferencia debe ser mayor a cero.");
  }

  const { data: accounts, error: accountsError } = await admin
    .from("accounts")
    .select("id, name, workspace_id")
    .in("id", [input.fromAccountId, input.toAccountId])
    .eq("workspace_id", context.workspace.id);

  if (accountsError) {
    throw new Error(\`No se pudieron leer las cuentas: \${accountsError.message}\`);
  }

  const fromAccount = (accounts ?? []).find((row) => row.id === input.fromAccountId);
  const toAccount = (accounts ?? []).find((row) => row.id === input.toAccountId);

  if (!fromAccount || !toAccount) {
    throw new Error("No se encontraron las cuentas seleccionadas en este espacio.");
  }

  // @ts-expect-error - RPC is not in generated types yet
  const { data: fromNextBalance, error: debitError } = await admin.rpc("increment_account_balance", {
    p_account_id: fromAccount.id,
    p_amount: -input.amount,
    p_allow_negative: false
  });

  if (debitError) {
    if (debitError.message.includes("INSUFFICIENT_FUNDS")) {
      throw new Error("La cuenta origen no tiene saldo suficiente.");
    }
    throw new Error(\`No se pudo actualizar la cuenta origen: \${debitError.message}\`);
  }

  // @ts-expect-error - RPC is not in generated types yet
  const { data: toNextBalance, error: creditError } = await admin.rpc("increment_account_balance", {
    p_account_id: toAccount.id,
    p_amount: input.amount,
    p_allow_negative: true
  });

  if (creditError) {
    // @ts-expect-error - RPC is not in generated types yet
    await admin.rpc("increment_account_balance", { p_account_id: fromAccount.id, p_amount: input.amount, p_allow_negative: true });
    throw new Error(\`No se pudo actualizar la cuenta destino: \${creditError.message}\`);
  }

  const concept = input.concept.trim() || \`Transferencia \${fromAccount.name} a \${toAccount.name}\`;
  const isoDate = \`\${input.date}T00:00:00-05:00\`;
  const transferKey = crypto.randomUUID();
  const now = new Date().toISOString();

  const { error: outError } = await admin.from("transactions").insert({
    workspace_id: context.workspace.id,
    kind: "transfer_out",
    status: "confirmed",
    amount: input.amount,
    concept,
    account_id: fromAccount.id,
    category: "transferencia",
    unit: "general",
    date: isoDate,
    posted_at: now,
    source_type: "manual",
    metadata: {
      transfer_key: transferKey,
      direction: "out",
      other_account_id: toAccount.id,
      other_account_name: toAccount.name,
    },
  });

  const { error: inError } = await admin.from("transactions").insert({
    workspace_id: context.workspace.id,
    kind: "transfer_in",
    status: "confirmed",
    amount: input.amount,
    concept,
    account_id: toAccount.id,
    category: "transferencia",
    unit: "general",
    date: isoDate,
    posted_at: now,
    source_type: "manual",
    metadata: {
      transfer_key: transferKey,
      direction: "in",
      other_account_id: fromAccount.id,
      other_account_name: fromAccount.name,
    },
  });

  if (outError || inError) {
    // @ts-expect-error
    await admin.rpc("increment_account_balance", { p_account_id: fromAccount.id, p_amount: input.amount, p_allow_negative: true });
    // @ts-expect-error
    await admin.rpc("increment_account_balance", { p_account_id: toAccount.id, p_amount: -input.amount, p_allow_negative: true });
    
    // We try to clean up orphaned transactions if only one succeeded
    await admin.from("transactions").delete().eq("metadata->>transfer_key", transferKey);
    throw new Error(\`Fallo al registrar las transacciones. El saldo fue restaurado.\`);
  }

  revalidatePath("/app");
  return {
    ok: true,
    transferKey,
    concept,
    date: input.date,
    amount: input.amount,
    fromAccountId: String(fromAccount.id),
    fromAccountName: String(fromAccount.name),
    fromBalanceBefore: (fromNextBalance as number) + input.amount,
    fromBalanceAfter: fromNextBalance as number,
    toAccountId: String(toAccount.id),
    toAccountName: String(toAccount.name),
    toBalanceBefore: (toNextBalance as number) - input.amount,
    toBalanceAfter: toNextBalance as number,
  };
}`;

const startIndex = lines.findIndex(l => l.startsWith('export async function createTransfer'));
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
  console.log('createTransfer successfully replaced.');
} else {
  console.error('Could not find function bounds for createTransfer.');
}

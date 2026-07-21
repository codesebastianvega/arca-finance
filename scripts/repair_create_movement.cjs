const fs = require('fs');

const path = 'app/actions.ts';
const content = fs.readFileSync(path, 'utf8');
const lines = content.split('\n');

const newFunction = `export async function createMovement(input: {
  kind: "income" | "expense";
  amount: number | string;
  concept: string;
  accountId: string;
  category: string;
  unit: string;
  date?: string;
  sourceId?: string | null;
  sourceLabel?: string | null;
  items?: Partial<TransactionItem>[];
}) {
  const context = await requireWorkspaceContext();
  const admin = await createSupabaseServerComponentClient();

  if (!admin) throw new Error("Supabase client no disponible.");

  const kind = input.kind;
  const amount = Number(input.amount ?? 0);
  const concept = input.concept.trim();
  const accountId = input.accountId.trim();
  const category = input.category.trim() || (kind === "income" ? "ingreso" : "general");
  const unit = input.unit.trim() || "general";
  const date = input.date?.trim() || todayDateInBogota();
  const sourceId = input.sourceId?.trim() || null;
  const sourceLabel = input.sourceLabel?.trim() || null;

  if (kind !== "income" && kind !== "expense") throw new Error("Tipo de movimiento invalido.");
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("El monto debe ser mayor a cero.");
  if (!concept) throw new Error("El movimiento necesita un concepto.");
  if (!accountId) throw new Error("Debes elegir una cuenta.");

  const { data: account, error: accountError } = await admin
    .from("accounts")
    .select("id, name, workspace_id")
    .eq("id", accountId)
    .eq("workspace_id", context.workspace.id)
    .maybeSingle();

  if (accountError || !account) {
    throw new Error(\`No se pudo leer la cuenta del movimiento: \${accountError?.message ?? "sin respuesta"}\`);
  }

  const delta = kind === "income" ? amount : -amount;

  const { data: nextBalance, error: accountUpdateError } = await admin.rpc("increment_account_balance", {
    p_account_id: accountId,
    p_amount: delta,
    p_allow_negative: false
  });

  if (accountUpdateError) {
    if (accountUpdateError.message.includes("INSUFFICIENT_FUNDS")) {
      throw new Error("La cuenta elegida no tiene saldo suficiente.");
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
      concept,
      account_id: accountId,
      category,
      unit,
      date: \`\${date}T00:00:00-05:00\`,
      posted_at: new Date().toISOString(),
      source_type: sourceId ? "income_source" : "manual",
      source_id: sourceId,
      metadata: {
        account_name: account.name,
        income_source_name: sourceLabel,
      },
    })
    .select("id")
    .single();

  if (transactionError || !transaction) {
    await admin.rpc("increment_account_balance", { p_account_id: accountId, p_amount: -delta, p_allow_negative: true });
    throw new Error(\`No se pudo crear el movimiento: \${transactionError?.message ?? "sin respuesta"}\`);
  }

  if (input.items && input.items.length > 0) {
    const itemsToInsert = input.items.map(item => ({
      transaction_id: transaction.id,
      category_id: item.categoryId || null,
      item_name: item.itemName || 'Item sin nombre',
      quantity: item.quantity || 1,
      unit_of_measure: item.unitOfMeasure || 'Unidad',
      unit_price: item.unitPrice || 0,
      total_price: item.totalPrice || 0,
    }));

    const { error: itemsError } = await admin
      .from("transaction_items")
      .insert(itemsToInsert);

    if (itemsError) {
      console.error("Error inserting transaction items:", itemsError);
    }
  }

  revalidatePath("/app");
  return {
    ok: true,
    transactionId: String(transaction.id),
    accountId: String(account.id),
    accountName: String(account.name),
    effect: delta,
    date,
  };
}`;

const startIndex = lines.findIndex(l => l.startsWith('export async function createMovement'));
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
  console.log('createMovement successfully replaced.');
} else {
  console.error('Could not find function bounds for createMovement.');
}

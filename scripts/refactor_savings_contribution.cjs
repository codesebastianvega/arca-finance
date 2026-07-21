const fs = require('fs');

const path = 'app/actions.ts';
const content = fs.readFileSync(path, 'utf8');
const lines = content.split('\n');

const newFunction = `export async function createSavingsContribution(input: { goalId: string; amount: number; accountId: string }) {
  const context = await requireWorkspaceContext();
  const admin = await createSupabaseServerComponentClient();

  if (!admin) throw new Error("Supabase client no disponible.");

  if (!input.accountId) {
    throw new Error("Debes elegir la cuenta de origen.");
  }

  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    throw new Error("El monto del aporte debe ser mayor a cero.");
  }

  const { data: goal, error: goalError } = await admin
    .from("savings_goals")
    .select("id, current, workspace_id")
    .eq("id", input.goalId)
    .eq("workspace_id", context.workspace.id)
    .maybeSingle();

  if (goalError || !goal) {
    throw new Error(\`No se pudo leer la meta: \${goalError?.message ?? "sin respuesta"}\`);
  }

  const today = todayDateInBogota();

  // @ts-expect-error
  const { error: accountUpdateError } = await admin.rpc("increment_account_balance", {
    p_account_id: input.accountId,
    p_amount: -input.amount,
    p_allow_negative: false
  });

  if (accountUpdateError) {
    if (accountUpdateError.message.includes("INSUFFICIENT_FUNDS")) {
      throw new Error("La cuenta elegida no tiene saldo suficiente.");
    }
    throw new Error(\`No se pudo descontar de la cuenta origen: \${accountUpdateError.message}\`);
  }

  const { data: movement, error: movementError } = await admin
    .from("transactions")
    .insert({
      workspace_id: context.workspace.id,
      kind: "saving_contribution",
      status: "confirmed",
      amount: input.amount,
      concept: \`Aporte a ahorro\`,
      account_id: input.accountId,
      category: "ahorro",
      unit: "general",
      date: \`\${today}T00:00:00-05:00\`,
      posted_at: new Date().toISOString(),
      source_type: "manual",
      metadata: {
        savings_goal_id: input.goalId,
      },
    })
    .select("id")
    .single();

  if (movementError || !movement) {
    // @ts-expect-error
    await admin.rpc("increment_account_balance", { p_account_id: input.accountId, p_amount: input.amount, p_allow_negative: true });
    throw new Error(\`No se pudo registrar el movimiento del aporte: \${movementError?.message ?? "sin respuesta"}\`);
  }

  const { error: transactionError } = await admin.from("savings_transactions").insert({
    workspace_id: context.workspace.id,
    savings_goal_id: input.goalId,
    account_id: input.accountId,
    amount: input.amount,
    type: "deposit",
    date: today,
    notes: "Aporte desde Dinero",
    transaction_id: movement.id,
  });

  if (transactionError) {
    // @ts-expect-error
    await admin.rpc("increment_account_balance", { p_account_id: input.accountId, p_amount: input.amount, p_allow_negative: true });
    throw new Error(\`No se pudo registrar el aporte: \${transactionError.message}\`);
  }

  // @ts-expect-error
  const { error: updateError } = await admin.rpc("increment_savings_goal_current", {
    p_goal_id: input.goalId,
    p_amount: input.amount
  });

  if (updateError) {
    // @ts-expect-error
    await admin.rpc("increment_account_balance", { p_account_id: input.accountId, p_amount: input.amount, p_allow_negative: true });
    throw new Error(\`Se registró el aporte, pero no se pudo actualizar la meta: \${updateError.message}\`);
  }

  revalidatePath("/app");
  return { ok: true };
}`;

const startIndex = lines.findIndex(l => l.startsWith('export async function createSavingsContribution'));
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
  console.log('createSavingsContribution successfully replaced.');
} else {
  console.error('Could not find function bounds for createSavingsContribution.');
}

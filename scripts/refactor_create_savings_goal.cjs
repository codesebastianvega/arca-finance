const fs = require('fs');

const path = 'app/actions.ts';
const content = fs.readFileSync(path, 'utf8');
const lines = content.split('\n');

const newFunction = `export async function createSavingsGoal(input: {
  name: string;
  target: number;
  current: number;
  dueDate?: string | null;
  goalType?: "saving" | "pocket";
  color?: string;
  sourceAccountId?: string | null;
}) {
  const context = await requireWorkspaceContext();
  const admin = await createSupabaseServerComponentClient();

  if (!admin) throw new Error("Supabase client no disponible.");

  const name = input.name.trim();
  const target = Number(input.target ?? 0);
  const current = Number(input.current ?? 0);
  const dueDate = input.dueDate?.trim() || null;
  const goalType = input.goalType ?? "saving";
  const color = input.color?.trim() || (goalType === "pocket" ? "#8FA66A" : "#16735b");

  if (!name) throw new Error("El ahorro necesita un nombre.");
  if (target <= 0) throw new Error("El monto objetivo debe ser mayor a cero.");
  if (current < 0) throw new Error("El monto actual no puede ser negativo.");

  if (goalType === "pocket" && !input.sourceAccountId) {
    throw new Error("Los bolsillos requieren una cuenta de origen.");
  }

  const { data: goal, error } = await admin
    .from("savings_goals")
    .insert({
      workspace_id: context.workspace.id,
      name,
      target,
      current,
      due_date: dueDate,
      color,
      goal_type: goalType,
      archived: false,
      account_id: goalType === "pocket" ? input.sourceAccountId : null,
    })
    .select("id")
    .single();

  if (error || !goal) {
    throw new Error(\`No se pudo crear el ahorro: \${error?.message ?? "sin respuesta"}\`);
  }

  if (current > 0) {
    // Log internal savings ledger entry
    const { error: savTransErr } = await admin.from("savings_transactions").insert({
      workspace_id: context.workspace.id,
      savings_goal_id: goal.id,
      amount: current,
      type: "deposit",
      date: todayDateInBogota(),
      notes: goalType === "pocket" ? "Monto inicial del bolsillo" : "Saldo inicial",
    });
    
    if (savTransErr) {
      await admin.from("savings_goals").delete().eq("id", goal.id);
      throw new Error(\`Se creó el ahorro, pero no el saldo inicial: \${savTransErr.message}\`);
    }

    // For pockets with a source account: deduct from account balance + log transaction
    if (goalType === "pocket" && input.sourceAccountId) {
      // @ts-expect-error
      const { error: accUpdateErr } = await admin.rpc("increment_account_balance", {
        p_account_id: input.sourceAccountId,
        p_amount: -current,
        p_allow_negative: false
      });

      if (accUpdateErr) {
        await admin.from("savings_goals").delete().eq("id", goal.id);
        if (accUpdateErr.message.includes("INSUFFICIENT_FUNDS")) {
          throw new Error("La cuenta origen no tiene saldo suficiente.");
        }
        throw new Error(\`No se pudo descontar de la cuenta: \${accUpdateErr.message}\`);
      }

      // Log the deduction as a saving_contribution transaction
      await admin.from("transactions").insert({
        workspace_id: context.workspace.id,
        kind: "saving_contribution",
        amount: current,
        account_id: input.sourceAccountId,
        category: "ahorro",
        date: todayDateInBogota(),
        notes: \`Bolsillo: \${name}\`,
      });
    }
  }

  revalidatePath("/app");
  return { ok: true, goalId: String(goal.id) };
}`;

const startIndex = lines.findIndex(l => l.startsWith('export async function createSavingsGoal'));
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
  console.log('createSavingsGoal successfully replaced.');
} else {
  console.error('Could not find function bounds for createSavingsGoal.');
}

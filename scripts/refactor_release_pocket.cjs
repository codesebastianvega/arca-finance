const fs = require('fs');

const path = 'app/actions.ts';
const content = fs.readFileSync(path, 'utf8');
const lines = content.split('\n');

const newFunction = `export async function releasePocket(input: { goalId: string }) {
  const context = await requireWorkspaceContext();
  const admin = await createSupabaseServerComponentClient();

  if (!admin) throw new Error("Supabase client no disponible.");

  // 1. Obtener el bolsillo y su cuenta asociada
  const { data: goal, error: goalError } = await admin
    .from("savings_goals")
    .select("id, name, current, workspace_id, account_id")
    .eq("id", input.goalId)
    .eq("workspace_id", context.workspace.id)
    .maybeSingle();

  if (goalError || !goal) {
    throw new Error(\`No se pudo leer el bolsillo: \${goalError?.message ?? "sin respuesta"}\`);
  }

  if (!goal.account_id) {
    throw new Error("Este bolsillo no tiene una cuenta asociada para devolver el dinero.");
  }

  const amountToRelease = typeof goal.current === "number" ? goal.current : Number(goal.current ?? 0);

  // 2. Si hay dinero, lo devolvemos a la cuenta origen del bolsillo
  if (amountToRelease > 0) {
    const today = todayDateInBogota();

    // @ts-expect-error
    const { error: balanceError } = await admin.rpc("increment_account_balance", {
      p_account_id: goal.account_id,
      p_amount: amountToRelease,
      p_allow_negative: true
    });
      
    if (balanceError) {
      throw new Error(\`Error al actualizar el saldo de la cuenta: \${balanceError.message}\`);
    }

    // Crear la transacción de ingreso a la cuenta
    const { error: movementError } = await admin
      .from("transactions")
      .insert({
        workspace_id: context.workspace.id,
        kind: "income",
        status: "confirmed",
        amount: amountToRelease,
        concept: \`Liberación: \${goal.name}\`,
        account_id: goal.account_id,
        category: "ahorro",
        unit: "general",
        date: \`\${today}T00:00:00-05:00\`,
        posted_at: new Date().toISOString(),
        source_type: "manual",
        metadata: {
          released_pocket_id: input.goalId,
        },
      });

    if (movementError) {
      // @ts-expect-error
      await admin.rpc("increment_account_balance", { p_account_id: goal.account_id, p_amount: -amountToRelease, p_allow_negative: true });
      throw new Error(\`No se pudo registrar la devolución del dinero: \${movementError.message}\`);
    }
  }

  // 3. Archivar el bolsillo y dejarlo en 0
  const { error: archiveError } = await admin
    .from("savings_goals")
    .update({
      current: 0,
      archived: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.goalId)
    .eq("workspace_id", context.workspace.id);

  if (archiveError) {
    throw new Error(\`No se pudo archivar el bolsillo: \${archiveError.message}\`);
  }

  revalidatePath("/app");
  return { ok: true };
}`;

const startIndex = lines.findIndex(l => l.startsWith('export async function releasePocket'));
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
  console.log('releasePocket successfully replaced.');
} else {
  console.error('Could not find function bounds for releasePocket.');
}

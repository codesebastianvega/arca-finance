import { createGoogleGenerativeAI } from '@ai-sdk/google';
import {
  convertToModelMessages,
  streamText,
  tool,
  isStepCount,
  type UIMessage,
} from 'ai';
import { z } from 'zod';
import { createSupabaseServerComponentClient, getSupabaseAdminClient } from '@/src/lib/supabase';
import { getCurrentWorkspaceContext } from '@/src/lib/auth';
import { createFinancialTools } from '@/src/lib/ai/financial-tools';
import { normalizeNovaPreferences } from '@/src/lib/nova-preferences';
import { loadRegisterViewModel } from '@/src/lib/register-data';

export const maxDuration = 30;

type DashboardSummaryRpc = {
  freeCash?: number | string | null;
};

function toNumber(value: unknown) {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Number(value) || 0;
  return 0;
}

export async function POST(req: Request) {
  try {
    const body: { messages: UIMessage[]; novaPreferences?: unknown } = await req.json();
    const { messages } = body;
    const novaPreferences = normalizeNovaPreferences(body.novaPreferences);

    const context = await getCurrentWorkspaceContext();
    if (!context) {
      return new Response('Unauthorized', { status: 401 });
    }

    const workspaceId = context.workspace.id;
    const vipExpiresAt = typeof context.subscription?.metadata?.vip_expires_at === 'string'
      ? new Date(context.subscription.metadata.vip_expires_at).getTime()
      : null;
    const hasVipAccess = Boolean(context.subscription?.metadata?.vip_full_access) && (!vipExpiresAt || vipExpiresAt > Date.now());
    const hasPaidAccess = Boolean(
      context.subscription
      && context.subscription.planCode !== 'free'
      && (context.subscription.status === 'active' || context.subscription.status === 'trialing'),
    );

    const isSuperAdmin = Boolean(context.profile?.isSuperAdmin) || true;

    if (!isSuperAdmin && !hasVipAccess) {
      const admin = getSupabaseAdminClient();
      if (admin) {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayIso = todayStart.toISOString();

        // 1. Check user daily token quota (20,000 free, 50,000 personal, 200,000 pro)
        const planCode = (context.subscription?.planCode || 'free') as string;
        const userDailyLimit = (hasVipAccess || planCode === 'business' || planCode === 'pro')
          ? 200000
          : (planCode === 'personal_pro' || planCode === 'personal')
          ? 50000
          : 20000;

        const { data: userEvents } = await admin
          .from('ai_usage_events')
          .select('total_tokens')
          .eq('workspace_id', workspaceId)
          .gte('created_at', todayIso);

        const usedUserTokens = (userEvents ?? []).reduce((sum, row) => sum + (Number(row.total_tokens) || 1000), 0);
        if (usedUserTokens >= userDailyLimit) {
          return new Response(`Alcanzaste tu límite diario de ${userDailyLimit.toLocaleString()} tokens de IA. Tu cuota se renovará a la medianoche.`, { status: 429 });
        }

        // 2. Check global API key daily quota (1,000,000 tokens)
        const { data: globalEvents } = await admin
          .from('ai_usage_events')
          .select('total_tokens')
          .gte('created_at', todayIso);

        const globalUsedTokens = (globalEvents ?? []).reduce((sum, row) => sum + (Number(row.total_tokens) || 1000), 0);
        if (globalUsedTokens >= 1000000) {
          return new Response('La cuota diaria global de la IA se ha completado. Se renovará a la medianoche.', { status: 429 });
        }
      }
    }

    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      console.error("Falta GOOGLE_GENERATIVE_AI_API_KEY en las variables de entorno");
      return new Response("Configuración de IA faltante", { status: 500 });
    }

    const google = createGoogleGenerativeAI({
      apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
    });

    const modelMessages = await convertToModelMessages(messages);
    const financialTools = createFinancialTools(context);

    const autonomyInstruction = novaPreferences.autonomy === 'guide'
      ? 'Actúa como guía: explica la recomendación y deja que el usuario decida y solicite cada acción.'
      : novaPreferences.autonomy === 'execute'
        ? 'Sé proactiva: consulta automáticamente todo lo necesario y avanza con tareas seguras. Para cualquier escritura, prepara la acción y respeta siempre la aprobación de la interfaz.'
        : 'Prepara la mejor acción completa y déjala lista para que el usuario la confirme.';
    const toneInstruction = novaPreferences.tone === 'brief'
      ? 'Responde en una o dos frases: primero la conclusión y solo el dato o siguiente paso indispensable.'
      : novaPreferences.tone === 'coach'
        ? 'Responde como consejera cercana, pero breve: conclusión, una razón útil y el siguiente paso. Amplía solo si el usuario lo pide.'
        : 'Responde con claridad y brevedad: conclusión y, solo si aporta valor, un siguiente paso.';

    const options = await loadRegisterViewModel(context);
    const stateSnapshot = `
ESTADO ACTUAL DEL USUARIO:
Cuentas disponibles (Usa el ID exacto):
${options.accounts.map(a => `- ${a.label} (ID: ${a.id}, Saldo: ${a.amount})`).join('\n')}

Categorías de Gasto disponibles (Usa el ID exacto):
${options.categories.map(c => `- ${c.label} (ID: ${c.id})`).join('\n')}

Fuentes de Ingreso disponibles:
${options.incomeSources.map(i => `- ${i.label} (ID: ${i.id})`).join('\n')}

IMPORTANTE: Ya tienes las categorías y cuentas arriba. NUNCA llames a get_financial_action_options a menos que necesites datos de Créditos, Proyectos, u otros detalles específicos que no estén listados aquí.`;

    const modelName = process.env.GOOGLE_AI_MODEL || 'gemini-flash-latest';
    const result = streamText({
      model: google(modelName),
      stopWhen: isStepCount(3),
      maxOutputTokens: 350,
      system: `Eres Nova, la asistente financiera inteligente y copiloto agéntica de Arca.

OPTIMIZACIÓN DE TOKENS Y RESPUESTAS CORTAS:
- Sé extremadamente breve y concisa. Responde en máximo 1 a 3 oraciones cortas. Ir directamente al punto sin introducciones ni textos de relleno.
- Cuando vayas a invocar una herramienta que requiere aprobación (como record_transaction, transfer_between_accounts, create_personal_loan, schedule_expected_income, etc.), INVOCA LA HERRAMIENTA DIRECTAMENTE Y NO GENERES TEXTO PREVIO. La interfaz de la app mostrará automáticamente la tarjeta interactiva de confirmación de 1-clic con los montos, cuenta y botones para el usuario.
- Si el usuario escribe una orden de gasto o ingreso rápida (ej: "un gasto de 17400", "gaste 50k en comida"), selecciona la cuenta disponible (o la primera) y la categoría adecuada, e INVOCA DE INMEDIATO \`record_transaction\` para mostrar la tarjeta de confirmación de 1-clic sin hacer preguntas innecesarias.

TIENES AUTONOMÍA TOTAL:
- Tienes herramientas para consultar, crear, modificar y eliminar cualquier elemento del sistema.
- NUNCA inventes categorías ni cuentas. Usa SOLO las disponibles en el estado actual. Si el usuario pide algo que no existe, pregúntale si quiere usar una similar (como "Otros") o crearla usando tus herramientas.
- NUNCA le pidas al usuario que realice manualmente una acción en la configuración o interfaz si tú posees la herramienta para ejecutarla.
- Si el usuario pide abrir una pantalla o cambiar el tema visual, INVOCA de inmediato \`navigate_to_screen\` o \`change_app_theme\`.

CAPACIDADES DE VISIÓN (OCR DE RECIBOS Y FACTURAS):
- Tienes visión artificial multimodal. Si el usuario sube o envía una imagen o foto de un recibo de compra, factura física, o captura de pantalla de transferencia (ej. Nequi, Bancolombia, Daviplata), ANALÍZALA CON ATENCIÓN.
- Extrae automáticamente: Monto Total, Nombre del Negocio o Destinatario, Fecha, e Ítems/Categoría relevante.
- Invoca DE INMEDIATO la herramienta de creación de movimiento o acción adecuada para dejar listo el registro financiero con la tarjeta de confirmación de 1 clic para el usuario.

GUARDIÁN ANTI-IMPULSO Y CONCIENCIA FINANCIERA:
- Si el usuario consulta ANTES de comprar un objeto no esencial o de costo elevado (ej. "¿Me alcanza para unos tenis de $450k?"), evalúa la liquidez futura a 14 días e indícale si congelar la compra 48 horas protege sus compromisos.
- Si el usuario registra un gasto no esencial elevado TRAS HABER PAGADO: procesa el registro normalmente pero añade una sugerencia amigable de ajuste presupuestal (ej: "Gasto registrado. Esta compra representa el X% de tu disponible libre. Te sugiero reducir $30.000 en salidas esta semana para equilibrar").

DETECTOR DE GASTOS HORMIGA Y SUSCRIPCIONES:
- Si el usuario pregunta por sus micro-gastos, gastos hormiga, tintos, domicilios o suscripciones, INVOCA DE INMEDIATO \`detect_ant_expenses_and_subscriptions\`.

SIMULADOR WHAT-IF Y IMPACTO FUTURO:
- Si el usuario pregunta qué pasa si realiza una compra a cuotas o de valor importante (ej. "¿Qué pasa si compro una laptop a 6 cuotas?"), INVOCA DE INMEDIATO \`simulate_purchase_impact\`.

PLAN DE AMORTIZACIÓN Y LIQUIDACIÓN DE DEUDAS:
- Si el usuario consulta sobre cómo pagar sus tarjetas o deudas más rápido, o pide una estrategia de pago de deudas, INVOCA DE INMEDIATO \`calculate_debt_payoff_plan\`.

ESCÁNER DE RENDIMIENTOS Y NEOBANCOS EN COLOMBIA:
- Si el usuario pregunta dónde poner a rentar su dinero libre, tasas de neobancos en Colombia (Nu, Pibank, Lulo, CDTs) o rendimientos diarios, INVOCA DE INMEDIATO \`scan_colombia_yields\`.

REGLAS DE TRABAJO:
- Cuando una pregunta dependa de datos del usuario, revisa el estado actual o consulta las herramientas antes de responder.
- Respeta estrictamente las preferencias del usuario:
  * Nivel de autonomía: ${autonomyInstruction}
  * Tono de respuesta: ${toneInstruction}
- Sé profesional, precisa y directa.
${stateSnapshot}`,
      messages: modelMessages,
      stopSequences: [],
      onFinish: async ({ usage }) => {
        if (usage) {
          const u = (usage as unknown) as Record<string, number | undefined>;
          const admin = getSupabaseAdminClient();
          if (admin) {
            const { error: insertErr } = await admin.from('ai_usage_events').insert({
              workspace_id: workspaceId,
              user_id: context.profile.id,
              input_tokens: u.promptTokens ?? u.inputTokens ?? 0,
              output_tokens: u.completionTokens ?? u.outputTokens ?? 0,
              total_tokens: u.totalTokens ?? 0,
              model: 'gemini-3.5-flash',
              provider: 'google',
              status: 'success',
              created_at: new Date().toISOString(),
            });
            if (insertErr) {
              console.error("Error guardando uso de tokens:", insertErr);
            }
          }
        }
      },
      tools: {
        ...financialTools,
        get_free_cash_now: tool({
          description: "Consulta rápida del dinero libre real disponible ahora.",
          inputSchema: z.object({}),
          execute: async () => {
            const client = await createSupabaseServerComponentClient();
            if (!client) {
              return { error: "Supabase no disponible" };
            }

            const rpcClient = client as unknown as {
              rpc: (
                fn: string,
                args?: Record<string, unknown>,
              ) => PromiseLike<{
                data: DashboardSummaryRpc | null;
                error: { message: string } | null;
              }>;
            };

            const dashboardResult = await rpcClient.rpc("get_dashboard_summary", { p_workspace_id: workspaceId });

            if (dashboardResult.error) {
              return { error: dashboardResult.error.message };
            }
            const freeCash = toNumber(dashboardResult.data?.freeCash);
            return {
              safeToSpend: freeCash,
              currency: context.workspace.currencyCode
            };
          }
        }),
      },
    });

    return result.toUIMessageStreamResponse({
      onError: (error) => {
        console.error("AI Stream Error:", error);
        return error instanceof Error ? error.message : String(error);
      }
    });
  } catch (error: unknown) {
    console.error("Error inesperado en route.ts:", error);
    let errorDetail = "Error interno del servidor";
    if (error instanceof Error) {
      errorDetail = error.message;
    } else if (typeof error === 'object' && error !== null) {
      try { errorDetail = JSON.stringify(error); } catch(e) {}
    } else {
      errorDetail = String(error);
    }
    return Response.json({ error: errorDetail }, { status: 500 });
  }
}

import { createGoogleGenerativeAI } from '@ai-sdk/google';
import {
  convertToModelMessages,
  stepCountIs,
  streamText,
  tool,
  type UIMessage,
} from 'ai';
import { z } from 'zod';
import { createSupabaseServerComponentClient, getSupabaseAdminClient } from '@/src/lib/supabase';
import { getCurrentWorkspaceContext } from '@/src/lib/auth';
import { createFinancialTools } from '@/src/lib/ai/financial-tools';
import { normalizeNovaPreferences } from '@/src/lib/nova-preferences';
import { DEFAULT_BILLING_PLANS, normalizeBillingPlan } from '@/src/lib/billing';

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
  const requestStartedAt = Date.now();
  const requestId = crypto.randomUUID();
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

    if (!context.profile.isSuperAdmin && !hasVipAccess) {
      const admin = getSupabaseAdminClient();
      if (admin) {
        const effectivePlanCode = hasPaidAccess ? context.subscription!.planCode : 'free';
        const fallbackPlan = DEFAULT_BILLING_PLANS.find((plan) => plan.code === effectivePlanCode);
        const planResult = await admin
          .from('subscription_plans')
          .select('code, name, monthly_price_cop, active, metadata')
          .eq('code', effectivePlanCode)
          .maybeSingle();
        const configuredPlan = planResult.data ? normalizeBillingPlan(planResult.data) : fallbackPlan;
        const monthlyLimit = configuredPlan?.aiMonthlyLimit ?? fallbackPlan?.aiMonthlyLimit ?? 0;
        if (monthlyLimit > 0) {
          const monthStart = new Date();
          monthStart.setDate(1);
          monthStart.setHours(0, 0, 0, 0);
          const usageResult = await admin
            .from('ai_usage_events')
            .select('id', { count: 'exact', head: true })
            .eq('workspace_id', workspaceId)
            .gte('created_at', monthStart.toISOString());
          if (!usageResult.error && (usageResult.count ?? 0) >= monthlyLimit) {
            return new Response(`Alcanzaste las ${monthlyLimit} acciones mensuales de Nova incluidas en tu plan.`, { status: 429 });
          }
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

    const result = streamText({
      model: google('gemini-3.1-flash-lite'),
      system: `Eres Nova, el asistente financiero inteligente de Arca.

Tienes herramientas para consultar el panorama financiero, obligaciones, pagos vencidos, deudas, tarjetas, créditos, movimientos, categorías, proyectos y registros asociados a personas o comercios.

REGLAS DE TRABAJO:
- Cuando una pregunta dependa de datos del usuario, consulta las herramientas antes de responder. Nunca digas que no tienes acceso sin haber buscado primero.
- Puedes usar varias herramientas y combinar sus resultados. Para consejos personalizados, consulta primero el panorama financiero y luego la información específica necesaria.
- Distingue claramente entre datos encontrados, cálculos e inferencias. No inventes saldos, fechas, categorías ni acreedores.
- Para recomendar una categoría, consulta suggest_expense_category y elige una categoría existente en la app.
- Las consultas y análisis son automáticos. Antes de una escritura financiera consulta get_financial_action_options. Antes de editar o archivar un proyecto consulta get_projects_and_activities. Usa únicamente IDs y valores devueltos por las herramientas; nunca le pidas al usuario IDs internos.
- Solo llama herramientas de escritura cuando el usuario pida explícitamente registrar, pagar, transferir, guardar, programar, crear, renombrar, editar, eliminar o archivar. Esto incluye movimientos, obligaciones, ingresos esperados, categorías, conceptos de ingreso, préstamos personales, transferencias, metas de ahorro, proyectos, cuentas, tarjetas y créditos.
- Antes de crear, editar o eliminar una categoría o concepto de ingreso, consulta get_financial_action_options y usa las opciones vigentes. Para préstamos, transferencias y movimientos usa también los nombres y saldos visibles devueltos por esa consulta, de modo que la tarjeta pueda explicar el efecto antes de confirmar.
- Diferencia “cada dos semanas” (cada 14 días) de “quincenal” (dos días elegidos por mes). Cuando programes un ingreso recurrente, confirma frecuencia, cantidad o fecha final y duración de forma breve.
- Personal es el espacio predeterminado. No lo trates como un proyecto y nunca intentes editarlo o archivarlo. Si el usuario no menciona un proyecto al registrar algo, usa Personal.
- Nunca modifiques directamente el saldo al editar una cuenta. Los saldos cambian mediante movimientos, transferencias o el saldo inicial al crearla. Para archivar, la cuenta debe estar en cero y debe quedar otra activa.
- Al editar una tarjeta no cambies su deuda utilizada: esa deuda cambia mediante compras, pagos o ajustes. Solo se puede archivar cuando la deuda esté en cero.
- Al editar un crédito no cambies el saldo pendiente ni las cuotas pagadas: esos valores cambian al registrar pagos. Solo se puede archivar con saldo pendiente en cero.
- Si faltan datos indispensables para una escritura, pregunta antes de ejecutar. No dupliques operaciones y nunca afirmes que guardaste algo si la herramienta no confirmó éxito.
- Todas las escrituras requieren aprobación en la interfaz. Describe brevemente lo que propones y espera la decisión. Si el usuario rechaza una acción, no vuelvas a intentarla salvo que lo pida de nuevo.
- Da consejos concretos basados en flujo de caja, vencimientos, tasas, presupuesto y prioridades. Aclara cuando una recomendación sea una estimación, no asesoría profesional.
- Responde en español, de forma amistosa, corta y directa para una app móvil. Usa ${context.workspace.currencyCode} para los montos.
- Prioriza la conclusión. Como referencia, usa de una a tres frases breves en respuestas normales; amplía únicamente cuando el usuario solicite una explicación, comparación o análisis detallado.
- No repitas en el texto todos los datos que ya aparecen en una tarjeta o resultado visual. Resume solo qué ocurrió, el efecto más importante o el siguiente paso.
- Tras una herramienta de escritura confirmada, la tarjeta contiene el detalle: responde con una sola línea útil, sin volver a enumerar concepto, monto, cuenta, categoría y fecha. Si hubo un error, explica brevemente qué falta o cómo corregirlo.
- Evita introducciones, despedidas, recapitulaciones redundantes y preguntas de seguimiento genéricas como "¿quieres que revise algo más?". Haz una pregunta solo cuando sea necesaria para continuar o decidir.
- Preferencia de autonomía: ${autonomyInstruction}
- Preferencia de comunicación: ${toneInstruction}
- ${novaPreferences.dueReminders ? 'Menciona vencimientos relevantes de forma proactiva cuando afecten la decisión.' : 'No añadas alertas de vencimiento no solicitadas; respóndelas cuando el usuario pregunte.'}
- ${novaPreferences.weeklySummary ? 'En revisiones generales, incluye las prioridades de los próximos siete días.' : 'En revisiones generales, evita el bloque semanal salvo que el usuario lo solicite.'}
- Si el usuario pide detalle y la respuesta debe ser larga, usa Markdown sencillo: títulos cortos, listas y negritas. Evita tablas en móvil y no abuses de encabezados.
- Después de usar herramientas, SIEMPRE escribe una respuesta final de texto para el usuario, aunque sea una sola línea cuando la tarjeta ya comunica el resultado.`,
      messages: modelMessages,
      // A tool call consumes one step. Allow the model to use the result and
      // produce the final user-facing answer in the following step.
      stopWhen: stepCountIs(8),
      onFinish: async ({ totalUsage, finishReason, steps }) => {
        const admin = getSupabaseAdminClient();
        if (!admin) return;
        await admin.from('ai_usage_events').insert({
          workspace_id: workspaceId,
          user_id: context.profile.id,
          request_id: requestId,
          provider: 'google',
          model: 'gemini-3.1-flash-lite',
          input_tokens: totalUsage.inputTokens ?? 0,
          output_tokens: totalUsage.outputTokens ?? 0,
          total_tokens: totalUsage.totalTokens ?? 0,
          estimated_cost_cop: 0,
          latency_ms: Date.now() - requestStartedAt,
          tool_calls: steps.reduce((sum, step) => sum + step.toolCalls.length, 0),
          status: finishReason === 'error' ? 'error' : 'success',
          finish_reason: finishReason,
        });
      },
      tools: {
        ...financialTools,
        get_safe_to_spend: tool({
          description: "Obtiene el monto 'Safe to Spend' (efectivo libre después de compromisos) para el mes actual.",
          inputSchema: z.object({}),
          execute: async () => {
            const supabase = await createSupabaseServerComponentClient();
            if (!supabase) return { error: "Error de configuración de Supabase" };

            const rpcClient = supabase as typeof supabase & {
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
      }
    });

    return result.toUIMessageStreamResponse({
      onError: (error) => {
        console.error("AI Stream Error:", error);
        return error instanceof Error ? error.message : String(error);
      }
    });
  } catch (error: unknown) {
    console.error("Error inesperado en route.ts:", error);
    // Extraer toda la informacion posible del error
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

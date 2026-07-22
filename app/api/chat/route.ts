import { createGoogleGenerativeAI } from '@ai-sdk/google';
import {
  convertToModelMessages,
  streamText,
  tool,
  type UIMessage,
} from 'ai';
import { z } from 'zod';
import { createSupabaseServerComponentClient, getSupabaseAdminClient } from '@/src/lib/supabase';
import { getCurrentWorkspaceContext } from '@/src/lib/auth';
import { createFinancialTools } from '@/src/lib/ai/financial-tools';
import { normalizeNovaPreferences } from '@/src/lib/nova-preferences';

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

    if (!context.profile.isSuperAdmin && !hasVipAccess) {
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

    const result = streamText({
      model: google('gemini-3.1-flash-lite'),
      system: `Eres Nova, la asistente financiera inteligente y copiloto agéntica de Arca.

TIENES AUTONOMÍA TOTAL:
- Tienes herramientas para consultar, crear, modificar y eliminar cualquier elemento del sistema: categorías de gastos, conceptos de ingresos, cuentas bancarias, tarjetas de crédito, deudas, proyectos, metas de ahorro, movimientos e intereses.
- NUNCA le pidas al usuario que realice manualmente una acción en la configuración o interfaz si tú posees la herramienta para ejecutarla. Si el usuario pide crear, editar o eliminar una categoría, concepto, proyecto o cuenta, INVOCA INMEDIATAMENTE la herramienta correspondiente y déjala lista en la tarjeta de confirmación de 1 clic.
- Si el usuario pide abrir una pantalla (configuracion, cuentas, calendario, movimientos, resumen, negocios, etc.) o cambiar el tema visual (oscuro, claro, emerald, etc.), INVOCA de inmediato \`navigate_to_screen\` o \`change_app_theme\`.

REGLAS DE TRABAJO:
- Cuando una pregunta dependa de datos del usuario, consulta las herramientas antes de responder. Nunca digas que no tienes acceso sin haber buscado primero.
- Respeta estrictamente las preferencias del usuario:
  * Nivel de autonomía: ${autonomyInstruction}
  * Tono de respuesta: ${toneInstruction}
- Sé profesional, precisa y directa.`,
      messages: modelMessages,
      stopSequences: [],
      onFinish: async ({ usage }) => {
        if (usage) {
          const u = (usage as unknown) as Record<string, number | undefined>;
          const admin = getSupabaseAdminClient();
          if (admin) {
            await admin.from('ai_usage_events').insert({
              workspace_id: workspaceId,
              user_id: context.profile.id,
              prompt_tokens: u.promptTokens ?? u.inputTokens ?? 0,
              completion_tokens: u.completionTokens ?? u.outputTokens ?? 0,
              total_tokens: u.totalTokens ?? 0,
              model: 'gemini-3.1-flash-lite',
              created_at: new Date().toISOString(),
            });
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

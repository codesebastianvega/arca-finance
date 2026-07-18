import { createGoogleGenerativeAI } from '@ai-sdk/google';
import {
  convertToModelMessages,
  stepCountIs,
  streamText,
  tool,
  type UIMessage,
} from 'ai';
import { z } from 'zod';
import { createSupabaseServerComponentClient } from '@/src/lib/supabase';
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
    console.log("MENSAJES ENTRANTES:", JSON.stringify(messages, null, 2));

    const context = await getCurrentWorkspaceContext();
    if (!context) {
      return new Response('Unauthorized', { status: 401 });
    }

    const workspaceId = context.workspace.id;

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
      ? 'Responde de forma muy breve: primero la conclusión y solo los datos indispensables.'
      : novaPreferences.tone === 'coach'
        ? 'Responde como consejera: explica el porqué, señala el siguiente paso y mantén un tono cercano.'
        : 'Responde con claridad: conclusión, contexto mínimo y siguiente acción.';

    const result = streamText({
      model: google('gemini-3.1-flash-lite'),
      system: `Eres Nova, el asistente financiero inteligente de Arca.

Tienes herramientas para consultar el panorama financiero, obligaciones, pagos vencidos, deudas, tarjetas, créditos, movimientos, categorías y registros asociados a personas o comercios.

REGLAS DE TRABAJO:
- Cuando una pregunta dependa de datos del usuario, consulta las herramientas antes de responder. Nunca digas que no tienes acceso sin haber buscado primero.
- Puedes usar varias herramientas y combinar sus resultados. Para consejos personalizados, consulta primero el panorama financiero y luego la información específica necesaria.
- Distingue claramente entre datos encontrados, cálculos e inferencias. No inventes saldos, fechas, categorías ni acreedores.
- Para recomendar una categoría, consulta suggest_expense_category y elige una categoría existente en la app.
- Las consultas y análisis son automáticos. Antes de cualquier escritura consulta get_financial_action_options y usa únicamente IDs y valores devueltos por las herramientas; nunca le pidas al usuario IDs internos.
- Solo llama record_transaction, confirm_obligation_payment, schedule_obligation o schedule_expected_income cuando el usuario pida explícitamente registrar, pagar, guardar, programar o agendar.
- Si faltan datos indispensables para una escritura, pregunta antes de ejecutar. No dupliques operaciones y nunca afirmes que guardaste algo si la herramienta no confirmó éxito.
- Todas las escrituras requieren aprobación en la interfaz. Describe brevemente lo que propones y espera la decisión. Si el usuario rechaza una acción, no vuelvas a intentarla salvo que lo pida de nuevo.
- Da consejos concretos basados en flujo de caja, vencimientos, tasas, presupuesto y prioridades. Aclara cuando una recomendación sea una estimación, no asesoría profesional.
- Responde en español, de forma amistosa, corta y directa para una app móvil. Usa ${context.workspace.currencyCode} para los montos.
- Preferencia de autonomía: ${autonomyInstruction}
- Preferencia de comunicación: ${toneInstruction}
- ${novaPreferences.dueReminders ? 'Menciona vencimientos relevantes de forma proactiva cuando afecten la decisión.' : 'No añadas alertas de vencimiento no solicitadas; respóndelas cuando el usuario pregunte.'}
- ${novaPreferences.weeklySummary ? 'En revisiones generales, incluye las prioridades de los próximos siete días.' : 'En revisiones generales, evita el bloque semanal salvo que el usuario lo solicite.'}
- Organiza respuestas largas con Markdown sencillo: títulos cortos, listas y negritas. Evita tablas en móvil y no abuses de encabezados.
- Después de usar herramientas, SIEMPRE escribe una respuesta final de texto para el usuario.`,
      messages: modelMessages,
      // A tool call consumes one step. Allow the model to use the result and
      // produce the final user-facing answer in the following step.
      stopWhen: stepCountIs(8),
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

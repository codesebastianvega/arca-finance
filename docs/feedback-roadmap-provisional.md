# Roadmap provisional de feedback de Arca

Última actualización: 20 de julio de 2026.

Este documento concentra la retroalimentación funcional y de experiencia de Arca. Se trabajará en el orden indicado, saltando únicamente los puntos que ya estén terminados.

## Estados

- ✅ Terminado y publicado.
- 🟠 Terminado localmente; falta commit y despliegue.
- 🟡 Parcialmente implementado.
- ⬜ Pendiente.
- 🐞 Error conocido pendiente de corrección.

## Forma de trabajo

Para cerrar una tarea debe quedar:

1. Implementada.
2. Validada con TypeScript y build, según corresponda.
3. Probada en el flujo móvil afectado.
4. Registrada aquí con los archivos o decisiones principales.
5. Publicada mediante commit y push cuando se autorice.

## Lista de tareas

### 1. ✅ Crear categorías

**Hecho:** se corrigió la unicidad para que una categoría pertenezca al espacio financiero correspondiente y distintos usuarios puedan utilizar nombres iguales. También se preparó el SQL de actualización.

**Referencia:** commit `951c968` (`fix: scope expense categories by workspace`).

**Validación pendiente:** confirmar en producción que la migración SQL de categorías esté aplicada en Supabase.

### 2. ✅ Usar Agenda/Calendario para gastos e ingresos futuros

**Hecho:** una fecha seleccionada en Agenda se pasa al formulario. Desde allí se puede programar un gasto, programar un ingreso o registrar un movimiento realizado.

**Referencia:** commit `bf3e1bf` (`feat: schedule future activity from agenda`).

### 3. ✅ Permitir crear un gasto futuro

**Hecho:** Agenda presenta la acción “Programar gasto”. Se guarda como un compromiso programado y no descuenta dinero hasta que el usuario confirme el pago.

**Referencia:** incluido en `bf3e1bf`.

### 4. ✅ Cambiar “Más” para no confundirlo con el botón `+`

**Hecho localmente:**

- La pestaña inferior ahora se llama “Menú”.
- El ícono de tres puntos se reemplazó por un ícono de menú.
- La pantalla ahora se titula “Herramientas”.
- Las etiquetas de navegación dicen “Volver al menú”.

**Publicado:** incluido en `04e2a27` y desplegado en `main`. Queda únicamente la validación visual continua en celulares reales.

### 5. ✅ Hacer funcionar la IA en producción

**Hecho:** se configuró `GOOGLE_GENERATIVE_AI_API_KEY` en Vercel y se volvió a desplegar la aplicación. Nova funciona para usuarios autenticados.

**También se hizo:** Arca Gratis incluye 20 consultas mensuales, contador de uso y modal de mejora al agotar el cupo.

**Referencia:** commit `3463eca` (`feat: include Nova in the free plan`).

### 6. ✅ Hacer más intuitivas las unidades de negocio

**Problema:** un usuario personal no entiende qué es una unidad, cuándo debe crearla ni si es obligatoria.

**Hecho localmente:**

- El lenguaje visible ahora usa “Proyectos y actividades”; “Personal” queda como espacio automático.
- El formulario de movimientos oculta este selector cuando no existen proyectos y usa Personal sin pedir configuración.
- Cuando hay proyectos, el campo explica “¿De dónde viene este dinero?” o “¿A qué proyecto pertenece?”.
- Configuración permite crear, renombrar y archivar proyectos sin exponer claves internas.
- La vista de proyectos excluye Personal y explica el estado vacío.
- El onboarding pregunta si la persona usará solo finanzas personales o también proyectos, y puede crear el primero.
- Se añadió una migración de archivado seguro en `supabase/arca-business-units-archive.sql`.

**Publicado:** incluido en `04e2a27` y desplegado en `main`. La migración de archivado seguro debe permanecer aplicada en Supabase.

### 7. 🟡 Gestionar más elementos desde Configuración

**Ya existe:** administración de proyectos, conceptos de ingreso y categorías de gasto. Localmente también se agregó gestión de cuentas, efectivo, tarjetas de crédito y créditos bancarios: crear, editar datos y archivar de forma segura.

**Seguridad aplicada:** editar una cuenta no altera su saldo; archivar exige saldo en cero y conservar al menos otra cuenta activa. En tarjetas, editar condiciones no cambia la deuda utilizada y archivar exige deuda en cero. En créditos, editar condiciones no cambia el saldo pendiente ni las cuotas pagadas y solo se archivan créditos saldados. El flujo antiguo de Dinero también usa archivado seguro en lugar de eliminación física.

**Falta:** administrar préstamos entre personas, ahorros y otros datos estructurales desde Configuración.

### 8. ✅ Corregir completamente el botón Atrás en Configuración

**Hecho localmente:** Configuración vuelve exactamente una entrada del historial. Si fue la primera pantalla interna, regresa a Menú mediante reemplazo de estado, sin crear el ciclo Configuración → Menú → Configuración. La navegación también limpia marcadores residuales de overlays.

**Referencia:** commit `15e7289` (`feat: add mobile refresh and back navigation`).

**Falta:** validación física en Android/PWA del botón de cabecera y del botón Atrás del dispositivo.

### 9. ✅ Agregar más temas y elegirlos desde el onboarding

**Implementado:** los temas viven en una fuente compartida para Configuración y onboarding. Se conservaron Bronce, Neón, Océano y Claro, y se añadieron Bosque y Reserva.

**Experiencia:** el onboarding ahora incluye un paso visual con vista previa, aplica el tema al instante y conserva la preferencia para el resto de la app.

### 10. ✅ Agregar accesos rápidos para pagos e ingresos futuros

**Ya existe:** selector desde Agenda con “Programar gasto” y “Programar ingreso”.

**Implementado:** el FAB principal abre un menú breve con tres caminos: registrar algo ocurrido, programar un gasto y programar un ingreso. Los accesos futuros abren directamente el formulario y estado correctos, y explican que el saldo no cambia hasta confirmar la operación.

**Referencia:** commit `6366c15` (`feat: add future actions and flexible recurrences`).

### 11. ✅ Agregar recurrencias diarias, semanales y quincenales

**Implementado:** los ingresos esperados aceptan una sola vez, diario, semanal, cada dos semanas, quincenal o mensual. Diario, semanal y cada dos semanas usan la fecha inicial como ancla; quincenal exige dos días del mes y mensual permite uno o varios.

**Compatibilidad:** las recurrencias mensuales existentes conservan su frecuencia y sus días de pago. Las nuevas reglas se guardan en la misma plantilla y generan eventos futuros hasta su fecha final, cantidad de cobros o ventana de proyección.

### 12. ✅ Aclarar y calcular correctamente el número de repeticiones

**Implementado:** el formulario habla de cantidad de cobros y muestra un resumen antes de guardar con frecuencia, número real de ocurrencias y duración estimada.

**Ejemplo:** 24 cobros cada dos semanas se presentan como 24 ocurrencias y aproximadamente 11 meses, porque la duración va desde el primer cobro hasta el último.

### 13. 🟠 Permitir que Nova gestione toda la estructura financiera

**Ya existe:** Nova consulta saldos, movimientos, obligaciones y panorama financiero; también puede preparar movimientos, pagos e ingresos programados mediante herramientas con confirmación. Localmente ya puede consultar, crear, editar y archivar proyectos, cuentas, tarjetas y créditos bancarios mediante tarjetas visuales con aprobación humana.

**Implementado en este bloque:** Nova puede crear, editar y eliminar categorías y conceptos de ingreso; registrar préstamos entregados o recibidos; transferir entre cuentas; crear metas de ahorro y programar ingresos con las recurrencias de los puntos 11 y 12. Se suma al CRUD ya existente de proyectos, cuentas, tarjetas y créditos.

**Seguridad:** todas las escrituras requieren aprobación. Las herramientas vuelven a validar workspace, IDs, nombres visibles y saldos vigentes antes de ejecutar para no actuar sobre datos desactualizados.

**Feedback que debe quedar cubierto:**

- Nova no debe responder que “no tiene permiso” cuando la acción sí existe en Arca y el usuario tiene acceso a su propio espacio.
- Debe consultar primero las opciones válidas y trabajar con identificadores reales sin pedirle IDs técnicos al usuario.
- Crear, editar o eliminar categorías y conceptos de ingreso debe poder hacerse desde el chat.
- Los préstamos entre personas, transferencias, ahorros y estructuras nuevas deben incorporarse por bloques, conservando las mismas reglas del formulario manual.
- Toda escritura debe presentar confirmación humana, estado de procesamiento, resultado explícito y actualización de las vistas relacionadas.

### 14. 🟠 Mejorar las tarjetas de acciones de Nova

**Ya existe:** tarjeta visual para confirmar algunas acciones financieras.

**Implementado:** movimientos, pagos, transferencias y préstamos muestran cuenta, valor, saldo anterior, saldo resultante, fecha, categoría y efecto cuando esos datos existen. Los resultados reales de la herramienta tienen prioridad sobre lo solicitado inicialmente.

**Criterios de cierre:**

- La tarjeta previa a confirmar explica qué cambiará y qué no cambiará.
- Después de ejecutar, utiliza la salida real de la herramienta para mostrar el resultado; no repite únicamente los datos solicitados.
- Para gastos, ingresos, pagos y transferencias muestra el efecto en la cuenta cuando el backend pueda calcularlo con datos reales.
- Si un dato no está disponible, se omite en lugar de inventarlo.

### 15. 🟠 Crear tarjetas específicas para cada acción de Nova

**Implementado:** se añadieron tarjetas específicas para categorías, conceptos de ingreso, préstamos personales, transferencias y metas de ahorro, además de las ya existentes para movimientos, pagos, programación, proyectos, cuentas, tarjetas y créditos.

**Inventario mínimo solicitado:** categoría de gasto, concepto de ingreso, proyecto, cuenta, tarjeta, crédito, préstamo personal, movimiento, obligación futura, ingreso esperado, pago y transferencia.

**Estados comunes:** preparando, pendiente de confirmación, procesando, completado, cancelado y error. Cada estado debe ser visualmente reconocible sin depender de un párrafo largo de Nova.

### 16. 🟠 Hacer que Nova responda de forma más corta

**Implementado:** el prompt prioriza respuestas de una a tres frases, una sola línea después de una acción exitosa y evita repetir la información que ya aparece en la tarjeta. Solo amplía cuando el usuario pide explicación, comparación o análisis.

**Criterios de cierre:**

- Respuesta normal de una a cuatro líneas en móvil.
- Cuando exista una tarjeta, el texto no repite todos sus campos; confirma el resultado y propone como máximo un siguiente paso.
- Los análisis extensos solo aparecen cuando el usuario pide explicación, comparación o diagnóstico detallado.
- Evitar introducciones, disculpas y cierres genéricos que no aportan una decisión.

### 17. ⬜ Agregar loader y confirmación a las acciones de SuperAdmin

**Problema:** al cambiar planes o accesos no queda claro si la aplicación está trabajando.

**Pendiente:** overlay de procesamiento para acciones importantes, bloqueo temporal de controles y resultado explícito de éxito o error.

### 18. ⬜ Confirmar visualmente los cambios de acceso VIP y planes

**Pendiente:** mostrar qué usuario cambió, estado anterior, estado nuevo y confirmación final después de activar VIP, quitar VIP o cambiar el plan.

### 19. 🐞 Corregir cobros repetidos después de confirmar un pago

**Caso observado:** el cobro de Manuela siguió apareciendo en SuperAdmin después de confirmarlo.

**Pendiente:** revisar estados de factura/pago, actualización de caché y filtro de cobros abiertos para evitar duplicados o registros ya completados.

### 20. ⬜ Explicar capacidad y límites en “Uso de IA”

**Situación actual:** SuperAdmin muestra tokens consumidos, pero no da contexto sobre capacidad o costo.

**Pendiente:** investigar el límite vigente del proveedor y mostrar periodo, solicitudes, tokens de entrada/salida, costo estimado, errores y porcentaje de consumo. No presentar un límite fijo si depende del nivel o facturación del proyecto de Google.

### 21. ⬜ Simplificar la tarjeta de Nova en “Hoy”

**Pendiente:** reducir contenido visual, mejorar jerarquía y convertirla en una entrada clara a las capacidades de Nova.

### 22. ⬜ Reemplazar “Organizar mi semana” por un CTA funcional

**Problema:** el CTA actual no completa una acción clara.

**Pendiente:** cambiarlo por “Pídele algo a Nova” o una acción equivalente que abra una experiencia útil.

### 23. ⬜ Mostrar un modal corto con ejemplos de Nova

**Pendiente:** modal con instrucciones y ejemplos accionables como revisar pagos, programar un gasto, analizar movimientos o preparar la semana.

### 24. 🟡 Facilitar desde “Hoy” el acceso a Nova y al resumen financiero

**Ya existe:** tarjeta de resumen, acceso a Nova y entrada al resumen financiero.

**Falta:** mejorar protagonismo, claridad de los CTA y relación entre “Hoy”, Nova y el resumen completo.

### 25. ⬜ Abrir siempre las pantallas desde arriba

**Problema:** algunas pantallas conservan una posición intermedia de desplazamiento y desorientan al usuario.

**Pendiente:** restablecer el scroll del contenedor correcto al cambiar de pantalla, sin romper el estado de modales ni la navegación hacia atrás.

## Punto actual

Los puntos **13, 14, 15 y 16** están terminados localmente y pendientes de commit, despliegue y prueba conversacional en producción. El punto **7** continúa parcialmente abierto para administrar préstamos entre personas, ahorros y otras estructuras desde Configuración, aunque Nova ya puede crear los registros principales.

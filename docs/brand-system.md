# Arca Brand System

Arca es una herramienta de caja personal y operativa. La marca debe sentirse clara, sobria y confiable: menos app contable pesada, mas tablero ejecutivo para decidir que pagar, que mover y que no comprar.

## Principios

- Claridad primero: una pantalla debe responder rapido cuanto hay, que aprieta y cual es la siguiente decision.
- Contraste real: acciones primarias siempre usan `--accent` con `--on-accent`; nunca texto negro sobre azul.
- Premium sobrio: base clara, tinta fuerte, azul profundo y dorado contenido. Evitar beige plano o gradientes decorativos.
- Datos con jerarquia: dinero grande, estado pequeno, explicacion corta. No competir todo al mismo tamano.
- Baja friccion: las vistas deben terminar en acciones concretas como registrar, transferir, pagar, revisar o confirmar.

## Logo

Assets:

- `public/arca-logo.svg`: logo horizontal para sidebar, documentos y encabezados.
- `public/arca-mark.svg`: monograma para favicon, avatar, loading y espacios compactos.
- `src/app/icon.svg`: favicon de Next.js.

Uso:

- Usar el logo horizontal cuando haya 140 px o mas de ancho.
- Usar el mark cuando el espacio sea pequeno o cuadrado.
- No poner el logo sobre fondos de bajo contraste.
- No alterar el azul, dorado o proporcion del monograma.

## Color Tokens

| Token | Valor | Uso |
| --- | --- | --- |
| `--background` | `#f6f0e7` | Fondo general |
| `--foreground` | `#101010` | Texto principal |
| `--surface` | `#fffaf2` | Cards y paneles |
| `--surface-2` | `#eee3d5` | Sidebar, controles suaves |
| `--accent` | `#0f3554` | Accion primaria, nav activo, lineas clave |
| `--accent-hover` | `#09263f` | Hover de accion primaria |
| `--on-accent` | `#fffaf2` | Texto/iconos sobre `--accent` |
| `--accent-2` | `#a27734` | Detalles premium y barras secundarias |
| `--success` | `#0d6b51` | Caja suficiente, confirmado |
| `--warning` | `#96520e` | Requiere atencion o mover plata |
| `--danger` | `#9e2f24` | Mora, falta caja, riesgo |

Regla de contraste:

- Texto normal debe ir en `--foreground` o `--muted`, no en opacidades menores a 55%.
- Texto sobre azul debe usar `--on-accent` con la clase `.arca-primary-action` o `!text-[var(--on-accent)]`.
- Los estados de alerta usan color de texto fuerte mas fondo suave, no solo badges pastel.

## Tipografia

- Inter/system para interfaz.
- Numeros financieros en peso 600 o 700.
- Eyebrows en uppercase con tracking, pero no deben ser el contenido principal.
- Evitar titulares gigantes dentro del dashboard; reservarlos para explicar la decision del mes.

## Componentes

### Boton Primario

Usar `.arca-primary-action arca-focus`.

- Fondo: `--accent`
- Texto/icono: `--on-accent`
- Hover: `--accent-hover`
- Radio: 12 px

### Card

- Fondo `--surface`
- Borde `--line`
- Radio 16 px max para paneles.
- Cards anidadas solo para items repetidos o modales.

### Badges

- `success`: plata entra, pagado, caja suficiente.
- `warning`: requiere mover, pendiente, por confirmar.
- `danger`: vencido, falta caja, mora.
- `neutral`: contexto sin accion.

## Dashboard

Orden recomendado:

1. Lectura rapida del mes.
2. Metricas: caja actual, ingresos estimados, compromisos, libre despues de pagos.
3. Acciones: pagos urgentes, transferencias sugeridas, eventos por confirmar.
4. Graficas solo cuando ayudan a decidir.
5. Agenda de caja en orden cronologico.

## Pantallas

- Cuentas: formato billetera, saldo visible, rol de cada cuenta y advertencia de uso.
- Tarjetas: formato tarjeta fisica, cupo, utilizado, minimo, fecha de corte y fecha limite.
- Deudas: detalle modal con cuotas, tasa, total estimado y amortizacion.
- Calendario: debe evolucionar a cuadricula real y luego sincronizacion externa.
- Negocios: cada unidad debe mostrar ingresos esperados, cobrado, gastos y pendiente.

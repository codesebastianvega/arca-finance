# Arca seed inicial real

Fecha base: julio de 2026.

## Decisiones de modelado

- `transactions` sigue siendo la tabla operativa unificada que alimenta el dashboard.
- Las tablas nuevas (`incomes`, `expenses`, `debt_payments`, `credit_card_payments`, etc.) guardan trazabilidad especifica.
- `monthly_projections` guarda el escenario base julio-diciembre.
- `financial_events` guarda calendario/timeline futuro.
- El saldo inicial disponible se modelo como:
  - Efectivo: 100.000
  - Nequi: 200.000
- Claro hogar se separo en:
  - deuda anterior: 170.000
  - plan mensual futuro: 70.000
- Arriendo se separo en:
  - arriendo real: 820.000
  - gas / credito calentador: 100.000
- Solventa, deuda amigo y obligacion extraordinaria quedan como obligaciones de julio, no recurrentes.
- Sie Travel se modelo como ingresos netos operativos simplificados.

## Supuestos

- Moneda unica: COP.
- Falabella se estimo con saldo 918.000 por 6 cuotas de 153.000.
- Rappi Card se estimo con saldo 1.913.100 por 7 cuotas de 273.300.
- Codensa se estimo en 6 meses para que siga activo en proyeccion.
- Agosto usa saldo inicial proyectado de 1.072.700 como dato de referencia del usuario.
- Agua entra en agosto, octubre y diciembre como bimestral proyectada.
- Aluna queda como unidad de negocio sin ingresos proyectados fuertes.

## Como correr

1. Ejecutar `supabase/schema.sql` en Supabase SQL Editor.
2. Ejecutar `supabase/seed.sql` en Supabase SQL Editor.
3. Recargar Arca.

La app deberia mostrar `Supabase` si las tablas existen y la seed se cargo.

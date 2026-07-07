/\*
ARCA — Design tokens
Tema: "Arca de Noé" — madera cálida + oliva, con acentos de cobre
Estrategia de modo: [data-theme="dark"] en <html>, con fallback a
prefers-color-scheme para primera visita antes de que cargue la preferencia guardada.

Regla para el equipo/agente: NINGÚN componente debe usar un hex directo.
Todo color, borde, sombra y radio se referencia por variable. Esto es lo que
hace que "todo sea una sola cosa" — un solo lugar para ajustar el tema entero.
\*/

:root {
/_ ===== Superficies — 3 capas para dar profundidad sin sombra dura ===== _/
--bg-base: #F8F2E4; /_ fondo de página, tipo pergamino _/
--bg-surface-1: #FFFDF8; /_ tarjeta base _/
--bg-surface-2: #F1E8D4; /_ tarjeta elevada / hover / modal _/

/_ ===== Bordes ===== _/
--border: #E3D8C1;
--border-strong: #C9BA9A;
--border-top-highlight: rgba(255, 255, 255, 0.5); /_ canto iluminado en botones/cards _/

/_ ===== Texto ===== _/
--text-primary: #2A2117;
--text-secondary: #6B5F4B;
--text-muted: #94886F;
--text-on-accent: #211708; /_ texto sobre botón de acento (cobre) _/
--text-on-secondary: #14200B; /_ texto sobre oliva _/

/_ ===== Acento primario — cobre/madera (CTAs, foco, elementos premium) ===== _/
--accent: #A9713C;
--accent-hover: #97622F;
--accent-active: #7D5126;
--accent-soft: #EFE1C8; /_ fondo tenue para badges/estados usando el acento _/

/_ ===== Acento secundario — oliva (usado también como "positivo") ===== _/
--secondary: #5F7A44;
--secondary-hover: #4E6538;
--secondary-active: #3F5230;
--secondary-soft: #E4EAD8;

/_ ===== Semánticos ===== _/
--success: #5F7A44; /_ mismo oliva — coherencia visual con la marca _/
--success-soft: #E4EAD8;
--danger: #B84632;
--danger-soft: #F5E0D9;
--warning: #B9832A;
--warning-soft: #F3E7CE;

/_ ===== Radios y espaciado ===== _/
--radius-sm: 8px;
--radius-md: 12px;
--radius-lg: 16px;

/_ ===== Sombra cálida — usar en vez de sombra gris genérica ===== _/
--shadow-sm: 0 1px 2px rgba(42, 33, 23, 0.08);
--shadow-md: 0 2px 8px rgba(42, 33, 23, 0.10);
--shadow-focus: 0 0 0 3px rgba(169, 113, 60, 0.25); /_ anillo de foco en acento _/

/_ ===== Gradiente sutil para botón primario (no "glass", solo volumen) ===== _/
--accent-gradient: linear-gradient(180deg, #B98548 0%, #A9713C 100%);
}

[data-theme="dark"] {
--bg-base: #15110B;
--bg-surface-1: #1E1811;
--bg-surface-2: #271F16;

--border: #33291B;
--border-strong: #4A3B26;
--border-top-highlight: rgba(255, 255, 255, 0.06);

--text-primary: #F3ECDC;
--text-secondary: #B9AC90;
--text-muted: #7C7159;
--text-on-accent: #211708;
--text-on-secondary: #10160A;

--accent: #C68A45;
--accent-hover: #D89C56;
--accent-active: #A9713C;
--accent-soft: #3A2C18;

--secondary: #7A8F5C;
--secondary-hover: #8FA66A;
--secondary-active: #647A4C;
--secondary-soft: #2A3320;

--success: #8FA66A;
--success-soft: #2A3320;
--danger: #C1543A;
--danger-soft: #3A241C;
--warning: #D9A441;
--warning-soft: #3A2E18;

--shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.35);
--shadow-md: 0 4px 14px rgba(0, 0, 0, 0.4);
--shadow-focus: 0 0 0 3px rgba(198, 138, 69, 0.3);

--accent-gradient: linear-gradient(180deg, #D89C56 0%, #C68A45 100%);
}

@media (prefers-color-scheme: dark) {
:root:not([data-theme="light"]) {
/_ Duplicar aquí los mismos valores de [data-theme="dark"] como fallback
para la primera carga, antes de que el toggle guardado se aplique.
(El agente debe generar esto automáticamente a partir del bloque de arriba,
no mantenerlo a mano dos veces.) _/
}
}

/\*
===== Guía de uso para componentes =====

Botón primario (CTA único por pantalla):
background: var(--accent-gradient);
color: var(--text-on-accent);
border-top: 1px solid var(--border-top-highlight);
border-radius: var(--radius-sm);
box-shadow: var(--shadow-sm);

Botón secundario:
background: transparent;
color: var(--text-primary);
border: 1px solid var(--border-strong);
border-radius: var(--radius-sm);

Tarjeta (Cuentas, Tarjetas, Obligaciones):
background: var(--bg-surface-1);
border: 1px solid var(--border);
border-top: 1px solid var(--border-top-highlight);
border-radius: var(--radius-md);
box-shadow: var(--shadow-sm);

Tarjeta en hover / elevada:
background: var(--bg-surface-2);
box-shadow: var(--shadow-md);

Estado positivo (caja libre, pagos al día): color: var(--success); bg: var(--success-soft)
Estado de alerta (vencido, cupo alto): color: var(--danger); bg: var(--danger-soft)
Badge de plan Pro / Para Siempre: bg: var(--accent-soft); color: var(--accent)

Textura opcional para fondos grandes (hero, pantalla vacía de Dashboard):
aplicar un SVG de ruido a 3-4% de opacidad sobre --bg-base, nunca sobre superficies
con texto encima (rompe legibilidad). El agente puede usar una un patrón <feTurbulence>
como background-image de baja resolución repetido.
\*/

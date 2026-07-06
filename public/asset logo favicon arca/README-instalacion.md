# Assets de marca Arca — dónde va cada archivo

Todos generados a partir de `logo-mark.svg` (fuente maestra). No regenerar desde otro lugar.

## Dónde copiar cada archivo en el proyecto Next.js

```
public/favicon.ico                    ← favicon.ico
public/favicon-16x16.png              ← favicon-16x16.png
public/favicon-32x32.png              ← favicon-32x32.png
public/apple-touch-icon.png           ← apple-touch-icon-180x180.png (renombrar)
public/icon-192.png                   ← icon-192x192.png
public/icon-512.png                   ← icon-512x512.png
public/icon-maskable-512.png          ← icon-maskable-512x512.png
```

## Uso de cada SVG

- `logo-mark.svg` — ícono con fondo café sólido incluido. Usar donde se necesite el ícono aislado sobre cualquier superficie (redes sociales, og:image, splash screen).
- `logo-mark-transparent.svg` — mismo trazo sin fondo. Usar dentro del componente `<Logo />` de React, para que el fondo lo controle el CSS del contenedor (así respeta modo claro/oscuro).
- `logo-maskable.svg` — versión con más aire alrededor del trazo, exigida por Android para íconos "adaptive" (el sistema recorta en círculo o squircle; sin este padding se corta la punta de la A).
- `wordmark-dark.svg` / `wordmark-light.svg` — ícono + texto "ARCA", ya resueltos para cada modo. Usar en el header de la app en vez de armar el logo + texto por separado con CSS.

## Metadata en Next.js (app/layout.tsx o metadata export)

```ts
export const metadata = {
  icons: {
    icon: [
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  manifest: "/manifest.json",
};
```

## manifest.json (para cuando se active la fase PWA)

```json
{
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any" },
    { "src": "/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

## Regla importante

Si en algún momento se necesita otro tamaño o formato, regenerarlo desde `logo-mark.svg` o `logo-mark-transparent.svg` con una herramienta de rasterizado (rsvg-convert, o el equivalente en el pipeline del proyecto) — nunca redibujar el ícono a mano en otro archivo, para evitar que existan dos versiones ligeramente distintas del logo circulando en el proyecto.

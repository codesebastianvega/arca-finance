import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/app",
    name: "Arca con Nova",
    short_name: "Arca",
    description: "Tu agente financiera para organizar cuentas, pagos y decisiones con claridad.",
    start_url: "/app?source=pwa",
    scope: "/",
    display: "standalone",
    background_color: "#090B0A",
    theme_color: "#090B0A",
    orientation: "portrait",
    lang: "es-CO",
    categories: ["finance", "productivity"],
    icons: [
      {
        src: "/icons/arca-icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icons/arca-maskable.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}

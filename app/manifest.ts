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
        src: "/icons/arca-vault-192.png?v=5",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/arca-vault-512.png?v=5",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/arca-vault-maskable-512.png?v=5",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Dictar a Nova por voz",
        short_name: "Dictar por voz 🎙️",
        description: "Abrir Nova con micrófono activo para registrar gastos por voz con Siri o Google.",
        url: "/app?voice=true",
        icons: [{ src: "/icons/arca-vault-192.png?v=5", sizes: "192x192" }],
      },
      {
        name: "Escanear recibo 📸",
        short_name: "Escáner OCR 📸",
        description: "Abrir Nova para escanear facturas y comprobantes.",
        url: "/app?action=scan",
        icons: [{ src: "/icons/arca-vault-192.png?v=5", sizes: "192x192" }],
      },
    ],
  };
}

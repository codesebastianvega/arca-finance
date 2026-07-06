import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  applicationName: "Arca",
  title: {
    default: "Arca",
    template: "%s | Arca",
  },
  description: "Arca te ayuda a ordenar cuentas, deudas, tarjetas, ahorro y pagos del mes en un solo lugar.",
  icons: {
    icon: [{ url: "/favicon.ico" }, { url: "/icon-192.png", sizes: "192x192", type: "image/png" }],
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "Arca",
    description: "Tu dinero, claro y bajo control.",
    siteName: "Arca",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}

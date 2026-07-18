import type { Metadata, Viewport } from "next";
import { PwaProvider } from "@/src/features/pwa/pwa-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Arca con Nova",
    template: "%s · Arca",
  },
  description: "Tu agente financiera para organizar cuentas, pagos y decisiones con claridad.",
  applicationName: "Arca",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Arca",
  },
  formatDetection: { telephone: false },
  other: { "mobile-web-app-capable": "yes" },
};

export const viewport: Viewport = {
  colorScheme: "dark",
  themeColor: "#090B0A",
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="dark" suppressHydrationWarning>
      <body>
        <PwaProvider>{children}</PwaProvider>
      </body>
    </html>
  );
}

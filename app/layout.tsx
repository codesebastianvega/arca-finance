import type { Metadata, Viewport } from "next";
import { PwaProvider } from "@/src/features/pwa/pwa-provider";
import { ActionFeedbackProvider } from "@/src/features/feedback/action-feedback-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Arca con Nova",
    template: "%s · Arca",
  },
  description: "Tu agente financiera para organizar cuentas, pagos y decisiones con claridad.",
  applicationName: "Arca",
  icons: {
    icon: [
      { url: "/icons/arca-192.png?v=4", type: "image/png", sizes: "192x192" },
      { url: "/icons/arca-512.png?v=4", type: "image/png", sizes: "512x512" },
    ],
    shortcut: "/icons/arca-192.png?v=4",
    apple: [{ url: "/icons/arca-apple-180.png?v=4", sizes: "180x180", type: "image/png" }],
  },
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
        <PwaProvider><ActionFeedbackProvider>{children}</ActionFeedbackProvider></PwaProvider>
      </body>
    </html>
  );
}

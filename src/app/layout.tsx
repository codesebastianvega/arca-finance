import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  applicationName: "Arca Finance",
  title: {
    default: "Arca Finance",
    template: "%s | Arca Finance",
  },
  description: "Control financiero personal y operativo con claridad.",
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/arca-mark.svg",
  },
  openGraph: {
    title: "Arca Finance",
    description: "Control financiero personal y operativo con claridad.",
    siteName: "Arca Finance",
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

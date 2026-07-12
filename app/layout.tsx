import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Arca",
  description: "Control claro de dinero",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="dark" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}

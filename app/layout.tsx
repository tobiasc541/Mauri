import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sistema de Vendedores | Registro de contactos",
  description: "Registro interno de contactos para seguimiento comercial.",
  robots: { index: false, follow: false, nocache: true },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#070405", colorScheme: "dark" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Poppins:wght@500;600;700;800;900&family=Playfair+Display:ital,wght@1,400;1,600&family=JetBrains+Mono:wght@500;700&display=swap" />
      </head>
      <body>{children}</body>
    </html>
  );
}

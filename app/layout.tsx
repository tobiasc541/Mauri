import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sistema de Vendedores | Registro de contactos",
  description: "Registro interno de contactos para seguimiento comercial.",
  robots: { index: false, follow: false, nocache: true },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#f6f8fb" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es"><body>{children}</body></html>;
}

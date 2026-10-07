import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "Atención al cliente | Santiago Papelería" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}

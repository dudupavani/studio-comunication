// src/app/layout.tsx
import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";
import { RegisterSW } from "@/components/register-sw";

/** ⬇️ Importa o provider cliente para contexto de autenticação/roles */
import { AuthProvider } from "@/hooks/use-auth-context";

export const metadata: Metadata = {
  title: "My Saas",
  description: "Future is here.",
  applicationName: "My Saas",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "My Saas",
  },
  formatDetection: {
    telephone: false,
    email: false,
    address: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <head>
        {/* eslint-disable @next/next/no-page-custom-font */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        {/* eslint-enable @next/next/no-page-custom-font */}
      </head>
      <body className={cn("font-body antialiased h-screen bg-background")}>
        <RegisterSW />
        {/* Provider de auth precisa envolver a árvore para disponibilizar o contexto */}
        <AuthProvider>
          <div className="flex flex-col min-h-screen">
            <main className="flex-1 overflow-x-hidden">{children}</main>
          </div>
        </AuthProvider>

        {/* Toaster global para notificações */}
        <Toaster />
      </body>
    </html>
  );
}

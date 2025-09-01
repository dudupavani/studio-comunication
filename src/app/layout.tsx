import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";

/** ⬇️ Importa o provider cliente para contexto de autenticação/roles */
import { AuthProvider } from "@/hooks/use-auth-context";

export const metadata: Metadata = {
  title: "My Saas",
  description: "Future is here.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <head>
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
      </head>
      <body className={cn("font-body antialiased h-screen bg-background")}>
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

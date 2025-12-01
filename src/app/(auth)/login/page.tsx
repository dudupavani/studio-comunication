import { LoginForm } from "@/components/auth/login-form";
import Link from "next/link";

export default function LoginPage() {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden bg-muted lg:block">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-muted" />
        <div className="relative flex h-full flex-col justify-between p-10 text-primary-foreground">
          <div>
            <Link
              href="/"
              className="text-lg font-semibold text-primary">
              Studio
            </Link>
          </div>
          <div className="space-y-2 text-primary-foreground">
            <h1 className="text-4xl font-bold">Bem-vindo de volta</h1>
            <p className="text-lg text-primary-foreground/80">
              O lugar onde sua organização centraliza comunicação, equipes e
              conteúdos de aprendizagem.
            </p>
          </div>
          <p className="text-sm text-primary-foreground/60">
            © {new Date().getFullYear()} Studio. Todos os direitos reservados.
          </p>
        </div>
      </div>
      <div className="flex items-center justify-center px-6 py-12">
        <LoginForm />
      </div>
    </div>
  );
}

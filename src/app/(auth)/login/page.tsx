import { LoginForm } from "@/components/auth/login-form";
import Link from "next/link";

export default function LoginPage() {
  return (
    <div className="grid w-full min-h-screen lg:grid-cols-2">
      <div className="relative hidden lg:block">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: 'url("/images/login-image.webp")' }}
        />
        <div className="relative flex h-full flex-col justify-center p-10 text-white">
          <div className="space-y-2 text-white">
            <h1 className="text-5xl font-bold">Bem-vindo de volta</h1>
            <p className="text-2xl">
              O lugar onde sua organização centraliza comunicação, equipes e
              conteúdos de aprendizagem.
            </p>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-center px-6 py-12">
        <LoginForm />
      </div>
    </div>
  );
}

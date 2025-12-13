"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthContext } from "@/hooks/use-auth-context";

export default function StartPage() {
  const router = useRouter();
  const { loading, auth, error } = useAuthContext();

  useEffect(() => {
    if (loading) return;
    router.replace(auth ? "/dashboard" : "/login");
  }, [auth, loading, router]);

  return (
    <section className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-md text-center">
        <h1>Abrindo…</h1>
        <p>
          {error
            ? "Não foi possível validar sua sessão. Verifique sua conexão e tente novamente."
            : "Preparando a sua experiência."}
        </p>
      </div>
    </section>
  );
}


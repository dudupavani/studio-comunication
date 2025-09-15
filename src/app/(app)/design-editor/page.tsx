// src/app/(app)/design-editor/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Plus } from "lucide-react";

type DesignFile = {
  id: string;
  title: string;
  thumbnail_url?: string;
};

export default function DesignFilesPage() {
  const [files, setFiles] = useState<DesignFile[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Buscar arquivos reais do Supabase via nossa API
  useEffect(() => {
    const fetchFiles = async () => {
      try {
        const res = await fetch(`/api/design-files?ts=${Date.now()}`, {
          cache: "no-store",
        });
        const data = await res.json();
        setFiles(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Erro ao buscar arquivos:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchFiles();
  }, []);

  // Criar novo arquivo
  const handleCreate = async () => {
    try {
      const res = await fetch("/api/design-files", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          org_id: "62a83173-9a71-400f-bbee-af44126029b3", // ⚠️ fixo por enquanto
          user_id: "77fca553-9e73-414d-a815-2aba4b91a3c0", // ⚠️ fixo por enquanto
          title: "Novo arquivo",
          data: {},
        }),
      });

      const file = await res.json();

      if (file?.id) {
        router.push(`/design-editor/${file.id}`);
      }
    } catch (err) {
      console.error("Erro ao criar arquivo:", err);
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Biblioteca</h1>
        <Button onClick={handleCreate}>
          <Plus size={22} />
          Criar
        </Button>
      </div>

      {loading ? (
        <div className="flex flex-col gap-3 items-center justify-center py-10 text-gray-500">
          <Spinner size="lg" />
          <span>Carregando...</span>
        </div>
      ) : files.length === 0 ? (
        <p className="text-gray-500">Nenhum arquivo encontrado.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {files.map((file) => (
            <Link
              key={file.id}
              href={`/design-editor/${file.id}`}
              className="rounded-md overflow-hidden border border-gray-200 hover:border-gray-400 hover:shadow-lg transition">
              <div className="aspect-video bg-gray-100">
                {file.thumbnail_url ? (
                  <img
                    src={file.thumbnail_url}
                    alt={file.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    Sem preview
                  </div>
                )}
              </div>
              <div className="py-3 px-4 font-medium text-gray-800 text-base sm:text-sm">
                {file.title}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

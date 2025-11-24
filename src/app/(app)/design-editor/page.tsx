// src/app/(app)/design-editor/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Plus, Trash } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

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

  // Excluir arquivo
  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/design-files/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Falha ao excluir");
      setFiles((prev) => prev.filter((f) => f.id !== id));
    } catch (err) {
      console.error("Erro ao excluir arquivo:", err);
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
            <div
              key={file.id}
              className="relative rounded-md overflow-hidden border border-gray-200 hover:border-gray-400 hover:shadow-lg transition group">
              {/* botão delete visível só no hover */}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    className="absolute top-1 right-1 w-6 h-6 bg-white shadow opacity-0 group-hover:opacity-100 transition"
                    variant={"secondary"}
                    size={"icon-sm"}>
                    <Trash size={14} />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Excluir arquivo</AlertDialogTitle>
                    <AlertDialogDescription>
                      Tem certeza que deseja excluir “{file.title}”? Essa ação
                      não pode ser desfeita.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => handleDelete(file.id)}
                      className="bg-red-600 hover:bg-red-700 text-white">
                      Excluir
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <Link href={`/design-editor/${file.id}`}>
                <div className="relative aspect-video bg-gray-100">
                  {file.thumbnail_url ? (
                    <Image
                      src={file.thumbnail_url}
                      alt={file.title}
                      fill
                      sizes="320px"
                      className="object-cover"
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
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

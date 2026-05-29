"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface UseMultiSelectOptions {
  endpoint: string;
  apiBase?: string;
  errorTitle?: string;
}

interface LoadOptions {
  append: boolean;
  cursor?: string;
  query: string;
}

export function useMultiSelect<T>({
  endpoint,
  apiBase = "/api/users/recipients",
  errorTitle = "Erro ao carregar itens",
}: UseMultiSelectOptions) {
  const { toast } = useToast();
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState<string | undefined>();
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(false);

  const load = useCallback(
    async ({ append, cursor: cursorArg, query: queryArg }: LoadOptions) => {
      if (abortRef.current) abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.set("limit", "20");
        if (queryArg) params.set("q", queryArg);
        if (cursorArg) params.set("cursor", cursorArg);

        const res = await fetch(`${apiBase}/${endpoint}?${params.toString()}`, {
          credentials: "include",
          cache: "no-store",
          signal: controller.signal,
        });
        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as any;
          throw new Error(body?.error?.message || `HTTP ${res.status}`);
        }
        const payload = (await res.json()) as { items: T[]; nextCursor?: string };
        setItems((prev) => (append ? [...prev, ...payload.items] : payload.items));
        setCursor(payload.nextCursor);
      } catch (err: any) {
        if (err?.name === "AbortError") return;
        console.error(`useMultiSelect(${endpoint}) error`, err);
        toast({
          title: errorTitle,
          description: err?.message ?? "Tente novamente.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    },
    [apiBase, endpoint, errorTitle, toast]
  );

  useEffect(() => {
    load({ append: false, cursor: undefined, query: "" });
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      abortRef.current?.abort();
    };
  }, [load]);

  useEffect(() => {
    if (!mountedRef.current) { mountedRef.current = true; return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      load({ append: false, cursor: undefined, query });
    }, 300);
  }, [query, load]);

  return { items, loading, query, setQuery, cursor, load };
}

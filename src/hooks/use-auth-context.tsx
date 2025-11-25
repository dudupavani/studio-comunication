// src/hooks/use-auth-context.tsx
"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import type { PlatformRole, OrgRole, UnitRole } from "@/lib/types/roles";

/** Tipos do contexto (espelhando src/lib/auth-context.ts, mas sem importar server code) */
export type { PlatformRole, OrgRole, UnitRole };

export type AuthContextData = {
  userId: string;
  platformRole: PlatformRole | null;
  orgRole: (OrgRole | UnitRole) | null;
  orgId: string | null;
  unitIds: string[];
};

type State =
  | { status: "idle" | "loading"; auth: null }
  | { status: "ready"; auth: AuthContextData }
  | { status: "error"; auth: null; error: string };

const Ctx = createContext<{
  state: State;
  refresh: () => Promise<void>;
}>({
  state: { status: "idle", auth: null },
  refresh: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<State>({ status: "loading", auth: null });

  const fetchMe = useCallback(async () => {
    setState({ status: "loading", auth: null });
    try {
      const res = await fetch("/api/me", { credentials: "include" });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        const msg = j?.error || `HTTP ${res.status}`;
        setState({ status: "error", auth: null, error: msg });
        return;
      }
      const json = await res.json();
      setState({ status: "ready", auth: json.data as AuthContextData });
    } catch (e: any) {
      setState({
        status: "error",
        auth: null,
        error: e?.message ?? "Falha ao carregar contexto",
      });
    }
  }, []);

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  return (
    <Ctx.Provider value={{ state, refresh: fetchMe }}>{children}</Ctx.Provider>
  );
}

/** Hook simples para consumir o contexto */
export function useAuthContext() {
  const { state, refresh } = useContext(Ctx);
  return {
    loading: state.status === "loading" || state.status === "idle",
    error: state.status === "error" ? state.error : null,
    auth: state.status === "ready" ? state.auth : null,
    refresh,
  };
}

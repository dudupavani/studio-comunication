"use client";

import { useEffect } from "react";

export default function FinalizeInviteCSR() {
  useEffect(() => {
    // Chamada idempotente: se já finalizou, o endpoint faz noop
    fetch("/api/auth/finalize-invite", {
      method: "POST",
      credentials: "include",
      cache: "no-store",
    }).catch(() => {
      // silencioso: não quebrar a UI se falhar
    });
  }, []);

  return null;
}

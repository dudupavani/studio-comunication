"use client";

import { useEffect } from "react";

export function RegisterSW() {
  useEffect(() => {
    if (
      typeof window === "undefined" ||
      process.env.NODE_ENV !== "production" ||
      !("serviceWorker" in navigator)
    ) {
      return;
    }

    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        reg.onupdatefound = () => {
          const installing = reg.installing;
          if (!installing) return;

          installing.onstatechange = () => {
            if (
              installing.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              // Nova versão disponível; manter apenas log silencioso.
              // Caso queira, é possível integrar aqui um toast pedindo recarregamento.
              console.log("Nova versão do aplicativo PWA disponível.");
            }
          };
        };
      })
      .catch((err) => {
        console.error("SW registration failed", err);
      });
  }, []);

  return null;
}

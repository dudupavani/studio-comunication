// src/app/manifest.ts
import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "My Saas",
    short_name: "My Saas",
    // Evita `start_url` que depende de redirect server-side (ex.: auth), pois em alguns
    // navegadores/PWA a navegação pode ser respondida pelo service worker com o HTML final
    // e manter a URL original, causando mismatch/hidratação e tela preta.
    start_url: "/start?source=pwa",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#004FFF",
    theme_color: "#ffffff",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/icons/icon-maskable.png",
        sizes: "512x512",
        type: "image/png",
        // Next's manifest typings still miss the combined purpose token.
        // @ts-expect-error required maskable icon uses "any maskable".
        purpose: "any maskable",
      },
    ],
    shortcuts: [
      {
        name: "Abrir aplicativo",
        short_name: "Início",
        url: "/start?source=pwa-shortcut",
        icons: [
          {
            src: "/icons/icon-192.png",
            sizes: "192x192",
            type: "image/png",
          },
        ],
      },
    ],
  };
}

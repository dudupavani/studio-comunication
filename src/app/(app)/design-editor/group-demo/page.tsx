"use client";

import dynamic from "next/dynamic";
import React from "react";

const CanvasGroupDemo = dynamic(() => import("./CanvasGroupDemo"), {
  ssr: false,
  loading: () => (
    <p style={{ height: "100vh", textAlign: "center" }}>Carregando Editor...</p>
  ),
});

export default function GroupDemoPage() {
  return (
    <div
      style={{ height: "100vh", width: "100vw", backgroundColor: "#f0f0f0" }}>
      <CanvasGroupDemo />
    </div>
  );
}

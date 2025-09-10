"use client";

import React from "react";
import { EditorProvider } from "@/app/(app)/design-editor/minimal/editor/store";
import { Sidebar } from "@/app/(app)/design-editor/minimal/editor/Sidebar";
import { StageView } from "@/app/(app)/design-editor/minimal/editor/StageView";

export default function CanvasMinimal() {
  return (
    <EditorProvider>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "280px 1fr",
          height: "100vh",
          width: "100vw",
        }}>
        <Sidebar />
        <StageView />
      </div>
    </EditorProvider>
  );
}

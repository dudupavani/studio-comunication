"use client";
import dynamic from "next/dynamic";

const CanvasMinimal = dynamic(() => import("./minimal/CanvasMinimal"), {
  ssr: false,
});

export default function DesignEditorPage() {
  return <CanvasMinimal />;
}

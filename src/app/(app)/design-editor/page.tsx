// src/app/(app)/design-editor/page.tsx
import EditorShell from "@/components/design-editor/EditorShell";

export const metadata = { title: "Design Editor" };

export default function DesignEditorPage() {
  return (
    <div>
      <EditorShell />
    </div>
  );
}

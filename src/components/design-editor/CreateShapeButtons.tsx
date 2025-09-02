"use client";

import { Button } from "@/components/ui/button";
import { useDesignEditor } from "@/hooks/design-editor/use-design-editor";

export default function CreateShapeButtons() {
  const { create } = useDesignEditor();

  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" size="sm" onClick={() => create("text")}>
        + Texto
      </Button>
      <Button variant="outline" size="sm" onClick={() => create("rect")}>
        + Retângulo
      </Button>
      <Button variant="outline" size="sm" onClick={() => create("circle")}>
        + Círculo
      </Button>
      <Button variant="outline" size="sm" onClick={() => create("triangle")}>
        + Triângulo
      </Button>
      <Button variant="outline" size="sm" onClick={() => create("line")}>
        + Linha
      </Button>
      <Button variant="outline" size="sm" onClick={() => create("star")}>
        + Estrela
      </Button>
    </div>
  );
}

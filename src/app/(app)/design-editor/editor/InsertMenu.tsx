// src/app/(app)/design-editor/editor/InsertMenu.tsx
"use client";

import { useEditor } from "./store";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Type, ImageIcon, Box } from "lucide-react";

export default function InsertMenu({
  onOpenShapes,
  onOpenImages,
}: {
  onOpenShapes: () => void;
  onOpenImages: () => void;
}) {
  const { api } = useEditor();

  return (
    <div className="flex flex-col items-center gap-3 p-2 h-full w-16 bg-background">
      <TooltipProvider delayDuration={200}>
        {/* Texto */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="rounded-xl"
              onClick={() => api.addText()}>
              <Type className="h-5 w-5" />
              <span className="sr-only">Inserir texto</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">Adicionar Texto</TooltipContent>
        </Tooltip>

        {/* Formas */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="rounded-xl"
              onClick={onOpenShapes}>
              <Box className="h-5 w-5" />
              <span className="sr-only">Formas</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">Formas</TooltipContent>
        </Tooltip>

        {/* Imagens */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="rounded-xl"
              onClick={onOpenImages}>
              <ImageIcon className="h-5 w-5" />
              <span className="sr-only">Imagens</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">Imagens</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}

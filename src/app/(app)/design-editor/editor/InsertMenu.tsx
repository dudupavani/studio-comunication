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
import { Type, ImageIcon, Box, Frame } from "lucide-react";

export default function InsertMenu({
  onOpenShapes,
  onOpenImages,
  onOpenStage,
}: {
  onOpenShapes: () => void;
  onOpenImages: () => void;
  onOpenStage: () => void;
}) {
  const { api } = useEditor();

  return (
    <div className="flex flex-col items-center gap-3 p-2 h-full w-16 bg-background">
      <TooltipProvider delayDuration={200}>
        {/* Texto */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="secondary"
              size="icon"
              onClick={() => api.addText()}>
              <Type size={22} />
              <span className="sr-only">Texto</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">Texto</TooltipContent>
        </Tooltip>

        {/* Formas */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="secondary" size="icon" onClick={onOpenShapes}>
              <Box size={22} />
              <span className="sr-only">Formas</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">Formas</TooltipContent>
        </Tooltip>

        {/* Imagens */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="secondary" size="icon" onClick={onOpenImages}>
              <ImageIcon size={22} />
              <span className="sr-only">Imagens</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">Imagens</TooltipContent>
        </Tooltip>

        {/* Stage */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="secondary" size="icon" onClick={onOpenStage}>
              <Frame size={22} />
              <span className="sr-only">Artboard</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">Artboard</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}

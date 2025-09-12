"use client";

import { useEditor } from "./store";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Text } from "lucide-react";

export default function InsertMenu() {
  const { api } = useEditor();

  return (
    <div className="flex flex-col items-center gap-4 p-2 w-16 border-r bg-background">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              onClick={() => api.addText()}
              className="rounded-xl"
            >
              <Text className="h-5 w-5" />
              <span className="sr-only">Inserir texto</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>Adicionar Texto</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}

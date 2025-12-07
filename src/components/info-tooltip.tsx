"use client";

import { Info } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface InfoTooltipProps {
  message: string;
  className?: string;
}

export function InfoTooltip({ message, className }: InfoTooltipProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Mais informações"
          className={cn(
            "text-muted-foreground hover:text-primary transition-colors",
            className
          )}>
          <Info className="h-4 w-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="max-w-xs text-xs leading-relaxed" align="end">
        {message}
      </PopoverContent>
    </Popover>
  );
}

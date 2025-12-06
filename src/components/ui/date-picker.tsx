"use client";

import * as React from "react";
import { Calendar as CalendarIcon } from "lucide-react";
import { format, parseISO } from "date-fns";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

type DatePickerProps = {
  value?: string | null;
  onChange?: (value: string | null) => void;
  placeholder?: string;
  className?: string;
  onOpenChange?: (open: boolean) => void;
};

function safeParseDate(value?: string | null) {
  if (!value) return undefined;
  try {
    const parsed = parseISO(value);
    return Number.isNaN(parsed?.getTime()) ? undefined : parsed;
  } catch {
    return undefined;
  }
}

export function DatePicker({
  value,
  onChange,
  placeholder,
  className,
  onOpenChange,
}: DatePickerProps) {
  const date = safeParseDate(value);

  const handleSelect = (selected: Date | undefined) => {
    onChange?.(selected ? format(selected, "yyyy-MM-dd") : null);
  };

  return (
    <Popover onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn(
            "w-full justify-between text-left text-primary font-normal bg-muted focus:outline-none focus:ring-1 focus:ring-ring focus:ring-offset-2 focus:bg-white",
            !date && "text-muted-foreground",
            className
          )}>
          {date
            ? format(date, "dd/MM/yyyy")
            : placeholder ?? "Selecione a data"}
          <CalendarIcon className="mr-2 h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-0"
        align="start"
        data-datepicker-content="true">
        <Calendar
          mode="single"
          selected={date}
          onSelect={handleSelect}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}

"use client";

import * as React from "react";
import * as RadioGroupPrimitive from "@radix-ui/react-radio-group";

import { cn } from "@/lib/utils";

type RadioChoiceCardProps = React.ComponentPropsWithoutRef<
  typeof RadioGroupPrimitive.Item
> & {
  title: React.ReactNode;
  description?: React.ReactNode;
};

const RadioChoiceCard = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Item>,
  RadioChoiceCardProps
>(({ className, title, description, ...props }, ref) => {
  return (
    <RadioGroupPrimitive.Item
      ref={ref}
      className={cn(
        "group flex w-full items-start justify-between gap-4 rounded-2xl border border-border bg-background p-5 text-left ring-offset-background transition-colors hover:bg-accent/30 hover:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:border-foreground data-[state=checked]:bg-accent/20",
        className,
      )}
      {...props}>
      <div className="min-w-0 space-y-1">
        <div className="text-base font-semibold leading-tight text-foreground">
          {title}
        </div>
        {description ? (
          <p className="text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>

      <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-border bg-white transition-colors group-data-[state=checked]:border-foreground">
        <RadioGroupPrimitive.Indicator className="flex items-center justify-center">
          <span className="h-3.5 w-3.5 rounded-full bg-foreground" />
        </RadioGroupPrimitive.Indicator>
      </span>
    </RadioGroupPrimitive.Item>
  );
});

RadioChoiceCard.displayName = "RadioChoiceCard";

export { RadioChoiceCard };

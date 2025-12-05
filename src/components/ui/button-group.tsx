"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonGroupProps
  extends React.HTMLAttributes<HTMLDivElement> {}

const ButtonGroup = React.forwardRef<HTMLDivElement, ButtonGroupProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "inline-flex items-center overflow-hidden rounded-md border border-input bg-background shadow-sm",
        className
      )}
      {...props}
    />
  )
);
ButtonGroup.displayName = "ButtonGroup";

export { ButtonGroup };

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2 py-0.5 gap-1.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80 space-x-2",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80 space-x-2",
        destructive: "border-transparent bg-red-500 text-white space-x-2",
        outline: "text-foreground space-x-2",
        green: "border-transparent bg-green-500 text-white space-x-2",
        orange: "border-transparent bg-orange-500 text-white space-x-2",
        blue: "border-transparent bg-blue-500 text-white space-x-2",
        violet: "border-transparent bg-violet-500 text-white space-x-2",
        yellow: "border-transparent bg-yellow-500 text-white space-x-2",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };

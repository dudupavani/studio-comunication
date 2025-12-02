import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center truncate rounded-md border px-2 py-0.5 gap-1.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground space-x-2",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground space-x-1",
        destructive: "border-transparent bg-red-100 text-red-800 space-x-1",
        outline: "text-foreground space-x-1",
        green: "border-transparent bg-green-100 text-green-800 space-x-1",
        orange: "border-transparent bg-orange-100 text-orange-800 space-x-1",
        blue: "border-transparent bg-blue-100 text-blue-800 space-x-2",
        violet: "border-transparent bg-violet-100 text-violet-800 space-x-1",
        pink: "border-transparent bg-pink-100 text-pink-800 space-x-1",
        yellow: "border-transparent bg-yellow-100 text-yellow-700 space-x-1",
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

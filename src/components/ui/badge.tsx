import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center truncate rounded-md border px-2 py-0.5 gap-1 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 [&_svg]:size-[12px]",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        secondary: "border-transparent bg-secondary",
        destructive: "border-transparent bg-red-100 text-red-800",
        outline: "border-border text-foreground",
        green: "border-transparent bg-green-100 text-green-700",
        orange: "border-transparent bg-orange-100 text-orange-800",
        blue: "border-transparent bg-blue-100 text-blue-800",
        violet: "border-transparent bg-violet-100 text-violet-800",
        pink: "border-transparent bg-pink-100 text-pink-800",
        yellow: "border-transparent bg-yellow-100 text-yellow-700",
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

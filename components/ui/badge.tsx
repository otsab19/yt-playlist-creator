import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-[var(--bg-input)] text-[var(--fg-muted)]",
        found: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400",
        error: "bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400",
        manual: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400",
        loading: "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400",
        pending: "bg-[var(--bg-input)] text-[var(--fg-faint)]",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };

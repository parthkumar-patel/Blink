import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center cute-rounded border px-2.5 py-0.5 text-xs font-semibold transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 hover:scale-105",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80 cute-glow",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80 cute-soft-shadow",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80 cute-soft-shadow",
        outline: "text-foreground cute-border-glow",
        cute: "border-transparent cute-gradient-pink text-white cute-glow hover:cute-glow-strong",
        neon: "border-cute-pink bg-transparent text-cute-pink cute-glow-strong hover:bg-cute-pink hover:text-card",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
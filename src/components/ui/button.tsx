import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap cute-rounded text-sm font-medium transition-all duration-300 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive hover:scale-105 active:scale-95",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground cute-soft-shadow hover:bg-primary/90 cute-glow",
        destructive:
          "bg-destructive text-white cute-soft-shadow hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        outline:
          "border bg-background cute-soft-shadow hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50 cute-border-glow",
        secondary:
          "bg-secondary text-secondary-foreground cute-soft-shadow hover:bg-secondary/80 cute-glow",
        ghost:
          "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50 hover:cute-glow",
        link: "text-primary underline-offset-4 hover:underline cute-text-glow",
        "cute-gradient": 
          "cute-gradient-pink text-white cute-soft-shadow hover:scale-110 cute-glow-strong",
        "neon-glow":
          "bg-card border-2 border-cute-pink text-cute-pink cute-glow-strong hover:bg-cute-pink hover:text-card hover:cute-glow-pulse",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 cute-rounded gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-10 cute-rounded-lg px-6 has-[>svg]:px-4",
        icon: "size-9 cute-rounded",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }

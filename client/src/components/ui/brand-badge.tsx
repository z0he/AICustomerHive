import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const brandBadgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-[#0082AE] text-white shadow hover:bg-[#0082AE]/80",
        secondary:
          "border-transparent bg-[#00556E] text-white shadow hover:bg-[#00556E]/80",
        accent:
          "border-transparent bg-[#8AC33E] text-white shadow hover:bg-[#8AC33E]/80",
        accentLight:
          "border-transparent bg-[#C4E27E] text-[#00556E] shadow hover:bg-[#C4E27E]/80",
        outline: "text-foreground",
        success: "border-transparent bg-green-500 text-white shadow hover:bg-green-500/80",
        warning: "border-transparent bg-yellow-500 text-white shadow hover:bg-yellow-500/80",
        danger: "border-transparent bg-red-500 text-white shadow hover:bg-red-500/80",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BrandBadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof brandBadgeVariants> {}

function BrandBadge({ className, variant, ...props }: BrandBadgeProps) {
  return (
    <div className={cn(brandBadgeVariants({ variant }), className)} {...props} />
  )
}

export { BrandBadge, brandBadgeVariants }
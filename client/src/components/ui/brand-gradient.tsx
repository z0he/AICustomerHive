import React from "react";
import { cn } from "@/lib/utils";

interface BrandGradientProps {
  children: React.ReactNode;
  className?: string;
  direction?: "top-to-bottom" | "left-to-right" | "diagonal";
}

const BrandGradient: React.FC<BrandGradientProps> = ({
  children,
  className,
  direction = "diagonal",
}) => {
  const gradientClasses = {
    "top-to-bottom": "bg-gradient-to-b from-[#0082AE] to-[#8AC33E]",
    "left-to-right": "bg-gradient-to-r from-[#0082AE] to-[#8AC33E]",
    "diagonal": "bg-gradient-to-br from-[#0082AE] to-[#8AC33E]",
  };

  return (
    <div className={cn(gradientClasses[direction], className)}>
      {children}
    </div>
  );
};

export { BrandGradient };
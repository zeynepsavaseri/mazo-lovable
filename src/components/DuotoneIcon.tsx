import { cn } from "@/lib/utils";
import type { LucideProps } from "lucide-react";
import React from "react";

interface DuotoneIconProps extends LucideProps {
  icon: React.ComponentType<LucideProps>;
  /** The fill opacity for the duotone background layer (0-1). Default 0.15 */
  fillOpacity?: number;
}

/**
 * Renders a Lucide icon with a duotone effect:
 * a semi-transparent fill + a solid stroke in the current color.
 */
export function DuotoneIcon({
  icon: Icon,
  fillOpacity = 0.15,
  className,
  color,
  ...props
}: DuotoneIconProps) {
  return (
    <Icon
      className={cn(className)}
      fill="currentColor"
      fillOpacity={fillOpacity}
      strokeWidth={1.5}
      color={color}
      {...props}
    />
  );
}

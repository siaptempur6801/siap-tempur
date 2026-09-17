import * as React from "react";
import { cn } from "@/lib/utils";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "yellow" | "blue" | "pink" | "green" | "white" | "red";
  rotate?: number;
  animated?: boolean;
}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = "yellow", rotate = 0, animated = false, ...props }, ref) => {
    const variants = {
      yellow: "bg-yellow-200 border-gray-800",
      blue: "bg-blue-100 text-blue-700 border-blue-200",
      pink: "bg-pink-100 text-pink-700 border-pink-200",
      green: "bg-green-200 border-gray-800",
      white: "bg-white border-gray-800",
      red: "bg-red-600 text-white border-red-700 shadow-lg",
    };

    return (
      <span
        ref={ref}
        style={{ transform: rotate ? `rotate(${rotate}deg)` : undefined }}
        className={cn(
          "inline-flex items-center gap-2 px-4 py-1.5 font-display text-lg font-bold border-2 rounded-sm shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]",
          animated && "animate-pulse",
          variants[variant],
          className
        )}
        {...props}
      />
    );
  }
);

Badge.displayName = "Badge";

export { Badge };

import * as React from "react";
import { cn } from "@/lib/utils";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "standard" | "binder" | "sketch";
  rotate?: number;
  interactive?: boolean;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = "standard", rotate = 0, interactive = false, ...props }, ref) => {
    const variants = {
      standard: "bg-[#fdfbf7] border-2 border-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]",
      binder: "bg-[#fffdeb] border-4 border-blue-600 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]",
      sketch: "bg-white border-2 border-gray-900 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]",
    };

    return (
      <div
        ref={ref}
        style={{ transform: rotate ? `rotate(${rotate}deg)` : undefined }}
        className={cn(
          "rounded-xl transition-all duration-300",
          variants[variant],
          interactive && "hover:shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1",
          className
        )}
        {...props}
      />
    );
  }
);

Card.displayName = "Card";

export { Card };

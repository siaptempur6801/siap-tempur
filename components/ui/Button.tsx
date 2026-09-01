import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger" | "success" | "warning" | "white";
  size?: "sm" | "md" | "lg" | "xl";
  handwriting?: boolean;
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", handwriting = true, asChild = false, ...props }, ref) => {
    const variants = {
      primary: "bg-blue-600 text-white hover:bg-white hover:text-blue-600 border-2 border-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]",
      secondary: "bg-gray-900 text-white hover:bg-white hover:text-gray-900 border-2 border-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]",
      outline: "bg-white text-gray-900 border-2 border-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px]",
      ghost: "bg-transparent text-gray-700 hover:bg-gray-100 border-2 border-transparent",
      danger: "bg-danger text-danger-foreground hover:bg-white hover:text-danger border-2 border-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]",
      success: "bg-success text-success-foreground hover:bg-white hover:text-success border-2 border-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]",
      warning: "bg-warning text-warning-foreground hover:bg-white hover:text-warning border-2 border-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]",
      white: "bg-white text-gray-900 border-2 border-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px]",
    };

    const sizes = {
      sm: "min-h-11 px-4 py-1.5 text-lg",
      md: "min-h-11 px-6 py-2 text-xl",
      lg: "min-h-12 px-8 py-3 text-2xl",
      xl: "min-h-14 px-10 py-4 text-3xl",
    };

    const Comp = asChild ? Slot : "button";

    return (
      <Comp
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-md font-bold transition-all cursor-pointer active:translate-y-[1px] disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 focus-visible:ring-offset-background [&>svg]:shrink-0",
          handwriting ? "font-handwriting" : "font-body",
          variants[variant],
          sizes[size],
          variant !== "outline" && variant !== "white" && variant !== "ghost" && !props.disabled && "hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px]",
          className
        )}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";

export { Button };

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
  ({ className, variant = "primary", size = "md", handwriting = false, asChild = false, ...props }, ref) => {
    const variants = {
      primary: "bg-blue-600 text-white border border-blue-600 shadow-sm hover:bg-blue-700 hover:border-blue-700",
      secondary: "bg-slate-900 text-white border border-slate-900 shadow-sm hover:bg-slate-800 hover:border-slate-800",
      outline: "bg-white text-slate-800 border border-slate-300 shadow-sm hover:bg-slate-50 hover:border-slate-400",
      ghost: "bg-transparent text-slate-700 border border-transparent hover:bg-slate-100 hover:text-slate-950",
      danger: "bg-red-600 text-white border border-red-600 shadow-sm hover:bg-red-700 hover:border-red-700",
      success: "bg-emerald-600 text-white border border-emerald-600 shadow-sm hover:bg-emerald-700 hover:border-emerald-700",
      warning: "bg-amber-500 text-slate-950 border border-amber-500 shadow-sm hover:bg-amber-400 hover:border-amber-400",
      white: "bg-white text-slate-900 border border-white shadow-sm hover:bg-slate-50 hover:border-slate-200",
    };

    const sizes = {
      sm: "min-h-11 px-4 py-2 text-sm",
      md: "min-h-11 px-5 py-2.5 text-sm",
      lg: "min-h-12 px-6 py-3 text-base",
      xl: "min-h-14 px-7 py-3.5 text-lg",
    };

    const Comp = asChild ? Slot : "button";

    return (
      <Comp
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-[background-color,border-color,color,box-shadow,transform] duration-150 active:translate-y-px disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 focus-visible:ring-offset-background [&>svg]:shrink-0",
          handwriting ? "font-handwriting" : "font-body",
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";

export { Button };

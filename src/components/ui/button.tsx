import { cn } from "@/utils/cn";
import { cva, type VariantProps } from "class-variance-authority";
import { ButtonHTMLAttributes, forwardRef } from "react";

const buttonVariants = cva(
  "inline-flex items-center rounded-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-800 disabled:opacity-50 disabled:pointer-events-none",
  {
    variants: {
      variant: {
        default: "bg-teal-600 text-white hover:bg-teal-700 focus:ring-teal-500",
        secondary:
          "bg-zinc-600 text-zinc-200 hover:bg-zinc-700 focus:ring-zinc-500",
        destructive:
          "bg-rose-600 text-white hover:bg-rose-700 focus:ring-rose-500",
        ghost:
          "bg-transparent hover:bg-zinc-700 text-zinc-200 hover:text-zinc-200 disabled:opacity-50 disabled:pointer-events-none",
        "ghost-destructive":
          "bg-transparent hover:bg-rose-600/20 text-rose-500 hover:text-rose-600 focus:ring-rose-500 disabled:opacity-50 disabled:pointer-events-none",
        outline:
          "border border-zinc-600 bg-transparent hover:bg-zinc-700 text-zinc-300",
        success:
          "bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-emerald-500",
        sky: "bg-sky-600 text-white hover:bg-sky-700 focus:ring-sky-500",
      },
      size: {
        default: "h-8 px-3 py-1.5 text-xs",
        sm: "h-8 px-3 py-1.5 text-xs",
        lg: "h-12 px-6 py-3 text-sm",
        icon: "h-8 w-8 p-0",
      },
      align: {
        default: "justify-center",
        left: "justify-start",
        right: "justify-end",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, align, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, align, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);

Button.displayName = "Button";

export { Button, buttonVariants };

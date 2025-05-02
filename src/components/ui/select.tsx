import { cn } from "@/utils/cn";
import { SelectHTMLAttributes, forwardRef } from "react";

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, error, children, ...props }, ref) => {
    return (
      <select
        className={cn(
          "mt-1 block w-full rounded-sm border border-zinc-600 bg-zinc-700 px-3 py-2 text-zinc-100 shadow-sm focus:ring-1 focus:outline-none sm:text-sm",
          error
            ? "border-rose-500 focus:border-rose-500 focus:ring-rose-500"
            : "focus:border-teal-500 focus:ring-teal-500",
          className,
        )}
        ref={ref}
        {...props}
      >
        {children}
      </select>
    );
  },
);

Select.displayName = "Select";

export { Select };

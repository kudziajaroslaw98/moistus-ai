import { cn } from "@/utils/cn";
import { LabelHTMLAttributes, forwardRef } from "react";

export interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {}

const Label = forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, ...props }, ref) => {
    return (
      <label
        className={cn("block text-sm font-medium text-zinc-400", className)}
        ref={ref}
        {...props}
      />
    );
  },
);

Label.displayName = "Label";

export { Label };

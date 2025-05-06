import { cn } from "@/utils/cn";
import { LabelHTMLAttributes, forwardRef, type PropsWithChildren } from "react";

export type LabelProps = PropsWithChildren<
  LabelHTMLAttributes<HTMLLabelElement>
>;

const Label = forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, ...props }, ref) => {
    return (
      <label
        className={cn("block text-sm font-medium text-zinc-400", className)}
        ref={ref}
        {...props}
      >
        {props.children}
      </label>
    );
  },
);

Label.displayName = "Label";

export { Label };

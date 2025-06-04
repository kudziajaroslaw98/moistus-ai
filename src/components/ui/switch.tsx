"use client";

import generateUuid from "@/helpers/generate-uuid";
import { cn } from "@/utils/cn"; // Assuming you have a cn utility for classnames
import { forwardRef, type InputHTMLAttributes } from "react";

export interface SwitchProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  labelPosition?: "left" | "right";
  onCheckedChange?: (checked: boolean) => void;
}

const Switch = forwardRef<HTMLInputElement, SwitchProps>(
  ({ className, id, onCheckedChange, ...props }, ref) => {
    const switchId = id || generateUuid();

    return (
      <div className="relative inline-flex cursor-pointer items-center">
        <input
          type="checkbox"
          id={switchId}
          className="peer sr-only" // Hide the default checkbox
          ref={ref}
          onChange={(e) => onCheckedChange?.(e.target.checked)}
          {...props}
        />

        <div
          className={cn(
            "h-6 w-11 rounded-full bg-zinc-600 peer-checked:bg-teal-500 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-teal-400 peer-focus:ring-offset-2 peer-focus:ring-offset-zinc-900 transition-colors",
            "after:absolute after:top-0.5 after:left-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-zinc-700 after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full peer-checked:after:border-white",
            className,
          )}
        />
      </div>
    );
  },
);
Switch.displayName = "Switch";

export { Switch };

import { cn } from "@/utils/cn";
import { ReactNode } from "react";
import { Label } from "./label";

interface FormFieldProps {
  id: string;
  label: string;
  children: ReactNode;
  error?: string;
  className?: string;
}

export function FormField({
  id,
  label,
  children,
  error,
  className,
}: FormFieldProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={id}>{label}</Label>

      {children}

      {error && <p className="mt-1 text-sm text-rose-500">{error}</p>}
    </div>
  );
}

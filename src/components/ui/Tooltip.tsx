import { type ReactNode } from "react";

/**
 * Tooltip component for displaying contextual information on hover/focus.
 * @param children The element that triggers the tooltip.
 * @param content The tooltip text to display.
 * @returns JSX.Element
 */
export interface TooltipProps {
  children: ReactNode;
  content: string;
}

export function Tooltip({ children, content }: TooltipProps): ReactNode {
  return (
    <span className="relative group">
      {children}

      <span className="pointer-events-none absolute left-1/2 top-full z-50 mt-2 w-max -translate-x-1/2 rounded bg-zinc-800 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
        {content}
      </span>
    </span>
  );
}

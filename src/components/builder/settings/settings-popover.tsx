import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverAnchor, // Added PopoverClose
  PopoverContent,
} from "@/components/ui/popover";
import type {
  BuilderElement,
  LinkElementProperties,
} from "@/types/builder-node";
import { X } from "lucide-react";
import React, { forwardRef, memo, useLayoutEffect, useState } from "react";
import { LinkSettingsForm } from "./link-settings-form";
import { TextSettingsForm } from "./text-settings-form";

// Helper component to create an anchor for the Popover
// that mirrors an external DOM element.
const ExternalAnchor = forwardRef<
  HTMLDivElement,
  { domNode: HTMLElement | null }
>(({ domNode }, ref) => {
  const [style, setStyle] = useState<React.CSSProperties>({});

  useLayoutEffect(() => {
    if (domNode) {
      const rect = domNode.getBoundingClientRect();
      setStyle({
        position: "fixed",
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
        pointerEvents: "none", // Make it non-interactive
      });
    } else {
      setStyle({});
    }
  }, [domNode]);

  if (!domNode) return null;

  return <div ref={ref} style={style} data-testid="external-anchor" />;
});

ExternalAnchor.displayName = "ExternalAnchor";

interface SettingsPopoverProps {
  selectedElement: BuilderElement | null;
  anchorElement: HTMLElement | null; // ADDED
  onUpdateElement: (updatedElement: BuilderElement) => void;
  onClose: () => void;
}

const SettingsPopoverComponent = ({
  selectedElement,
  anchorElement, // ADDED
  onUpdateElement,
  onClose,
}: SettingsPopoverProps) => {
  if (!selectedElement || !anchorElement) {
    return null;
  }

  const renderSettingsForm = () => {
    switch (selectedElement.type) {
      case "text":
        return (
          <TextSettingsForm
            element={selectedElement}
            onUpdate={(partialUpdate: Partial<BuilderElement>) => {
              if (!selectedElement) return;

              const updatedElement: BuilderElement = {
                ...selectedElement,
                ...partialUpdate,
                properties: {
                  ...selectedElement.properties,
                  ...(partialUpdate.properties || {}),
                },
                position: {
                  ...selectedElement.position,
                  ...(partialUpdate.position || {}),
                },
              };
              onUpdateElement(updatedElement);
            }}
          />
        );
      case "link":
        return (
          <LinkSettingsForm
            element={selectedElement}
            onUpdate={(updatedProps: Partial<LinkElementProperties>) => {
              if (!selectedElement) return;
              const updatedElement: BuilderElement = {
                ...selectedElement,
                properties: {
                  ...(selectedElement.properties as LinkElementProperties),
                  ...updatedProps,
                } as LinkElementProperties,
              };
              onUpdateElement(updatedElement);
            }}
          />
        );
      default:
        return (
          <div className="flex items-center justify-center py-8 text-zinc-500">
            <p>No settings available for this element type.</p>
          </div>
        );
    }
  };

  return (
    <Popover
      key={selectedElement?.id}
      open={!!(selectedElement && anchorElement)}
    >
      <PopoverAnchor asChild>
        <ExternalAnchor domNode={anchorElement} />
      </PopoverAnchor>

      <PopoverContent
        side="bottom"
        align="center"
        sideOffset={12} // Matches the old 'gap'
        className="bg-zinc-900 text-white rounded-lg shadow-2xl border border-zinc-700 p-0 min-w-[280px] max-w-[320px] focus:outline-none"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 pb-3 border-b border-zinc-700/50">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />

            <h3 className="text-base font-semibold text-zinc-100">
              {selectedElement.type.charAt(0).toUpperCase() +
                selectedElement.type.slice(1)}{" "}
              Settings
            </h3>
          </div>

          <Button
            variant="ghost"
            onClick={onClose}
            aria-label="Close"
            size="icon"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-4">{renderSettingsForm()}</div>

        {/* Subtle gradient overlay for modern effect */}
        <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-zinc-800/10 via-transparent to-zinc-950/20 pointer-events-none -z-10" />
      </PopoverContent>
    </Popover>
  );
};

export const SettingsPopover = memo(SettingsPopoverComponent);
SettingsPopover.displayName = "SettingsPopover";

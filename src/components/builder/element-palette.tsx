import { ElementType } from "@/types/builder-node";
import { memo } from "react";
import { elementTypes } from "./elements";

interface ElementPaletteProps {
  onElementSelect: (elementType: ElementType) => void;
}

const ElementPaletteComponent = ({ onElementSelect }: ElementPaletteProps) => {
  return (
    <div className="w-full bg-zinc-800 rounded-lg p-4">
      <h3 className="text-sm font-semibold mb-3 text-zinc-200">Elements</h3>

      <div className="grid grid-cols-2 gap-2">
        {elementTypes.map((elementType) => {
          const IconComponent = elementType.icon;
          return (
            <button
              key={elementType.id}
              onClick={() => onElementSelect(elementType)}
              className="flex flex-col items-center gap-2 p-3 bg-zinc-700 hover:bg-zinc-600 rounded-lg transition-colors cursor-pointer"
            >
              <IconComponent className="w-5 h-5 text-zinc-300" />

              <span className="text-xs text-zinc-300">{elementType.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export const ElementPalette = memo(ElementPaletteComponent);
ElementPalette.displayName = "ElementPalette";

import { BuilderElement } from "@/types/builder-node";
import { Tag } from "lucide-react";
import { memo } from "react";

interface TagElementProps {
  element: BuilderElement;
  isSelected?: boolean;
  isEditing?: boolean;
  onUpdate?: (element: BuilderElement) => void;
}

const TagElementComponent = ({
  element,
  isSelected = false,
  isEditing = false,
  onUpdate,
}: TagElementProps) => {
  const { properties } = element;
  const {
    text = "Tag",
    backgroundColor = "#374151",
    textColor = "#ffffff",
    borderRadius = 12,
  } = properties;

  const handleTextChange = (newText: string) => {
    if (onUpdate) {
      onUpdate({
        ...element,
        properties: { ...properties, text: newText },
      });
    }
  };

  return (
    <div
      className={`
        w-full h-full flex items-center justify-center p-1 text-xs font-medium
        ${isSelected ? "ring-2 ring-teal-500" : ""}
        ${isEditing ? "bg-zinc-800" : ""}
      `}
      style={{
        backgroundColor,
        color: textColor,
        borderRadius: `${borderRadius}px`,
      }}
    >
      {isEditing ? (
        <input
          type="text"
          value={text}
          onChange={(e) => handleTextChange(e.target.value)}
          className="w-full h-full bg-transparent text-center border-none outline-none text-xs"
          style={{ color: textColor }}
        />
      ) : (
        text
      )}
    </div>
  );
};

export const TagElement = memo(TagElementComponent);

export const tagElementType = {
  id: "tag",
  name: "Tag",
  icon: Tag,
  defaultProperties: {
    text: "New Tag",
    backgroundColor: "#374151",
    textColor: "#ffffff",
    borderRadius: 12,
  },
  defaultSize: {
    width: 2,
    height: 1,
  },
};

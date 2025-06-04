import { BuilderElement, ImageElementProperties } from "@/types/builder-node";
import { ImageIcon } from "lucide-react";
import Image from "next/image";
import { memo } from "react";

interface ImageElementProps {
  element: BuilderElement;
  isSelected?: boolean;
  isEditing?: boolean;
  onUpdate?: (element: BuilderElement) => void;
}

const ImageElementComponent = ({
  element,
  isSelected = false,
  isEditing = false,
  onUpdate,
}: ImageElementProps) => {
  const properties = element.properties as ImageElementProperties;
  const { src = "", alt = "Image", objectFit = "cover" } = properties;

  const handleSrcChange = (newSrc: string) => {
    if (onUpdate) {
      onUpdate({
        ...element,
        properties: { ...properties, src: newSrc },
      });
    }
  };

  return (
    <div
      className={`
        w-full h-full flex items-center justify-center rounded overflow-hidden relative
        ${isSelected ? "ring-2 ring-teal-500" : ""}
        ${isEditing ? "bg-zinc-800" : ""}
      `}
    >
      {src ? (
        <Image
          src={src}
          alt={alt}
          fill
          className="object-cover"
          style={{ objectFit: objectFit }}
        />
      ) : (
        <div className="w-full h-full bg-zinc-700 flex items-center justify-center">
          {isEditing ? (
            <input
              type="url"
              placeholder="Image URL"
              onChange={(e) => handleSrcChange(e.target.value)}
              className="w-full bg-transparent border border-zinc-600 rounded px-2 py-1 text-xs"
            />
          ) : (
            <ImageIcon className="w-6 h-6 text-zinc-400" />
          )}
        </div>
      )}
    </div>
  );
};

export const ImageElement = memo(ImageElementComponent);

export const imageElementType = {
  id: "image",
  name: "Image",
  icon: ImageIcon,
  defaultProperties: {
    src: "",
    alt: "Image",
    objectFit: "cover",
    borderRadius: 4,
  },
  defaultSize: {
    width: 3,
    height: 2,
  },
};

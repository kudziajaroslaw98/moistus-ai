import { BuilderElement } from "@/types/builder-node";
import { PlayCircle } from "lucide-react";
import { memo } from "react";

interface VideoElementProps {
  element: BuilderElement;
  isSelected?: boolean;
  isEditing?: boolean;
  onUpdate?: (element: BuilderElement) => void;
}

const VideoElementComponent = ({
  element,
  isSelected = false,
  isEditing = false,
  onUpdate,
}: VideoElementProps) => {
  const { properties } = element;
  const {
    src = "",
    autoplay = false,
    muted = true,
    controls = true,
  } = properties;

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
        w-full h-full flex items-center justify-center rounded overflow-hidden
        ${isSelected ? "ring-2 ring-teal-500" : ""}
        ${isEditing ? "bg-zinc-800" : ""}
      `}
    >
      {src ? (
        <video
          src={src}
          autoPlay={autoplay}
          muted={muted}
          controls={controls}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full bg-zinc-700 flex items-center justify-center">
          {isEditing ? (
            <input
              type="url"
              placeholder="Video URL"
              onChange={(e) => handleSrcChange(e.target.value)}
              className="w-full bg-transparent border border-zinc-600 rounded px-2 py-1 text-xs"
            />
          ) : (
            <PlayCircle className="w-8 h-8 text-zinc-400" />
          )}
        </div>
      )}
    </div>
  );
};

export const VideoElement = memo(VideoElementComponent);

export const videoElementType = {
  id: "video",
  name: "Video",
  icon: PlayCircle,
  defaultProperties: {
    src: "",
    autoplay: false,
    muted: true,
    controls: true,
  },
  defaultSize: {
    width: 4,
    height: 3,
  },
};

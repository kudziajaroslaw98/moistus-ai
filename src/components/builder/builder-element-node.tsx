import type { BuilderElement } from "@/types/builder-node";
import { cn } from "@/utils/cn";
import type { useDragControls } from "motion/react"; // Using MotionProps for motion.div
import { motion } from "motion/react";
import type { CSSProperties, PointerEvent, ReactNode } from "react"; // PointerEvent for onPointerDown
import {
  ImageElement as ResolvedImageElement,
  StatusElement as ResolvedStatusElement,
  TagElement as ResolvedTagElement,
  TextElement as ResolvedTextElement,
  VideoElement as ResolvedVideoElement,
} from "./elements"; // Assuming these are the actual element components

// Map element types to their respective components
const elementComponentsMap = {
  text: ResolvedTextElement,
  image: ResolvedImageElement,
  video: ResolvedVideoElement,
  status: ResolvedStatusElement,
  tag: ResolvedTagElement,
} as const;

type ElementType = keyof typeof elementComponentsMap;

export interface BuilderElementNodeProps {
  element: BuilderElement;
  isEditing: boolean;
  isSelected: boolean;
  isDragging: boolean;
  dragControls: ReturnType<typeof useDragControls>;
  elementLayoutClassName: string;
  elementLayoutStyle: CSSProperties;
  onElementClick: (elementId: string) => void;
  onDrag: (
    element: BuilderElement,
    info: { point: { x: number; y: number } },
  ) => void;
  onDragEnd: (element: BuilderElement) => void;
  onResizeDrag: (
    element: BuilderElement,
    info: { point: { x: number; y: number } },
  ) => void;
  onResizeEnd: (element: BuilderElement) => void;
  onDeleteElement: (elementId: string) => void;
  onUpdateElement: (updatedElement: BuilderElement) => void;
}

export function BuilderElementNode({
  element,
  isEditing,
  isSelected,
  isDragging,
  dragControls,
  elementLayoutClassName,
  elementLayoutStyle,
  onElementClick,
  onDrag,
  onDragEnd,
  onResizeDrag,
  onResizeEnd,
  onDeleteElement,
  onUpdateElement,
}: BuilderElementNodeProps): ReactNode | null {
  const ElementComponent = elementComponentsMap[element.type as ElementType];

  if (!ElementComponent) {
    console.warn(`Unsupported element type: ${element.type}`);
    return null;
  }

  const dragConstraints = {
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
  };

  return (
    <motion.div
      drag={isEditing && isSelected}
      dragControls={dragControls}
      dragListener={false}
      dragMomentum={false}
      dragElastic={0}
      dragConstraints={dragConstraints}
      onDrag={(event, info) =>
        onDrag(element, info as { point: { x: number; y: number } })
      }
      onDragEnd={() => onDragEnd(element)}
      style={elementLayoutStyle}
      onClick={() => onElementClick(element.id)}
      className={cn("z-10", isDragging && "opacity-50", elementLayoutClassName)}
      whileHover={isEditing ? { scale: 1.02 } : {}}
      whileTap={isEditing ? { scale: 0.98 } : {}}
    >
      {isEditing && isSelected && (
        <div
          className="absolute left-1 top-1 w-6 h-6 flex items-center justify-center bg-zinc-700 border border-zinc-400 rounded cursor-move z-30"
          title="Drag to move"
          onPointerDown={(e: PointerEvent<HTMLDivElement>) =>
            dragControls.start(e)
          }
        >
          <svg
            width="16"
            height="16"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            className="text-zinc-300"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 12h8m-4-4v8"
            />
          </svg>
        </div>
      )}

      <motion.div className="w-full h-full">
        <ElementComponent
          element={element}
          isSelected={isSelected}
          isEditing={isEditing && isSelected}
          onUpdate={onUpdateElement}
        />
      </motion.div>

      {isEditing && isSelected && (
        <>
          <motion.div
            className="absolute right-0 bottom-0 w-6 h-6 bg-zinc-700 border-2 border-white rounded-full cursor-se-resize z-20"
            drag
            dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
            dragElastic={0}
            dragMomentum={false}
            onDrag={(event, info) =>
              onResizeDrag(element, info as { point: { x: number; y: number } })
            }
            onDragEnd={() => onResizeEnd(element)}
          />
        </>
      )}

      {isEditing && isSelected && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDeleteElement(element.id);
          }}
          className="absolute -top-2 -right-2 w-6 h-6 bg-red-600 hover:bg-red-700 rounded-full flex items-center justify-center text-white text-xs z-20"
          aria-label="Delete element"
        >
          ×
        </button>
      )}
    </motion.div>
  );
}

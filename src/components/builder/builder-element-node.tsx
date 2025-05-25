import type { BuilderElement } from "@/types/builder-node";
import { cn } from "@/utils/cn";
import { MoveDiagonal2, X } from "lucide-react";
import type { useDragControls } from "motion/react"; // Using MotionProps for motion.div
import { AnimatePresence, motion } from "motion/react";
import type { CSSProperties, PointerEvent, ReactNode } from "react"; // PointerEvent for onPointerDown
import { useRef } from "react";
import { Button } from "../ui/button";
import {
  ImageElement as ResolvedImageElement,
  LinkElement as ResolvedLinkElement,
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
  link: ResolvedLinkElement, // Added LinkElement
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
  onElementClick: (elementId: string, domNode: HTMLElement | null) => void; // Changed elementRect to domNode
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
  const elementRef = useRef<HTMLDivElement>(null);
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
      dragMomentum={false}
      dragElastic={0}
      dragConstraints={dragConstraints}
      onDrag={(event, info) =>
        onDrag(element, info as { point: { x: number; y: number } })
      }
      onDragEnd={() => onDragEnd(element)}
      style={elementLayoutStyle}
      ref={elementRef}
      onClick={
        () => onElementClick(element.id, elementRef.current) // Changed to pass elementRef.current
      }
      className={cn("z-10", isDragging && "opacity-50", elementLayoutClassName)}
      whileTap={isEditing ? { scale: 0.98 } : {}}
    >
      <motion.div className="w-full h-full">
        <ElementComponent
          element={element}
          isSelected={isSelected}
          isEditing={isEditing && isSelected}
          onUpdate={onUpdateElement}
        />
      </motion.div>

      <AnimatePresence>
        {isEditing && isSelected && (
          <>
            {/* Delete Button (Modernized version of the red 'X' circle) */}
            <motion.div
              key={`delete-${element.id}`} // Unique key for AnimatePresence
              initial={{ opacity: 0, scale: 0.5, y: -10, x: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
              exit={{ opacity: 0, scale: 0.5, y: -10, x: 10 }}
              transition={{
                type: "spring",
                stiffness: 500,
                damping: 30,
                duration: 0.2,
              }}
              onClick={(e) => {
                e.stopPropagation(); // Prevent event bubbling to the element itself
                onDeleteElement(element.id);
              }}
              className="absolute -top-2.5 -right-2.5 rounded-sm flex items-center justify-center text-white shadow-lg z-30 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-opacity-75"
              aria-label="Delete element"
            >
              <Button variant="destructive" size="icon" className="size-5">
                <X className="size-4" />
              </Button>
            </motion.div>

            {/* Resize Handle (Modernized visual cue) */}
            <motion.div
              key={`resize-${element.id}`} // Unique key
              className="absolute -bottom-2 -right-2 p-0.5rounded-sm cursor-se-resize z-30 shadow-md backdrop-blur-sm flex items-center justify-center"
              initial={{ opacity: 0, scale: 0.5, y: 10, x: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
              exit={{ opacity: 0, scale: 0.5, y: 10, x: 10 }}
              transition={{
                type: "spring",
                stiffness: 500,
                damping: 30,
                duration: 0.2,
                delay: 0.05,
              }}
              drag
              dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
              dragElastic={0}
              dragMomentum={false}
              onDrag={(event, info) =>
                onResizeDrag(
                  element,
                  info as { point: { x: number; y: number } },
                )
              }
              onDragEnd={() => onResizeEnd(element)}
              // Optional: to prevent selection issues while dragging
              onPointerDown={(e) => e.stopPropagation()}
            >
              <Button
                variant="secondary"
                size="icon"
                className="size-5"
                onPointerDown={(e: PointerEvent<HTMLButtonElement>) =>
                  dragControls.start(e)
                }
              >
                <MoveDiagonal2 className="size-4" />
              </Button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

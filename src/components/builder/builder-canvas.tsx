import type {
  BuilderCanvas as BuilderCanvasType,
  BuilderElement,
} from "@/types/builder-node";
import { useDragControls } from "motion/react";
import { memo, useCallback, useRef, useState } from "react";
import { useInteractiveElement } from "../../hooks/use-interactive-element";
import { BuilderElementNode } from "./builder-element-node";
import { SettingsPopover } from "./settings/settings-popover";

interface BuilderCanvasProps {
  canvas: BuilderCanvasType;
  onCanvasUpdate: (canvas: BuilderCanvasType) => void;
  isEditing?: boolean;
}

const GRID_OFFSET = 16;

function getCanvasMaxSize(canvas: BuilderCanvasType) {
  return {
    width:
      canvas.columns * canvas.columnWidth +
      (canvas.columns - 1) * canvas.columnGap,
    height: canvas.rows * canvas.rowHeight + (canvas.rows - 1) * canvas.rowGap,
  };
}

const BuilderCanvasComponent = ({
  canvas,
  onCanvasUpdate,
  isEditing = false,
}: BuilderCanvasProps) => {
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [selectedElementNode, setSelectedElementNode] =
    useState<HTMLElement | null>(null); // Changed from selectedElementRect
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null); // Add container ref

  const updateElement = useCallback(
    (updatedElement: BuilderElement) => {
      const updatedElements = canvas.elements.map((el: BuilderElement) =>
        el.id === updatedElement.id ? updatedElement : el,
      );
      onCanvasUpdate({ ...canvas, elements: updatedElements });
    },
    [canvas, onCanvasUpdate],
  );

  const {
    draggingElementId,
    handleDragStart,
    handleDrag,
    handleDragEnd,
    handleResizeDrag,
    handleResizeEnd,
    getElementStyle: getHookElementStyle,
  } = useInteractiveElement({
    canvas,
    isEditing,
    selectedElementId: selectedElement,
    onUpdateElement: updateElement,
    canvasRef,
  });
  const dragControls = useDragControls();

  const currentSelectedElementObject = canvas.elements.find(
    (el) => el.id === selectedElement,
  );

  const handleCloseSettingsPopover = useCallback(() => {
    setSelectedElement(null);
    setSelectedElementNode(null); // Changed from selectedElementRect
  }, [setSelectedElement]);

  const handleElementClick = useCallback(
    (elementId: string, domNode: HTMLElement | null) => {
      // Changed elementRect to domNode
      if (isEditing) {
        setSelectedElement(elementId);
        setSelectedElementNode(domNode); // Changed from setSelectedElementRect
        handleDragStart(); // Consider if dragStart needs the node or just ID
      }
    },
    [isEditing, setSelectedElement, handleDragStart],
  );

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setSelectedElement(null);
      setSelectedElementNode(null); // Changed from selectedElementRect
    }
  };

  const deleteElement = (elementId: string) => {
    const updatedElements = canvas.elements.filter(
      (el: BuilderElement) => el.id !== elementId,
    );
    onCanvasUpdate({ ...canvas, elements: updatedElements });
    setSelectedElement(null);
    setSelectedElementNode(null); // Changed from selectedElementRect
  };

  const { width: maxWidth, height: maxHeight } = getCanvasMaxSize(canvas);

  return (
    <div
      ref={containerRef}
      className="w-full bg-zinc-900 rounded-lg p-4 relative overflow-visible"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-zinc-200">Canvas</h3>

        <div className="text-xs text-zinc-400">
          {canvas.columns} × {canvas.rows} grid
        </div>
      </div>

      <div
        id="builder-canvas"
        ref={canvasRef}
        style={{
          gridTemplateColumns: `repeat(${canvas.columns}, ${canvas.columnWidth}px)`,
          gridTemplateRows: `repeat(${canvas.rows}, ${canvas.rowHeight}px)`,
          gap: `${canvas.rowGap}px ${canvas.columnGap}px`,
          maxWidth: maxWidth + GRID_OFFSET * 2,
          maxHeight: maxHeight + GRID_OFFSET * 2,
        }}
        onClick={handleCanvasClick}
        className="mx-auto grid w-fit min-w-[300px] bg-zinc-900 border-2 border-dashed border-zinc-700 rounded-lg p-4 relative"
      >
        {isEditing && (
          <div className="absolute inset-0 pointer-events-none">
            {Array.from({ length: canvas.rows }).map((_, row) =>
              Array.from({ length: canvas.columns }).map((_, col) => (
                <div
                  key={`grid-${row}-${col}`}
                  className="absolute border border-zinc-700/30"
                  style={{
                    left:
                      col * (canvas.columnWidth + canvas.columnGap) +
                      GRID_OFFSET,
                    top: row * (canvas.rowHeight + canvas.rowGap) + GRID_OFFSET,
                    width: canvas.columnWidth,
                    height: canvas.rowHeight,
                  }}
                />
              )),
            )}
          </div>
        )}

        {canvas.elements.map((element: BuilderElement) => {
          const isSelected = selectedElement === element.id;
          const {
            className: elementLayoutClassName,
            style: elementLayoutStyle,
          } = getHookElementStyle(element);
          const isDragging = draggingElementId === element.id;
          return (
            <BuilderElementNode
              key={element.id}
              element={element}
              isEditing={isEditing}
              isSelected={isSelected}
              isDragging={isDragging}
              dragControls={dragControls}
              elementLayoutClassName={elementLayoutClassName}
              elementLayoutStyle={elementLayoutStyle}
              onElementClick={handleElementClick}
              onDrag={handleDrag}
              onDragEnd={handleDragEnd}
              onResizeDrag={handleResizeDrag}
              onResizeEnd={handleResizeEnd}
              onDeleteElement={deleteElement}
              onUpdateElement={updateElement}
            />
          );
        })}
      </div>

      {/* Move popover outside canvas but inside container */}
      {isEditing && currentSelectedElementObject && selectedElementNode && (
        <SettingsPopover
          key={currentSelectedElementObject.id}
          selectedElement={currentSelectedElementObject}
          anchorElement={selectedElementNode} // Changed from elementRect to anchorElement
          onUpdateElement={updateElement}
          onClose={handleCloseSettingsPopover}
        />
      )}
    </div>
  );
};

export const BuilderCanvas = memo(BuilderCanvasComponent);
BuilderCanvas.displayName = "BuilderCanvas";

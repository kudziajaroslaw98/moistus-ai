import { NodeData } from "@/types/node-data";
import { cn } from "@/utils/cn";
import { Handle, Node, NodeProps, NodeResizer, Position } from "@xyflow/react";
import { Ellipsis } from "lucide-react";
import { memo, useCallback } from "react";

// Define the props including the onEditNode callback
interface BaseNodeWrapperProps extends NodeProps<Node<NodeData>> {
  onEditNode: (nodeId: string, nodeData: NodeData) => void;
  children: React.ReactNode; // Content specific to the node type
  headerContent?: React.ReactNode; // Optional header content (like icon/title)
  nodeClassName?: string; // For overall node styling adjustments
  headerClassName?: string; // For header specific styling
  contentClassName?: string; // For content area styling
  showHandles?: boolean; // Option to hide handles (e.g., for GroupNode)
}

const BaseNodeWrapperComponent = ({
  id,
  data,
  selected,
  onEditNode,
  children,
  headerContent,
  nodeClassName,
  headerClassName,
  contentClassName,
  showHandles = true, // Default to showing handles
}: BaseNodeWrapperProps) => {
  const handleEllipsisClick = useCallback(() => {
    onEditNode(id, data);
  }, [id, data, onEditNode]);

  const handleDoubleClick = useCallback(() => {
    onEditNode(id, data);
  }, [id, data, onEditNode]);

  return (
    <div
      className={cn(
        "relative flex h-auto min-h-20 min-w-80 flex-col gap-2 rounded-lg border-2 border-zinc-900 bg-zinc-950 p-2 transition-all",
        selected && "border-sky-700",
        nodeClassName,
      )}
      onDoubleClick={handleDoubleClick}
    >
      <div
        className={cn(
          "relative flex h-10 w-full items-center justify-between rounded-md bg-zinc-900 p-2",
          headerClassName,
        )}
      >
        <div className="z-10 flex items-center justify-start gap-2">
          {headerContent}
        </div>

        <div className="z-10 flex items-center justify-center gap-2">
          <button
            className="nodrag rounded-sm bg-zinc-500/20 p-1 text-sm text-zinc-400 hover:text-zinc-200"
            onClick={handleEllipsisClick}
            aria-label="Edit Node"
          >
            <Ellipsis className="size-4" />
          </button>
        </div>
      </div>

      <div
        className={cn(
          "min-h-[3rem] pt-2 pb-4 text-sm whitespace-pre-wrap text-zinc-300",
          contentClassName,
        )}
      >
        {children}
      </div>

      {showHandles && (
        <>
          <Handle
            type="target"
            position={Position.Top}
            className="size-2 !bg-zinc-600"
          />

          <Handle
            type="target"
            position={Position.Left}
            className="size-2 !bg-zinc-600"
          />

          <Handle
            type="target"
            position={Position.Right}
            className="size-2 !bg-zinc-600"
          />

          <Handle
            type="source"
            position={Position.Bottom}
            className="size-2 !bg-zinc-600"
          />
        </>
      )}

      {/* Resizer */}
      <NodeResizer
        color="#0069a8"
        isVisible={selected}
        minWidth={100}
        minHeight={30}
      />
    </div>
  );
};

export const BaseNodeWrapper = memo(BaseNodeWrapperComponent);
BaseNodeWrapper.displayName = "BaseNodeWrapper";

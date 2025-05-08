import { NodeData } from "@/types/node-data";
import { cn } from "@/utils/cn";
import {
  Handle,
  Node,
  NodeProps,
  NodeResizer,
  Position,
  useConnection,
} from "@xyflow/react"; // Removed Handle import
import { Pencil } from "lucide-react";
import { memo, useCallback } from "react";

// Define the props including the onEditNode callback
interface BaseNodeWrapperProps extends NodeProps<Node<NodeData>> {
  onEditNode: (nodeId: string, nodeData: NodeData) => void;
  children: React.ReactNode; // Content specific to the node type
  headerContent?: React.ReactNode; // Optional header content (like icon/title)
  headerActions?: React.ReactNode; // Optional actions in the header (like buttons)
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
  headerActions,
  nodeClassName,
  headerClassName,
  contentClassName,
  showHandles,
}: BaseNodeWrapperProps) => {
  const connection = useConnection();
  const isTarget = connection.inProgress && connection.fromNode.id !== id;

  const handleEllipsisClick = useCallback(() => {
    onEditNode(id, data);
  }, [id, data, onEditNode]);

  if (!data) {
    return null;
  }

  return (
    <div
      className={cn(
        "relative flex h-full min-h-fit min-w-80 flex-col gap-2 rounded-lg border-2 border-zinc-900 bg-zinc-950 p-2 shadow-lg transition-all",
        selected && "border-sky-700",
        nodeClassName,
      )}
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
          {headerActions}

          <button
            className="nodrag rounded-sm bg-zinc-500/20 p-1 text-sm text-zinc-400 hover:text-zinc-200"
            onClick={handleEllipsisClick}
            aria-label="Edit Node"
          >
            <Pencil className="size-4" />
          </button>
        </div>
      </div>

      <div
        className={cn(
          "min-h-fit h-full pt-2 pb-4 text-sm whitespace-pre-wrap text-zinc-300",
          contentClassName,
        )}
      >
        {children}
      </div>

      <Handle
        type="target"
        position={Position.Top}
        className="size-2 rounded-full !bg-zinc-600 outline-2 outline-zinc-800"
      />

      <Handle
        type="source"
        position={Position.Bottom}
        className="size-2 rounded-full !bg-zinc-600 outline-2 outline-zinc-800"
      />

      {!selected && (
        <Handle
          className={cn([
            "w-full h-full absolute top-0 left-0 rounded-full transform-none border-none opacity-0",
            connection.inProgress ? "h-full" : "h-1/2 -translate-y-1/2",
          ])}
          position={Position.Bottom}
          type="source"
        />
      )}

      {(!connection.inProgress || isTarget) && (
        <Handle
          className={cn([
            "w-full h-full absolute top-0 left-0 rounded-full transform-none border-none opacity-0",
            connection.inProgress ? "h-full" : "h-1/2 translate-y-1/2",
          ])}
          position={Position.Top}
          type="target"
          isConnectableStart={false}
        />
      )}

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

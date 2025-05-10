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
import { memo, type ReactNode } from "react";

// Define the props including the onEditNode callback
interface BaseNodeWrapperProps extends NodeProps<Node<NodeData>> {
  children: React.ReactNode; // Content specific to the node type
  nodeClassName?: string; // For overall node styling adjustments
  nodeIcon?: ReactNode;
  nodeType?: "Resource" | "Question" | "Tasks" | "Image" | "Code" | "Note";
  includePadding?: boolean;
}

const BaseNodeWrapperComponent = ({
  id,
  data,
  selected,
  children,
  nodeClassName,
  nodeIcon,
  nodeType,
  includePadding = true,
}: BaseNodeWrapperProps) => {
  const connection = useConnection();
  const isTarget = connection.inProgress && connection.fromNode.id !== id;

  if (!data) {
    return null;
  }

  return (
    <div
      className={cn(
        "relative flex h-full min-h-auto min-w-80 flex-col rounded-lg border-2 border-node-accent bg-zinc-950 shadow-lg shadow-node-accent/25 gap-6 transition-all",
        selected && "border-sky-700",
        includePadding ? "p-4" : "p-0",
        nodeClassName,
      )}
    >
      <>
        <div className="top-0 left-4 absolute -translate-y-full bg-node-accent text-node-text-main rounded-t-sm px-2 py-0.5 text-[10px] font-semibold font-mono flex items-center gap-2">
          <span>{nodeIcon}</span>

          <span>{nodeType}</span>
        </div>

        {children}

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
      </>
    </div>
  );
};

export const BaseNodeWrapper = memo(BaseNodeWrapperComponent);
BaseNodeWrapper.displayName = "BaseNodeWrapper";

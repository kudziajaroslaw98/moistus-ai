import { useMindMapContext } from "@/contexts/mind-map/mind-map-context"; // Import context
import { NodeData } from "@/types/node-data";
import { cn } from "@/utils/cn";
import {
  getOutgoers,
  Handle,
  Node,
  NodeProps,
  NodeResizer,
  Position,
  useConnection,
} from "@xyflow/react"; // Removed Handle import
import { ChevronDown, ChevronRight } from "lucide-react"; // Icons for collapse/expand
import { AnimatePresence, motion } from "motion/react";
import { memo, type ReactNode, useMemo, useState } from "react"; // Added useMemo
import { Button } from "../ui/button";

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
  const isTarget = useMemo(
    () => connection.inProgress && connection.fromNode?.id !== id,
    [connection, id],
  );

  const { toggleNodeCollapse, nodes, edges } = useMindMapContext(); // Get collapse functions and edges
  const node = nodes.find((n) => n.id === id);

  const descendandCount = (node: Node<NodeData>) => {
    const outgoers = getOutgoers({ id: node.id }, nodes, edges);

    return (
      outgoers.length +
      outgoers.reduce((acc, child) => acc + descendandCount(child), 0)
    );
  };

  console.log(descendandCount(node));

  const collapsed = data.metadata?.isCollapsed ?? false;
  const [hover, setHover] = useState(false);

  const MemoizedCollapseButton = useMemo(() => {
    return (
      <Button
        onClick={(e) => {
          e.stopPropagation();
          toggleNodeCollapse(id);
        }}
        className="nodrag nopan z-20 rounded-sm hover:bg-black/20 h-5 w-auto group flex gap-2 px-1 transition-all"
        variant={"ghost"}
        title={collapsed ? "Expand Branch" : "Collapse Branch"}
        onHoverStart={() => setHover(true)}
        onHoverEnd={() => setHover(false)}
      >
        {collapsed ? (
          <ChevronRight className="size-3" />
        ) : (
          <ChevronDown className="size-3" />
        )}

        <AnimatePresence>
          {hover && (
            <motion.span
              key={`hover-${hover}`}
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: "auto", opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{
                width: { duration: 0.25 },
                opacity: { duration: 0.4 },
                ease: "easeOut",
              }}
            >
              {collapsed ? "Expand" : "Collapse"}
            </motion.span>
          )}
        </AnimatePresence>
      </Button>
    );
  }, [collapsed, hover, toggleNodeCollapse]);

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
        {collapsed && (
          <>
            <div className="absolute w-full h-full -z-[2] left-3 -bottom-3 rounded-lg border-2 border-node-accent/25 bg-zinc-950" />

            <div className="absolute w-full h-full -z-[1] -bottom-2 left-2 rounded-lg border-2 border-node-accent/25 bg-zinc-950" />

            <div className="absolute -bottom-2 -right-2 z-10 rounded-full bg-node-accent px-1.5 py-0.5 text-[9px] font-bold text-white shadow-md">
              {1}
            </div>
          </>
        )}

        <div className="top-0 left-4 absolute -translate-y-full flex items-center justify-center gap-2">
          <motion.div className="bg-node-accent text-node-text-main rounded-t-sm text-[10px] font-semibold font-mono flex items-center justify-center gap-2">
            {<>{MemoizedCollapseButton}</>}
          </motion.div>

          <div className="bg-node-accent text-node-text-main rounded-t-sm px-2 py-0.5 text-[10px] font-semibold font-mono flex items-center gap-2">
            <span>{nodeIcon}</span>

            <span>{nodeType}</span>
          </div>
        </div>

        {children}

        <Handle
          type="source"
          position={Position.Bottom}
          className="w-full h-4 bg-transparent"
        />

        <Handle
          type="source"
          position={Position.Top}
          className="w-full h-4 bg-transparent"
        />

        <Handle
          type="source"
          position={Position.Left}
          className="w-4 h-full bg-transparent"
        />

        <Handle
          type="source"
          position={Position.Right}
          className="w-4 h-full bg-transparent"
        />

        <Handle
          className={cn([
            "w-full h-full absolute top-0 left-0 rounded-full transform-none border-none opacity-0",
            isTarget ? "h-full" : "h-1/2 translate-y-1/2", // Adjusted for isTarget
          ])}
          position={Position.Top}
          type="target"
          isConnectableStart={false}
        />

        <NodeResizer
          color="#0069a8"
          isVisible={selected}
          minWidth={100}
          minHeight={30}
          handleClassName="!w-3 !h-3 !bg-node-accent border-node-text-secondary"
        />
      </>
    </div>
  );
};

export const BaseNodeWrapper = memo(BaseNodeWrapperComponent);
BaseNodeWrapper.displayName = "BaseNodeWrapper";

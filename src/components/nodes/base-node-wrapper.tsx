import useAppStore from "@/contexts/mind-map/mind-map-store";
import { NodeData } from "@/types/node-data";
import { cn } from "@/utils/cn";
import { Handle, Node, NodeProps, NodeResizer, Position } from "@xyflow/react"; // Removed Handle import
import { ChevronDown, ChevronRight, Group, MessageCircle } from "lucide-react"; // Icons for collapse/expand
import { AnimatePresence, motion } from "motion/react";
import { memo, type ReactNode, useCallback, useMemo, useState } from "react"; // Added useMemo
import { useShallow } from "zustand/shallow";
import { Button } from "../ui/button";

// Define the props including the onEditNode callback
interface BaseNodeWrapperProps extends NodeProps<Node<NodeData>> {
  children: ReactNode; // Content specific to the node type
  nodeClassName?: string; // For overall node styling adjustments
  nodeIcon?: ReactNode;
  nodeType?:
    | "Resource"
    | "Question"
    | "Tasks"
    | "Image"
    | "Code"
    | "Note"
    | "Builder";
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
  // const connection = useConnection();
  const {
    nodes,
    toggleNodeCollapse,
    getDirectChildrenCount,
    commentSummaries,
    setPopoverOpen,
  } = useAppStore(
    useShallow((state) => ({
      nodes: state.nodes,
      toggleNodeCollapse: state.toggleNodeCollapse,
      getDirectChildrenCount: state.getDirectChildrenCount,
      commentSummaries: state.commentSummaries,
      setPopoverOpen: state.setPopoverOpen,
    })),
  );
  const [hover, setHover] = useState(false);
  const directChildrenCount = useMemo(() => {
    return getDirectChildrenCount(id);
  }, [getDirectChildrenCount, id]);

  const hasChildren = directChildrenCount > 0;
  const collapsed = data.metadata?.isCollapsed ?? false;

  // Check if this node belongs to a group
  const belongsToGroup = data.metadata?.groupId;
  const groupNode = useMemo(() => {
    if (!belongsToGroup) return null;
    return nodes.find((n) => n.id === belongsToGroup);
  }, [belongsToGroup, nodes]);

  // Handle drag start for group integration
  const handleDragStart = useCallback(
    (e: React.DragEvent) => {
      if (data.metadata?.isGroup) return; // Don't allow dragging groups

      e.dataTransfer.setData(
        "application/reactflow",
        JSON.stringify({
          nodeId: id,
          nodeType: data.node_type,
        }),
      );
      e.dataTransfer.effectAllowed = "move";
    },
    [id, data.metadata?.isGroup, data.node_type],
  );

  const commentCount = useMemo(() => {
    const summaries = commentSummaries.get(id);
    if (!summaries) return 0;

    return summaries.comment_count || 0;
  }, [commentSummaries, id]);

  const unresolvedCount = useMemo(() => {
    const summaries = commentSummaries.get(id);
    if (!summaries) return 0;

    return summaries.unresolved_count || 0;
  }, [commentSummaries, id]);

  // const [unresolvedCount, setUnresolvedCount] = useState(
  //   commentSummaries.get(id)?.unresolved_count || 0,
  // );

  // useEffect(() => {
  //   const summaries = commentSummaries.get(id);
  //   if (!summaries) return;

  //   setCommentCount(summaries.comment_count || 0);
  //   setUnresolvedCount(summaries.unresolved_count || 0);
  // }, [commentSummaries.get(id)]);

  const handleOnCommentClick = useCallback(() => {
    setPopoverOpen({ commentsPanel: true });
  }, [setPopoverOpen]);

  const handleToggleCollapse = useCallback(() => {
    toggleNodeCollapse(id);
  }, [id]);

  if (!data) {
    return null;
  }

  return (
    <div
      className={cn(
        "relative flex h-full min-h-auto min-w-80 flex-col rounded-lg border-2 border-node-accent bg-zinc-950 shadow-lg shadow-node-accent/25 gap-4 transition-all cursor-move",
        selected && "border-sky-700",
        includePadding ? "p-4" : "p-0",
        nodeClassName,
      )}
      draggable={!data.metadata?.isGroup}
      onDragStart={handleDragStart}
      style={{ zIndex: belongsToGroup ? 1 : "auto" }}
    >
      <>
        {collapsed && directChildrenCount > 0 && (
          <>
            <div className="absolute w-full h-full -z-[2] left-3 -bottom-3 rounded-lg border-2 border-node-accent/25 bg-zinc-950" />

            <div className="absolute w-full h-full -z-[1] -bottom-2 left-2 rounded-lg border-2 border-node-accent/25 bg-zinc-950" />

            <div
              className="absolute -bottom-2 -right-2 z-10 rounded-full bg-node-accent px-1.5 py-0.5 text-[9px] font-bold text-white shadow-md"
              title={`${directChildrenCount} hidden item${directChildrenCount !== 1 ? "s" : ""}`}
            >
              {directChildrenCount}
            </div>
          </>
        )}

        <div className="top-0 left-4 absolute -translate-y-full flex items-center justify-center gap-2">
          <motion.div className="bg-node-accent text-node-text-main rounded-t-sm text-[10px] font-semibold font-mono flex items-center justify-center gap-2">
            {hasChildren && (
              <Button
                onClick={handleToggleCollapse}
                className="nodrag nopan z-20 rounded-sm hover:bg-black/20 h-5 w-auto group flex gap-2 px-1 transition-all"
                variant={"ghost"}
                title={
                  collapsed
                    ? `Expand Branch (${directChildrenCount} ${directChildrenCount === 1 ? "child" : "children"})`
                    : `Collapse Branch (${directChildrenCount} ${directChildrenCount === 1 ? "child" : "children"})`
                }
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
                      initial={{
                        width: 0,
                        opacity: 0,
                      }}
                      animate={{
                        width: "auto",
                        opacity: 1,
                      }}
                      exit={{
                        width: 0,
                        opacity: 0,
                      }}
                      transition={{
                        width: {
                          duration: 0.25,
                        },
                        opacity: {
                          duration: 0.4,
                        },
                        ease: "easeOut",
                      }}
                    >
                      {collapsed ? "Expand" : "Collapse"}
                    </motion.span>
                  )}
                </AnimatePresence>
              </Button>
            )}
          </motion.div>

          {/* Group membership indicator */}
          {belongsToGroup && groupNode && (
            <div
              className="bg-purple-600 text-white rounded-t-sm px-2 py-0.5 text-[10px] font-semibold font-mono flex items-center gap-1"
              title={`Member of group: ${groupNode.data.metadata?.label || "Group"}`}
            >
              <Group className="size-3" />

              <span>{groupNode.data.metadata?.label || "Group"}</span>
            </div>
          )}

          <div className="bg-node-accent text-node-text-main rounded-t-sm px-2 py-0.5 text-[10px] font-semibold font-mono flex items-center gap-2">
            <span>{nodeIcon}</span>

            <span>{nodeType}</span>
          </div>

          {/* Comment Indicator */}
          {commentCount > 0 && (
            <motion.div className="bg-node-accent text-node-text-main rounded-t-sm text-[10px] font-semibold font-mono flex items-center justify-center gap-2">
              <Button
                onClick={handleOnCommentClick}
                className="nodrag nopan z-20 rounded-sm hover:bg-black/20 h-5 w-auto group flex gap-2 px-2 relative transition-all"
                variant={"ghost"}
                title={`${commentCount} comment${commentCount !== 1 ? "s" : ""}${unresolvedCount > 0 ? ` (${unresolvedCount} unresolved)` : ""}`}
              >
                <MessageCircle
                  className={cn([
                    "size-3",
                    unresolvedCount > 0
                      ? " fill-sky-500 text-sky-500 animate-pulse"
                      : "",
                  ])}
                />

                <span>{commentCount}</span>

                {/* {unresolvedCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-sky-500 text-white rounded-full size-2 animate-pulse" />
                )} */}
              </Button>
            </motion.div>
          )}
        </div>

        {children}

        {/* {!selected && (
          <Handle
            className={cn([
              "w-full h-full absolute top-0 left-0 rounded-full transform-none border-none opacity-0",
              connection.inProgress ? "h-full" : "h-1/2 -translate-y-1/2",
            ])}
            position={Position.Bottom}
            type="source"
          />
        )} */}

        <Handle
          type="source"
          position={Position.Bottom}
          className="w-full h-8 bg-transparent"
        />

        {/*
        <Handle
          type="source"
          position={Position.Top}
          className="w-full h-8 bg-transparent"
        /> */}

        <Handle
          type="source"
          position={Position.Left}
          className="w-8 h-full bg-transparent"
        />

        <Handle
          type="source"
          position={Position.Right}
          className="w-8 h-full bg-transparent"
        />

        <Handle
          className={cn([
            "w-full h-full absolute top-0 left-0 rounded-full transform-none border-none opacity-0",
            "h-full", // Adjusted for isTarget
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

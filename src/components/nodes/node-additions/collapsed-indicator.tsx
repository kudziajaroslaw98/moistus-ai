import useAppStore from "@/contexts/mind-map/mind-map-store";
import { useNodeId } from "@xyflow/react";
import { memo } from "motion/react";
import { useMemo } from "react";
import { useShallow } from "zustand/shallow";

const CollapsedIndicatorComponent = () => {
  const { getDirectChildrenCount, getNode } = useAppStore(
    useShallow((state) => ({
      getDirectChildrenCount: state.getDirectChildrenCount,
      getNode: state.getNode,
    })),
  );
  const nodeId = useNodeId();
  const data = useMemo(() => getNode(nodeId!)?.data, [getNode, nodeId]);
  const directChildrenCount = useMemo(() => {
    return getDirectChildrenCount(nodeId!);
  }, [getDirectChildrenCount, nodeId]);

  const collapsed = useMemo(() => {
    return data?.metadata?.isCollapsed ?? false;
  }, [data?.metadata?.isCollapsed]);

  if (!collapsed || directChildrenCount === 0) {
    return null;
  }

  return (
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
  );
};

const CollapsedIndicator = memo(CollapsedIndicatorComponent);

export default CollapsedIndicator;

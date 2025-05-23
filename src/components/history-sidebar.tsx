import useAppStore from "@/contexts/mind-map/mind-map-store";
import { HistoryState } from "@/types/history-state";
import { cn } from "@/utils/cn";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { SidePanel } from "./side-panel";
import { Button } from "./ui/button";

export function HistorySidebar() {
  const isLoading = useAppStore((state) => state.loadingStates.isStateLoading);
  const history = useAppStore((state) => state.history);
  const historyIndex = useAppStore((state) => state.historyIndex);
  const revertToHistoryState = useAppStore(
    (state) => state.revertToHistoryState,
  );
  const popoverOpen = useAppStore((state) => state.popoverOpen);
  const setPopoverOpen = useAppStore((state) => state.setPopoverOpen);

  const [filteredHistory, setFilteredHistory] = useState(history);

  // Reverse for newest at the top
  const reversedFilteredHistory = [...filteredHistory].reverse();

  const handleRevert = (index: number) => {
    if (!isLoading) {
      revertToHistoryState(index);
      // Optionally close sidebar after reverting
      // setIsHistorySidebarOpen(false);
    }
  };

  const formatTimestamp = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleString(); // Adjust format as needed
  };

  const getActionDisplayName = (actionName?: string): string => {
    if (!actionName) return "Unknown Action";

    // Simple mapping for display names
    switch (actionName) {
      case "initialLoad":
        return "Initial Load";
      case "addNode":
        return "Add Node";
      case "deleteNode":
        return "Delete Node";
      case "saveNodeProperties":
        return "Update Node";
      case "addEdge":
        return "Add Edge";
      case "deleteEdge":
        return "Delete Edge";
      case "saveEdgeProperties":
        return "Update Edge";
      case "applyLayoutTB":
        return "Layout (TB)";
      case "applyLayoutLR":
        return "Layout (LR)";
      case "nodeChange":
        return "Node Change"; // Generic change
      case "edgeChange":
        return "Edge Change"; // Generic change
      case "groupNodes":
        return "Group Nodes";
      case "pasteNodes":
        return "Paste Nodes";
      // Add more mappings as needed
      default:
        return actionName.replace(/([A-Z])/g, " $1").trim(); // Basic camelCase to Title Case
    }
  };

  useEffect(() => {
    const filterNames = ["nodeChange", "edgeChange"];
    setFilteredHistory(
      history.filter(
        (predicate) => !filterNames.includes(predicate.actionName!),
      ),
    );
  }, [history]);

  const handleClose = () => {
    setPopoverOpen({ history: false });
  };

  return (
    <SidePanel
      isOpen={popoverOpen.history}
      onClose={handleClose}
      title="Mind Map History"
      className="w-[350px]"
    >
      <div className="flex h-full flex-col">
        {history.length === 0 ? (
          <p className="text-center text-zinc-400">No history recorded yet.</p>
        ) : (
          <motion.ul
            className="flex-grow space-y-2 overflow-y-auto pr-2"
            layout
            initial={false}
          >
            <AnimatePresence initial={false} mode="popLayout">
              {reversedFilteredHistory.map(
                (state: HistoryState, index: number) => {
                  // Map reversed index to original index
                  const originalIndex = history.length - 1 - index;
                  const isCurrent = originalIndex === historyIndex;

                  return (
                    <motion.li
                      key={state.timestamp + "-" + originalIndex}
                      layout
                      initial={{ opacity: 0, y: -30 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 30 }}
                      transition={{
                        ease: "easeOut",
                        duration: 0.5,
                      }}
                      className={cn(
                        "flex items-center justify-between rounded-md border p-3 transition-colors",
                        isCurrent
                          ? "border-teal-500 bg-teal-900/30"
                          : "border-zinc-700 bg-zinc-800 hover:bg-zinc-700/50",
                      )}
                    >
                      <div className="flex flex-col">
                        <span
                          className={cn(
                            "text-sm font-medium",
                            isCurrent ? "text-teal-300" : "text-zinc-200",
                          )}
                        >
                          {getActionDisplayName(state.actionName)}
                        </span>

                        <span className="text-xs text-zinc-400">
                          {formatTimestamp(state.timestamp)}
                        </span>

                        <span className="text-xs text-zinc-500">
                          Nodes: {state.nodes.length}, Edges:{" "}
                          {state.edges.length}
                        </span>
                      </div>

                      {!isCurrent && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRevert(originalIndex)}
                          disabled={isLoading}
                          className="border-zinc-600 text-zinc-300 hover:bg-zinc-700 hover:text-zinc-100"
                        >
                          Revert
                        </Button>
                      )}

                      {isCurrent && (
                        <span className="text-xs font-semibold text-teal-400">
                          Current
                        </span>
                      )}
                    </motion.li>
                  );
                },
              )}
            </AnimatePresence>
          </motion.ul>
        )}
      </div>
    </SidePanel>
  );
}

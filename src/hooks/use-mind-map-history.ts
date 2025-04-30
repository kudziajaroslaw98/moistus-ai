import { useState, useCallback, useEffect } from "react";
import { Node } from "@xyflow/react"; // Don't need Edge import here anymore
import { NodeData } from "@/types/node-data";
import { AppEdge } from "@/types/edge-data"; // Use AppEdge
import { HistoryState } from "@/types/history-state";
import { useNotifications } from "./use-notifications";

interface UseMindMapHistoryProps {
  initialNodes: Node<NodeData>[];
  initialEdges: AppEdge[]; // Use AppEdge for initial edges
  nodes: Node<NodeData>[];
  edges: AppEdge[]; // Use AppEdge for current edges
  setNodes: React.Dispatch<React.SetStateAction<Node<NodeData>[]>>;
  setEdges: React.Dispatch<React.SetStateAction<AppEdge[]>>; // Use AppEdge
}

interface UseMindMapHistoryResult {
  addStateToHistory: (sourceAction?: string) => void;
  handleUndo: () => void;
  handleRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  currentHistoryState: HistoryState | undefined;
}

function debounce<F extends (...args: unknown[]) => unknown>(
  func: F,
  waitFor: number,
): (...args: Parameters<F>) => void {
  // Add return type
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<F>): void => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => func(...args), waitFor);
  };
}

export function useMindMapHistory({
  initialNodes,
  initialEdges,
  nodes,
  edges, // Use AppEdge
  setNodes,
  setEdges, // Use AppEdge
}: UseMindMapHistoryProps): UseMindMapHistoryResult {
  const [history, setHistory] = useState<HistoryState[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const { showNotification } = useNotifications();

  // Initialize history when initial data is loaded
  useEffect(() => {
    if (initialNodes.length > 0 || initialEdges.length > 0) {
      const initialState: HistoryState = {
        nodes: initialNodes,
        edges: initialEdges,
      }; // Cast or ensure compatibility
      setHistory([initialState]);
      setHistoryIndex(0);
    } else {
      // If map loads empty, add an initial empty state
      const initialState: HistoryState = { nodes: [], edges: [] };
      setHistory([initialState]);
      setHistoryIndex(0);
    }
  }, [initialNodes, initialEdges]); // Depend on initial data arrays

  const addStateToHistory = useCallback(
    // Removed sourceAction as it wasn't used
    () => {
      const currentState: HistoryState = { nodes, edges }; // Current state from arguments
      const lastHistoryState = history[historyIndex]; // State from history state

      // Simple comparison - might need deep comparison for complex data
      if (
        !lastHistoryState ||
        JSON.stringify(currentState) !== JSON.stringify(lastHistoryState)
      ) {
        // Slice history to remove future states if undo/redo occurred
        const newHistory = history.slice(0, historyIndex + 1);
        newHistory.push(currentState);
        setHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
        // console.log("History added. New index:", newHistory.length - 1, newHistory);
      } else {
        // console.log("State unchanged, not adding history.");
      }
    },
    [history, historyIndex, nodes, edges], // Depend on history state and current nodes/edges
  );

  // Debounced version for frequent updates (e.g., dragging)
  const debouncedAddStateToHistory = useCallback(
    debounce(addStateToHistory, 300), // 300ms debounce
    [addStateToHistory], // Depends on the memoized addStateToHistory
  );

  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const previousState = history[historyIndex - 1];
      // Apply the previous state
      setNodes(previousState.nodes);
      setEdges(previousState.edges);
      // Move the index back
      setHistoryIndex(historyIndex - 1);
      showNotification("Undo successful.", "success");
      // console.log("Undo. New index:", historyIndex - 1);
    } else {
      showNotification("Nothing to undo.", "error");
      // console.log("Nothing to undo.");
    }
  }, [history, historyIndex, setNodes, setEdges, showNotification]); // Depend on history state and setters

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const nextState = history[historyIndex + 1];
      // Apply the next state
      setNodes(nextState.nodes);
      setEdges(nextState.edges);
      // Move the index forward
      setHistoryIndex(historyIndex + 1);
      showNotification("Redo successful.", "success");
      // console.log("Redo. New index:", historyIndex + 1);
    } else {
      showNotification("Nothing to redo.", "error");
      // console.log("Nothing to redo.");
    }
  }, [history, historyIndex, setNodes, setEdges, showNotification]); // Depend on history state and setters

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;
  const currentHistoryState = history[historyIndex]; // Provide access to the current state

  return {
    addStateToHistory: debouncedAddStateToHistory, // Return the debounced version
    handleUndo,
    handleRedo,
    canUndo,
    canRedo,
    currentHistoryState,
  };
}

import { AppEdge } from "@/types/app-edge";
import { HistoryState } from "@/types/history-state";
import { NodeData } from "@/types/node-data";
import { Node } from "@xyflow/react";
import { useCallback, useEffect, useState } from "react";
import { useNotifications } from "./use-notifications";

interface UseMindMapHistoryProps {
  initialNodes: Node<NodeData>[];
  initialEdges: AppEdge[];
  nodes: Node<NodeData>[];
  edges: AppEdge[];
  setNodes: React.Dispatch<React.SetStateAction<Node<NodeData>[]>>;
  setEdges: React.Dispatch<React.SetStateAction<AppEdge[]>>;
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
  edges,
  setNodes,
  setEdges,
}: UseMindMapHistoryProps): UseMindMapHistoryResult {
  const [history, setHistory] = useState<HistoryState[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const { showNotification } = useNotifications();

  useEffect(() => {
    if (initialNodes.length > 0 || initialEdges.length > 0) {
      const initialState: HistoryState = {
        nodes: initialNodes,
        edges: initialEdges,
      };
      setHistory([initialState]);
      setHistoryIndex(0);
    } else {
      const initialState: HistoryState = { nodes: [], edges: [] };
      setHistory([initialState]);
      setHistoryIndex(0);
    }
  }, [initialNodes, initialEdges]);

  const addStateToHistory = useCallback(() => {
    const currentState: HistoryState = { nodes, edges };
    const lastHistoryState = history[historyIndex];

    if (
      !lastHistoryState ||
      JSON.stringify(currentState) !== JSON.stringify(lastHistoryState)
    ) {
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(currentState);
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
    } else {
    }
  }, [history, historyIndex, nodes, edges]);

  const debouncedAddStateToHistory = debounce(addStateToHistory, 300);

  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const previousState = history[historyIndex - 1];

      setNodes(previousState.nodes);
      setEdges(previousState.edges);

      setHistoryIndex(historyIndex - 1);
      showNotification("Undo successful.", "success");
    } else {
      showNotification("Nothing to undo.", "error");
    }
  }, [history, historyIndex, setNodes, setEdges, showNotification]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const nextState = history[historyIndex + 1];

      setNodes(nextState.nodes);
      setEdges(nextState.edges);

      setHistoryIndex(historyIndex + 1);
      showNotification("Redo successful.", "success");
    } else {
      showNotification("Nothing to redo.", "error");
    }
  }, [history, historyIndex, setNodes, setEdges, showNotification]);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;
  const currentHistoryState = history[historyIndex];

  return {
    addStateToHistory: debouncedAddStateToHistory,
    handleUndo,
    handleRedo,
    canUndo,
    canRedo,
    currentHistoryState,
  };
}

import { AppEdge } from "@/types/app-edge";
import { HistoryState } from "@/types/history-state";
import { NodeData } from "@/types/node-data";
import { Node } from "@xyflow/react";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useEffect,
  useState,
} from "react";
import { toast } from "sonner";
import { CrudActions } from "./use-mind-map-crud"; // Import CrudActions

interface UseMindMapHistoryProps {
  nodes: Node<NodeData>[];
  edges: AppEdge[];
  setNodes: Dispatch<SetStateAction<Node<NodeData>[]>>;
  setEdges: Dispatch<SetStateAction<AppEdge[]>>;
  crudActions: CrudActions | null; // Add crudActions prop
  isStateLoading: boolean;
}

interface UseMindMapHistoryResult {
  addStateToHistory: (
    actionName?: string,
    stateOverride?: { nodes?: Node<NodeData>[]; edges?: AppEdge[] }, // Updated signature
  ) => void;
  handleUndo: () => void;
  handleRedo: () => void;
  revertToHistoryState: (index: number) => Promise<void>; // New function
  canUndo: boolean;
  canRedo: boolean;
  currentHistoryState: HistoryState | undefined;
  history: HistoryState[]; // Expose history array
  historyIndex: number; // Expose current index
}

export function useMindMapHistory({
  nodes: currentNodes, // Rename for clarity
  edges: currentEdges, // Rename for clarity
  setNodes,
  setEdges,
  crudActions, // Destructure crudActions
  isStateLoading,
}: UseMindMapHistoryProps): UseMindMapHistoryResult {
  const [history, setHistory] = useState<HistoryState[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [isReverting, setIsReverting] = useState(false); // Prevent overlapping reverts

  useEffect(() => {
    if (!isStateLoading && history.length === 0) {
      const initialState: HistoryState = {
        nodes: currentNodes,
        edges: currentEdges,
        timestamp: Date.now(), // Add timestamp
        actionName: "initialLoad", // Add action name
      };
      setHistory([initialState]);
      setHistoryIndex(0);
    }
  }, [currentNodes, currentEdges, isStateLoading]);

  const addStateToHistory = useCallback(
    (
      actionName?: string,
      stateOverride?: { nodes?: Node<NodeData>[]; edges?: AppEdge[] },
    ) => {
      // Use override if provided, otherwise use current context state from props
      const nodesToSave = stateOverride?.nodes ?? currentNodes;
      const edgesToSave = stateOverride?.edges ?? currentEdges;

      const stateToPush: HistoryState = {
        nodes: nodesToSave,
        edges: edgesToSave,
        timestamp: Date.now(),
        actionName: actionName || "unknown",
      };
      const lastHistoryState = history[historyIndex];

      // Avoid pushing identical states consecutively
      if (
        !lastHistoryState ||
        JSON.stringify({
          nodes: stateToPush.nodes,
          edges: stateToPush.edges,
        }) !==
          JSON.stringify({
            nodes: lastHistoryState.nodes,
            edges: lastHistoryState.edges,
          })
      ) {
        const newHistory = history.slice(0, historyIndex + 1);
        newHistory.push(stateToPush);
        setHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
        console.log(
          `History added: ${actionName || "unknown"}, Index: ${newHistory.length - 1}`,
        );
      } else {
        // console.log("Skipped adding identical history state.");
      }
    },
    [history, historyIndex, currentNodes, currentEdges], // Depend on current state from props
  );

  const handleUndo = useCallback(async () => {
    if (historyIndex > 0) {
      const currentState = history[historyIndex]; // State *before* undo
      const previousState = history[historyIndex - 1]; // State to restore to

      // Restore client state first
      setNodes(previousState.nodes);
      setEdges(previousState.edges);
      setHistoryIndex(historyIndex - 1);

      // Find nodes/edges that were deleted (exist in previous but not current)
      const currentNodesMap = new Map(currentState.nodes.map((n) => [n.id, n]));
      const currentEdgesMap = new Map(currentState.edges.map((e) => [e.id, e]));

      console.log(currentNodesMap, currentEdgesMap);
      console.log(previousState.nodes, previousState.edges);

      const nodesToRestore = previousState.nodes.filter(
        (node) => !currentNodesMap.has(node.id),
      );
      const edgesToRestore = previousState.edges.filter(
        (edge) => !currentEdgesMap.has(edge.id),
      );

      console.log(nodesToRestore, edgesToRestore);

      // Restore in DB (no need to await all, can run in parallel)
      let restorePromises: Promise<void>[] = [];
      nodesToRestore.forEach((node) => {
        console.log(`Undo: Restoring node ${node.id}`);

        if (crudActions) {
          restorePromises.push(crudActions.restoreNode(node));
        }
      });

      try {
        await Promise.all(restorePromises);
        toast.success("Undo node changes successful.");

        restorePromises = [];
        edgesToRestore.forEach((edge) => {
          console.log(`Undo: Restoring edge ${edge.id}`);

          if (crudActions) {
            restorePromises.push(crudActions.restoreEdge(edge));
          }
        });

        await Promise.all(restorePromises);
        toast.success("Undo edge changes successful.");
      } catch (error) {
        console.error("Error during undo DB restore:", error);
        toast.error(
          "Undo changes completed, but DB restore failed for some items.",
        );
      }
    } else {
      toast.info("Nothing to undo.");
    }
  }, [history, historyIndex, crudActions]); // Add crudActions dependency

  const handleRedo = useCallback(async () => {
    if (historyIndex < history.length - 1) {
      const currentState = history[historyIndex]; // State *before* redo
      const nextState = history[historyIndex + 1]; // State to restore to

      // Restore client state first
      setNodes(nextState.nodes);
      setEdges(nextState.edges);
      setHistoryIndex(historyIndex + 1);

      // Find nodes/edges that were added back (exist in current but not next)
      const nextNodesMap = new Map(nextState.nodes.map((n) => [n.id, n]));
      const nextEdgesMap = new Map(nextState.edges.map((e) => [e.id, e]));

      const nodesToDeleteAgain = currentState.nodes.filter(
        (node) => !nextNodesMap.has(node.id),
      );
      const edgesToDeleteAgain = currentState.edges.filter(
        (edge) => !nextEdgesMap.has(edge.id),
      );

      // Delete from DB again (no need to await all, can run in parallel)
      const deletePromises: Promise<void>[] = [];
      nodesToDeleteAgain.forEach((node) => {
        console.log(`Redo: Deleting node ${node.id} again`);

        if (crudActions) {
          // Pass true to skip adding another history state
          deletePromises.push(crudActions.deleteNode(node.id, true));
        }
      });
      edgesToDeleteAgain.forEach((edge) => {
        console.log(`Redo: Deleting edge ${edge.id} again`);

        if (crudActions) {
          // Pass true to skip adding another history state
          deletePromises.push(crudActions.deleteEdge(edge.id, true));
        }
      });

      try {
        await Promise.all(deletePromises);
        toast.success("Redo successful.");
      } catch (error) {
        console.error("Error during redo DB delete:", error);
        toast.error("Redo completed, but DB delete failed for some items.");
      }
    } else {
      toast.info("Nothing to redo.");
    }
  }, [history, historyIndex, crudActions]); // Add crudActions dependency

  const revertToHistoryState = useCallback(
    async (index: number) => {
      if (isReverting || index < 0 || index >= history.length) {
        toast.error("Invalid history state selected.");
        return;
      }

      if (index === historyIndex) {
        toast.warning("Already at this history state.");
        return;
      }

      setIsReverting(true);
      toast.info(`Reverting to state ${index + 1}...`);

      const targetState = history[index];
      const currentState = history[historyIndex]; // State *before* reverting

      try {
        // 1. Restore Client State
        setNodes(targetState.nodes);
        setEdges(targetState.edges);
        setHistoryIndex(index); // Update the index immediately for UI feedback

        // 2. Database Synchronization (More complex - requires diffing)
        // For now, we'll just update the client state.
        // A robust implementation would compare `currentState` and `targetState`
        // and make corresponding DB calls (create, delete, update).
        // This is similar logic to undo/redo but potentially across multiple steps.
        // Example (Conceptual - needs proper diffing logic):
        // const { nodesToAdd, nodesToDelete, nodesToUpdate } = diffNodes(currentState.nodes, targetState.nodes);
        // const { edgesToAdd, edgesToDelete, edgesToUpdate } = diffEdges(currentState.edges, targetState.edges);
        // await Promise.all([
        //   ...nodesToAdd.map(node => crudActions?.restoreNode(node)),
        //   ...nodesToDelete.map(nodeId => crudActions?.deleteNode(nodeId, true)), // skip history
        //   ...edgesToAdd.map(edge => crudActions?.restoreEdge(edge)),
        //   ...edgesToDelete.map(edgeId => crudActions?.deleteEdge(edgeId, true)), // skip history
        //   // ...handle updates
        // ]);

        // Simple notification for now
        toast.success(`Reverted to state ${index + 1}. Review changes.`);

        // IMPORTANT: Reverting doesn't automatically add a new history state.
        // If the user makes changes *after* reverting, a new state will be added,
        // effectively branching the history (like git).
      } catch (error) {
        console.error("Error reverting history state:", error);
        toast.error("Failed to revert history state.");
        // Attempt to restore the previous state if revert fails? (Could be complex)
        setNodes(currentState.nodes);
        setEdges(currentState.edges);
        setHistoryIndex(historyIndex); // Revert index back
      } finally {
        setIsReverting(false);
      }
    },
    [history, historyIndex, isReverting], // Add crudActions and isReverting
  );

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;
  const currentHistoryState = history[historyIndex];

  return {
    addStateToHistory,
    handleUndo,
    handleRedo,
    revertToHistoryState, // Add new function
    canUndo,
    canRedo,
    currentHistoryState,
    history, // Expose history
    historyIndex, // Expose index
  };
}

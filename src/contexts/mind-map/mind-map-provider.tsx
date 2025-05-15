import { useAiFeatures } from "@/hooks/use-ai-features";
import { useContextMenu } from "@/hooks/use-context-menu";
import { useLayout } from "@/hooks/use-layout";
import { useMindMapCRUD } from "@/hooks/use-mind-map-crud";
import { useMindMapData } from "@/hooks/use-mind-map-data";
import { useMindMapHistory } from "@/hooks/use-mind-map-history";
import { useMindMapState } from "@/hooks/use-mind-map-state";
import { useNotifications } from "@/hooks/use-notifications";
import { AppEdge } from "@/types/app-edge";
import { NodeData } from "@/types/node-data";
import {
  OnEdgesChange,
  OnNodesChange,
  ReactFlowInstance,
  XYPosition,
  useReactFlow,
  type Node,
} from "@xyflow/react";
import { useParams } from "next/navigation";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import MindMapContext from "./mind-map-context";

interface MindMapProviderProps {
  children: React.ReactNode;
}

export function MindMapProvider({ children }: MindMapProviderProps) {
  const params = useParams();
  const mapId = params.id as string;
  const [reactFlowInstance, setReactFlowInstance] =
    useState<ReactFlowInstance | null>(null); // Store the whole instance initially

  const [isFocusMode, setIsFocusMode] = useState(false);
  const [copiedNodes, setCopiedNodes] = useState<Node<NodeData>[]>([]);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isNodeTypeModalOpen, setIsNodeTypeModalOpen] = useState(false);
  const [nodeToAddInfo, setNodeToAddInfo] = useState<{
    parentId: string | null;
    position?: XYPosition;
  } | null>(null);
  const [isNodeEditModalOpen, setIsNodeEditModalOpen] = useState(false);
  const [nodeToEdit, setNodeToEdit] = useState<NodeData | null>(null);
  const [isEdgeEditModalOpen, setIsEdgeEditModalOpen] = useState(false);
  const [edgeToEdit, setEdgeToEdit] = useState<AppEdge | null>(null);
  const [isHistorySidebarOpen, setIsHistorySidebarOpen] = useState(false); // New state

  // --- Initialize Hooks ---
  const { notification, showNotification } = useNotifications();
  const {
    mindMap,
    initialNodes,
    initialEdges,
    isLoading: isDataLoading,
    error: dataError,
  } = useMindMapData(mapId);

  const {
    nodes,
    setNodes,
    onNodesChange: directNodesChangeHandler,
    edges,
    setEdges,
    onEdgesChange: directEdgesChangeHandler,
  } = useMindMapState(initialNodes, initialEdges);

  const crudActionsRef = useRef<
    ReturnType<typeof useMindMapCRUD>["crudActions"] | null
  >(null);
  const aiActionsRef = useRef<
    ReturnType<typeof useAiFeatures>["aiActions"] | null
  >(null);

  const {
    addStateToHistory,
    handleUndo,
    handleRedo,
    revertToHistoryState, // Get new function
    canUndo,
    canRedo,
    currentHistoryState,
    history, // Get history array
    historyIndex, // Get history index
  } = useMindMapHistory({
    initialNodes,
    initialEdges,
    nodes,
    edges,
    setNodes,
    setEdges,
    crudActions: crudActionsRef.current,
  });

  const { crudActions, isLoading: isCrudLoading } = useMindMapCRUD({
    mapId,
    nodes,
    edges,
    setNodes,
    setEdges,
    addStateToHistory,
    showNotification,
    aiActions: aiActionsRef.current,
  });

  crudActionsRef.current = crudActions;

  const {
    aiActions,
    aiLoadingStates,
    suggestedEdges,
    mergeSuggestions,
    isAiContentModalOpen,
    setIsAiContentModalOpen,
    aiContentTargetNodeId,
    isMergeModalOpen,
    setIsMergeModalOpen,
    aiPrompt,
    aiSearchQuery,
  } = useAiFeatures({
    mapId,
    nodes,
    addNode: crudActions.addNode,
    deleteNode: crudActions.deleteNode,
    saveEdge: crudActions.addEdge,
    saveNodeContent: crudActions.saveNodeContent,
    setNodes,
    setEdges,
    saveNodeMetadata: crudActions.saveNodeMetadata,
    saveNodeAiData: crudActions.saveNodeAiData,
    addStateToHistory,
    showNotification,
    currentHistoryState,
  });
  aiActionsRef.current = aiActions;

  const { contextMenuHandlers, contextMenuState } = useContextMenu();

  const { applyLayout, isLoading: isLayoutLoading } = useLayout({
    nodes,
    edges,
    setNodes,
    reactFlowInstance: reactFlowInstance,
    addStateToHistory,
    showNotification,
    saveNodePosition: crudActions.saveNodePosition,
  });

  // --- Combined Loading State ---
  const isLoading = useMemo(
    () =>
      isDataLoading ||
      isCrudLoading ||
      isLayoutLoading ||
      Object.values(aiLoadingStates).some((loading) => loading),
    [isDataLoading, isCrudLoading, isLayoutLoading, aiLoadingStates],
  );

  // --- UI Actions ---
  const toggleFocusMode = useCallback(() => {
    setIsFocusMode((prev) => !prev);
  }, []);

  const handleCopy = useCallback(() => {
    if (!reactFlowInstance) return;
    const currentNodes = reactFlowInstance.getNodes();
    const selectedNodes = currentNodes.filter((node) => node.selected);

    if (selectedNodes.length > 0) {
      const nodesToCopy = selectedNodes.map((node) => ({
        ...node,
        data: { ...node.data },
        selected: false,
      })) as Node<NodeData>[];
      setCopiedNodes(nodesToCopy);
      showNotification(
        `Copied ${selectedNodes.length} node${selectedNodes.length > 1 ? "s" : ""}.`,
        "success",
      );
    } else {
      setCopiedNodes([]);
    }
  }, [reactFlowInstance, showNotification]);

  const handlePaste = useCallback(async () => {
    if (copiedNodes.length === 0 || !reactFlowInstance) {
      showNotification("Nothing to paste.", "error");
      return;
    }

    showNotification("Pasting nodes...", "success");
    const currentNodes = reactFlowInstance.getNodes();
    const selectedNodes = currentNodes.filter((node) => node.selected);
    const targetParentId =
      selectedNodes.length === 1 ? selectedNodes[0].id : null;
    const pasteCenter = reactFlowInstance.screenToFlowPosition({
      x: window.innerWidth / 2,
      y: window.innerHeight / 2 - 30,
    });
    const pastedNodeIds: string[] = [];

    try {
      const createdNodes = await Promise.all(
        copiedNodes.map(async (copiedNode, index) => {
          const newPosition: XYPosition = {
            x: pasteCenter.x + index * 30 + Math.random() * 10 - 5,
            y: pasteCenter.y + index * 30 + Math.random() * 10 - 5,
          };
          const clonedData = { ...copiedNode.data };
          const initialDataForNewNode: Partial<NodeData> = {
            ...clonedData,
            content: (clonedData.content || "") + " (Copy)",
            id: undefined,
            parent_id: undefined,
            position_x: undefined,
            position_y: undefined,
            embedding: undefined,
            aiSummary: undefined,
            extractedConcepts: undefined,
            isSearchResult: undefined,
            metadata: {
              // Ensure metadata is copied, including isCollapsed
              ...(clonedData.metadata || {}),
            },
          };
          const newNode = await crudActions.addNode(
            targetParentId,
            initialDataForNewNode.content ?? "",
            copiedNode.type ?? "defaultNode",
            newPosition,
            initialDataForNewNode,
          );
          if (newNode) pastedNodeIds.push(newNode.id);
          return newNode;
        }),
      );
      const successfulNodes = createdNodes.filter((node) => node !== null);

      if (successfulNodes.length > 0) {
        addStateToHistory("pasteNodes");
        setNodes((nds) =>
          nds.map((n) => ({ ...n, selected: pastedNodeIds.includes(n.id) })),
        );
        setEdges((eds) => eds.map((e) => ({ ...e, selected: false })));
        showNotification(
          `Pasted ${successfulNodes.length} node${successfulNodes.length > 1 ? "s" : ""}.`,
          "success",
        );
      } else {
        showNotification("Failed to paste nodes.", "error");
      }
    } catch (error) {
      console.error("Error during paste operation:", error);
      showNotification("An error occurred while pasting.", "error");
    }
  }, [
    copiedNodes,
    reactFlowInstance,
    crudActions,
    showNotification,
    setNodes,
    setEdges,
    addStateToHistory,
  ]);

  const handleNodesChangeWithSave: OnNodesChange = useCallback(
    (changes) => {
      changes.forEach((change) => crudActions.triggerNodeSave(change));
      addStateToHistory("nodeChange");
    },
    [directNodesChangeHandler, crudActions.triggerNodeSave, addStateToHistory],
  );

  const handleEdgesChangeWithSave: OnEdgesChange = useCallback(
    (changes) => {
      directEdgesChangeHandler(changes);
      changes.forEach((change) => crudActions.triggerEdgeSave(change));
      addStateToHistory("edgeChange");
    },
    [directEdgesChangeHandler, crudActions.triggerEdgeSave, addStateToHistory],
  );

  useEffect(() => {
    if (nodeToEdit !== null) {
      setNodeToEdit(
        (prev) => nodes.find((n) => n.id === prev?.id)?.data ?? null,
      );
    }
  }, [nodes, nodeToEdit]);

  // --- Collapse/Expand Logic ---
  const toggleNodeCollapse = useCallback(
    async (nodeId: string) => {
      console.log(`[toggleNodeCollapse] Triggered for nodeId: ${nodeId}`);
      const targetNodeIndex = nodes.findIndex((n) => n.id === nodeId);

      if (targetNodeIndex === -1) {
        console.warn(`[toggleNodeCollapse] Node not found: ${nodeId}`);
        return;
      }

      const targetNode = nodes[targetNodeIndex];
      const currentCollapsedState =
        targetNode.data.metadata?.isCollapsed ?? false;
      const newCollapsedState = !currentCollapsedState;
      console.log(
        `[toggleNodeCollapse] NodeId: ${nodeId}, currentCollapsed: ${currentCollapsedState}, newCollapsed: ${newCollapsedState}`,
      );

      // Optimistically update local state for UI responsiveness
      const updatedNodesOptimistic = nodes.map((n) =>
        n.id === nodeId
          ? {
              ...n,
              data: {
                ...n.data,
                metadata: {
                  ...(n.data.metadata || {}),
                  isCollapsed: newCollapsedState,
                },
              },
            }
          : n,
      );

      const updatedTargetNodeForLog = updatedNodesOptimistic.find(
        (n) => n.id === nodeId,
      );
      console.log(
        `[toggleNodeCollapse] Optimistic update for ${nodeId}. New isCollapsed: ${updatedTargetNodeForLog?.data.metadata?.isCollapsed}`,
      );

      setNodes(updatedNodesOptimistic); // This will trigger the visibility useEffect

      try {
        await crudActions.saveNodeMetadata(nodeId, {
          isCollapsed: newCollapsedState,
        });
        addStateToHistory("toggleNodeCollapse");
        showNotification(
          `Branch ${newCollapsedState ? "collapsed" : "expanded"}.`,
          "success",
        );
      } catch (error) {
        showNotification("Error saving collapse state.", "error");
        // Revert optimistic update if save fails
        const revertedNodes = nodes.map((n) =>
          n.id === nodeId
            ? {
                ...n,
                data: {
                  ...n.data,
                  metadata: {
                    ...(n.data.metadata || {}),
                    isCollapsed: currentCollapsedState, // Revert to original state
                  },
                },
              }
            : n,
        );
        setNodes(revertedNodes);
      }
    },
    [nodes, setNodes, crudActions, addStateToHistory, showNotification],
  );

  // useEffect(() => {
  //   const debounceTimeout = setTimeout(() => {
  //     // Skip unnecessary updates
  //     if (nodes.length === 0 && initialNodes.length === 0) {
  //       return;
  //     }

  //     // Create Map for O(1) lookups
  //     const nodeMap = new Map(nodes.map((node) => [node.id, node]));
  //     const visibilityCache = new Map<string, boolean>();

  //     const getIsAnyAncestorCollapsed = (startingNodeId: string): boolean => {
  //       // Check cache first
  //       if (visibilityCache.has(startingNodeId)) {
  //         return visibilityCache.get(startingNodeId)!;
  //       }

  //       let currentNodeId: string | null | undefined = startingNodeId;
  //       const visitedNodes = new Set<string>();

  //       while (currentNodeId) {
  //         const node = nodeMap.get(currentNodeId);
  //         if (!node || visitedNodes.has(currentNodeId)) break;

  //         visitedNodes.add(currentNodeId);

  //         if (node.data.metadata?.isCollapsed) {
  //           visibilityCache.set(startingNodeId, true);
  //           return true;
  //         }

  //         currentNodeId = node.data.parent_id;
  //       }

  //       visibilityCache.set(startingNodeId, false);
  //       return false;
  //     };

  //     // Batch updates using a single state update
  //     const updatedNodes = nodes.map((n) => {
  //       const shouldBeHidden = getIsAnyAncestorCollapsed(n.id);
  //       return n.hidden === shouldBeHidden
  //         ? n
  //         : { ...n, hidden: shouldBeHidden };
  //     });

  //     const updatedEdges = edges.map((e) => {
  //       const sourceHidden = nodeMap.get(e.source)?.hidden ?? false;
  //       const targetHidden = nodeMap.get(e.target)?.hidden ?? false;
  //       const shouldBeHidden = sourceHidden || targetHidden;
  //       return e.hidden === shouldBeHidden
  //         ? e
  //         : { ...e, hidden: shouldBeHidden };
  //     });

  //     setNodes(updatedNodes);
  //     setEdges(updatedEdges);
  //   }, 100); // Add 100ms debounce

  //   return () => clearTimeout(debounceTimeout);
  // }, [nodes, edges, setNodes, setEdges, initialNodes]);

  // --- Context Value ---
  const contextValue = useMemo(
    () => ({
      mapId,
      nodes,
      edges,
      onNodesChange: handleNodesChangeWithSave,
      onEdgesChange: handleEdgesChangeWithSave,
      isLoading,
      isDataLoading,
      isCrudLoading,
      isLayoutLoading,
      aiLoadingStates,
      notification,
      canUndo,
      canRedo,
      currentHistoryState,
      suggestedEdges,
      mergeSuggestions,
      isAiContentModalOpen,
      aiContentTargetNodeId,
      isMergeModalOpen,
      isNodeTypeModalOpen,
      isNodeEditModalOpen,
      nodeToEdit,
      isEdgeEditModalOpen,
      edgeToEdit,
      isCommandPaletteOpen,
      isFocusMode,
      aiPrompt,
      aiSearchQuery,
      history, // Pass history array
      historyIndex, // Pass history index
      isHistorySidebarOpen, // Pass sidebar state
      setNodes,
      setEdges,
      showNotification,
      crudActions,
      aiActions,
      applyLayout,
      handleUndo,
      handleRedo,
      addStateToHistory,
      revertToHistoryState, // Pass revert function
      contextMenuHandlers,
      reactFlowInstance: reactFlowInstance as ReturnType<
        typeof useReactFlow
      > | null,
      setReactFlowInstance: setReactFlowInstance as (
        instance: ReturnType<typeof useReactFlow> | null,
      ) => void,
      setIsAiContentModalOpen,
      setIsMergeModalOpen,
      setIsNodeTypeModalOpen,
      setNodeToAddInfo,
      nodeToAddInfo, // Add this line
      setIsNodeEditModalOpen,
      setNodeToEdit,
      setIsEdgeEditModalOpen,
      setEdgeToEdit,
      setIsCommandPaletteOpen,
      setIsHistorySidebarOpen, // Pass sidebar setter
      toggleFocusMode,
      handleCopy,
      handlePaste,
      mindMap,
      contextMenuState,
      toggleNodeCollapse,
    }),
    [
      mapId,
      nodes,
      edges,
      isLoading,
      isDataLoading,
      isCrudLoading,
      isLayoutLoading,
      aiLoadingStates,
      notification,
      canUndo,
      canRedo,
      currentHistoryState,
      suggestedEdges,
      mergeSuggestions,
      isAiContentModalOpen,
      aiContentTargetNodeId,
      isMergeModalOpen,
      isNodeTypeModalOpen,
      isNodeEditModalOpen,
      nodeToEdit,
      isEdgeEditModalOpen,
      edgeToEdit,
      isCommandPaletteOpen,
      isFocusMode,
      aiPrompt,
      aiSearchQuery,
      history,
      historyIndex,
      isHistorySidebarOpen,
      nodeToAddInfo, // Add dependency here
      setNodes,
      setEdges,
      showNotification,
      crudActions,
      aiActions,
      applyLayout,
      handleUndo,
      handleRedo,
      addStateToHistory,
      revertToHistoryState,
      contextMenuHandlers,
      reactFlowInstance,
      setReactFlowInstance,
      setIsAiContentModalOpen,
      setIsMergeModalOpen,
      setIsNodeTypeModalOpen,
      setNodeToAddInfo,
      setIsNodeEditModalOpen,
      setNodeToEdit,
      setIsEdgeEditModalOpen,
      setEdgeToEdit,
      setIsCommandPaletteOpen,
      setIsHistorySidebarOpen,
      toggleFocusMode,
      handleCopy,
      handlePaste,
      handleNodesChangeWithSave,
      handleEdgesChangeWithSave,
      mindMap,
      contextMenuState,
      toggleNodeCollapse,
    ],
  );

  // Handle data loading error
  useEffect(() => {
    if (dataError && !mindMap) {
      showNotification(`Error loading map: ${dataError}`, "error");
      // Potentially redirect or show a more permanent error UI
    }
  }, [dataError, mindMap, showNotification]);

  // Handle initial loading state
  if (isDataLoading && !mindMap && !dataError) {
    return (
      <div className="flex min-h-full items-center justify-center text-zinc-400">
        Loading mind map...
      </div>
    );
  }

  // Handle case where mapId is invalid or map not found after loading attempt
  if (!isDataLoading && !mindMap && !dataError && mapId) {
    // Added mapId check to ensure it's not a pre-load scenario
    return (
      <div className="flex min-h-full items-center justify-center text-zinc-400">
        Mind map not found or invalid ID.
      </div>
    );
  }

  return (
    <MindMapContext.Provider value={contextValue}>
      {children}
    </MindMapContext.Provider>
  );
}

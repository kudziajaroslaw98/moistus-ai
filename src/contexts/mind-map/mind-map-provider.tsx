import { useAiFeatures } from "@/hooks/use-ai-features";
import { useContextMenu } from "@/hooks/use-context-meny";
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
import React, { useCallback, useMemo, useState } from "react";
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
  const [nodeToEdit, setNodeToEdit] = useState<Node<NodeData> | null>(null);
  const [isEdgeEditModalOpen, setIsEdgeEditModalOpen] = useState(false);
  const [edgeToEdit, setEdgeToEdit] = useState<AppEdge | null>(null);

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

  const {
    addStateToHistory,
    handleUndo,
    handleRedo,
    canUndo,
    canRedo,
    currentHistoryState,
  } = useMindMapHistory({
    initialNodes,
    initialEdges,
    nodes,
    edges,
    setNodes,
    setEdges,
  });

  // Note: Pass context setters/getters to hooks if needed, or modify hooks later
  const { crudActions, isLoading: isCrudLoading } = useMindMapCRUD({
    mapId,
    nodes,
    edges,
    setNodes,
    setEdges,
    addStateToHistory,
    showNotification,
  });

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
    addNode: crudActions.addNode, // Pass specific actions needed
    deleteNode: crudActions.deleteNode,
    saveEdge: crudActions.addEdge, // Assuming addEdge returns the saved edge
    saveNodeContent: crudActions.saveNodeContent,
    setNodes,
    setEdges,
    addStateToHistory,
    showNotification,
    currentHistoryState,
  });

  const { contextMenuState, contextMenuHandlers } = useContextMenu();

  // Pass the actual reactFlowInstance once available
  const { applyLayout, isLoading: isLayoutLoading } = useLayout({
    nodes,
    edges,
    setNodes,
    reactFlowInstance: reactFlowInstance,
    addStateToHistory,
    showNotification,
    currentHistoryState,
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
      directNodesChangeHandler(changes);
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
      contextMenuState,
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
      setNodes,
      setEdges,
      showNotification,
      crudActions,
      aiActions,
      applyLayout,
      handleUndo,
      handleRedo,
      addStateToHistory,
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
      setIsNodeEditModalOpen,
      setNodeToEdit,
      setIsEdgeEditModalOpen,
      setEdgeToEdit,
      setIsCommandPaletteOpen,
      toggleFocusMode,
      handleCopy,
      handlePaste,
      mindMap,
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
      contextMenuState,
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
      setNodes,
      setEdges,
      showNotification,
      crudActions,
      aiActions,
      applyLayout,
      handleUndo,
      handleRedo,
      addStateToHistory,
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
      toggleFocusMode,
      handleCopy,
      handlePaste,
      handleNodesChangeWithSave,
      handleEdgesChangeWithSave,
      mindMap,
    ],
  );

  // Handle data loading error
  if (dataError && !mindMap) {
    return (
      <div className="flex min-h-full items-center justify-center text-rose-400">
        Error loading map: {dataError}
      </div>
    );
  }

  // Handle initial loading state
  if (isDataLoading && !mindMap) {
    return (
      <div className="flex min-h-full items-center justify-center text-zinc-400">
        Loading mind map...
      </div>
    );
  }

  // Handle case where mapId is invalid or map not found after loading attempt
  if (!isDataLoading && !mindMap) {
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

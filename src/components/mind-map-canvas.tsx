"use client";

import {
  ReactFlow,
  Background,
  Controls, // <-- Import Controls
  MiniMap,
  useReactFlow,
  Edge,
  OnNodesChange,
  Connection,
  ReactFlowInstance,
  Node,
  NodeTypes,
  EdgeTypes,
  XYPosition,
  SelectionMode,
  OnEdgesChange,
  EdgeMouseHandler,
} from "@xyflow/react";
import { useParams } from "next/navigation";
import React, { useMemo, useState, useCallback, useEffect } from "react"; // Import necessary hooks

// --- Hooks ---
import { useNotifications } from "@/hooks/use-notifications";
import { useMindMapData } from "@/hooks/use-mind-map-data";
import { useMindMapState } from "@/hooks/use-mind-map-state";
import { useMindMapHistory } from "@/hooks/use-mind-map-history";
import { useMindMapCRUD } from "@/hooks/use-mind-map-crud";
import { useAiFeatures } from "@/hooks/use-ai-features";
import { useContextMenu } from "@/hooks/use-context-meny";
import { useLayout } from "@/hooks/use-layout";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";

// --- UI Components ---
import { ContextMenuDisplay } from "./context-menu-display";
import { NotificationsDisplay } from "./notifications-display";
import AiContentPromptModal from "./ai-content-prompt-modal";
import MergeSuggestionsModal from "./merge-suggestions-modal";
import { MindMapToolbar } from "./mind-map-toolbar/mind-map-toolbar";
import SelectNodeTypeModal from "./select-node-type-modal"; // Import the new modal

// --- Constants and Types ---
import { edgeTypes as customEdgeTypes } from "@/constants/edge-types";
import { nodeTypes as customNodeTypes } from "@/constants/node-types";
import { NodeData } from "@/types/node-data";
import { EdgeData } from "@/types/edge-data";

// Define node and edge types explicitly for ReactFlow component
const nodeTypes: NodeTypes = customNodeTypes;
const edgeTypes: EdgeTypes = customEdgeTypes;

export function MindMapCanvas() {
  const params = useParams();
  const mapId = params.id as string;
  // Correct generic types for useReactFlow and ReactFlowInstance
  const reactFlowInstance = useReactFlow<Node<NodeData>, Edge<EdgeData>>();

  // --- Modals State ---
  const [isNodeTypeModalOpen, setIsNodeTypeModalOpen] = useState(false);
  const [nodeToAddInfo, setNodeToAddInfo] = useState<{
    parentId: string | null;
    position?: XYPosition;
  } | null>(null);

  // --- State Management & Data Fetching ---
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
    onNodesChange,
    edges,
    setEdges,
    onEdgesChange,
    onConnect,
  } = useMindMapState(initialNodes, initialEdges); // useMindMapState manages internal nodes/edges state

  // --- History ---
  const {
    addStateToHistory,
    handleUndo,
    handleRedo,
    canUndo,
    canRedo,
    currentHistoryState, // Keep currentHistoryState if needed for other hooks
  } = useMindMapHistory({
    initialNodes,
    initialEdges,
    nodes, // Pass current nodes state
    edges, // Pass current edges state
    setNodes,
    setEdges,
  });

  // --- CRUD Operations ---
  // Pass the state setters and history/notification actions to CRUD hook
  const { crudActions, isLoading: isCrudLoading } = useMindMapCRUD({
    mapId,
    nodes, // Pass current nodes state (used for position calculation),
    edges,
    setNodes,
    setEdges, // Pass setEdges
    addStateToHistory,
    showNotification,
  });

  // --- AI Features ---
  // Pass the state setters and CRUD actions to AI hook
  const {
    aiActions,
    aiLoadingStates,
    suggestedEdges,
    mergeSuggestions,
    isAiContentModalOpen,
    setIsAiContentModalOpen,
    aiContentTargetNodeId,
    setAiContentTargetNodeId, // Use setter from AI hook
    isMergeModalOpen,
    setIsMergeModalOpen,
    aiPrompt,
    aiSearchQuery,
  } = useAiFeatures({
    mapId,
    nodes, // Pass current nodes state
    addNode: crudActions.addNode, // Pass addNode action
    deleteNode: crudActions.deleteNode, // Pass deleteNode action
    saveEdge: crudActions.addEdge, // Pass saveEdge action
    saveNodeContent: crudActions.saveNodeContent, // Pass saveNodeContent action
    setNodes, // Pass setNodes (needed for search highlight)
    setEdges, // Pass setEdges (needed for connection suggestions)
    addStateToHistory,
    showNotification,
    currentHistoryState, // Pass currentHistoryState if AI actions depend on it
  });

  // --- UI Interaction Hooks ---
  // Context Menu
  const { contextMenuState, contextMenuHandlers } = useContextMenu();

  // Layout
  const { applyLayout, isLoading: isLayoutLoading } = useLayout({
    nodes, // Pass current nodes state
    edges, // Pass current edges state
    setNodes, // Pass setNodes
    reactFlowInstance: reactFlowInstance as ReactFlowInstance<
      Node<NodeData>,
      Edge<EdgeData>
    >, // Assert type
    addStateToHistory,
    showNotification,
    currentHistoryState, // Pass currentHistoryState if layout depends on it
    saveNodePosition: crudActions.saveNodePosition, // Pass saveNodePosition action
  });

  // --- Combined Edges for Display ---
  // Use useMemo to avoid recalculating unless dependencies change
  const allEdges = useMemo(
    () => [...edges, ...suggestedEdges],
    [edges, suggestedEdges],
  );

  // --- Loading State ---
  // Combine loading states from various hooks
  const isBusy =
    isDataLoading ||
    isCrudLoading ||
    isLayoutLoading ||
    Object.values(aiLoadingStates).some((loading) => loading);

  // --- Keyboard Shortcuts ---
  // Determine selected node ID based on current nodes state
  const selectedNodeId = useMemo(
    () => nodes.find((n) => n.selected)?.id,
    [nodes],
  );
  useKeyboardShortcuts({
    onUndo: handleUndo,
    onRedo: handleRedo,
    onDelete: crudActions.deleteNode, // Pass deleteNode action
    onAddChild: (parentId: string | null) => {
      // Open the modal to select type before adding
      openNodeTypeModal(parentId);
    },
    selectedNodeId: selectedNodeId,
    canUndo,
    canRedo,
    isBusy,
  });

  // --- Event Handlers passed to ReactFlow ---

  // Handle changes from React Flow (dragging, selecting, dimensions)
  const handleNodesChange: OnNodesChange = useCallback(
    (changes) => {
      // Apply changes to local state FIRST for responsiveness
      onNodesChange(changes);
      // Then pass changes to CRUD hook for persistence and history
      crudActions.handleNodeChanges(changes, nodes); // Pass current nodes state to handler
    },
    [onNodesChange, crudActions, nodes], // Add nodes dependency for handleNodeChanges
  );

  // Handle edge changes from React Flow (shouldn't happen much with parent_id model)
  const handleEdgesChange: OnEdgesChange = useCallback(
    (changes) => {
      onEdgesChange(changes);
      // If you implement edge property editing, you'd call a crudAction here
    },
    [onEdgesChange],
  );

  // Handle new connections drawn by the user
  const handleConnectWrapper = useCallback(
    (params: Connection | Edge) => {
      // Add the new edge to local state
      const newEdges = onConnect(params);
      // Save the connection to the database (updates target node's parent_id)
      if (params.source && params.target) {
        crudActions.addEdge(params.source, params.target);
        // History is added inside saveEdge
      }
      // Return the new edge list
      return newEdges;
    },
    [onConnect, crudActions], // Add crudActions dependency
  );

  // Wrap context menu handlers to match React Flow's expected event types
  const handleNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: Node<NodeData>) => {
      contextMenuHandlers.onNodeContextMenu(event, node);
    },
    [contextMenuHandlers],
  );

  // Handle pane context menu - use the handler from the hook
  const handlePaneContextMenu = useCallback(
    (event: React.MouseEvent) => {
      contextMenuHandlers.onPaneContextMenu(event);
    },
    [contextMenuHandlers],
  );

  const handleEdgeContextMenu = useCallback<EdgeMouseHandler<Edge<EdgeData>>>( // <-- Define handler type
    (event, edge) => {
      contextMenuHandlers.onEdgeContextMenu(event, edge);
    },
    [contextMenuHandlers], // <-- Add dependency
  );

  // --- Node Type Selection Modal Logic ---
  const openNodeTypeModal = (
    parentId: string | null,
    position?: XYPosition,
  ) => {
    setNodeToAddInfo({ parentId, position }); // Store info needed after type selection
    setIsNodeTypeModalOpen(true); // Open the modal
  };

  const handleSelectNodeType = useCallback(
    (selectedType: string) => {
      if (!nodeToAddInfo) {
        console.error("Node to add info is missing when selecting type.");
        return;
      }

      // Call the actual addNode function with stored info and selected type
      crudActions.addNode(
        nodeToAddInfo.parentId,
        `New ${selectedType}`, // Default content based on type
        selectedType, // Pass the selected type
        nodeToAddInfo.position, // Pass position if available (for root nodes)
        // Add default metadata/style based on type if needed here within addNode itself
      );

      setIsNodeTypeModalOpen(false); // Close modal
      setNodeToAddInfo(null); // Clear temporary info
    },
    [nodeToAddInfo, crudActions], // Add crudActions dependency
  );

  // Effect to clear search highlight when nodes change
  useEffect(() => {
    // Check if any node has isSearchResult true
    const hasHighlight = nodes.some((n) => n.data?.isSearchResult);
    if (hasHighlight) {
      // Only add history if there was a change to the highlight status
      // This might be tricky to manage perfectly with debouncing history
      // For simplicity, search will just update the nodes state and history
      // will capture it. Clearing might require a separate action or timeout.
      // Optional: Auto-clear highlight after a delay?
      // const timer = setTimeout(() => {
      //     setNodes(nds => nds.map(n => n.data?.isSearchResult ? { ...n, data: { ...n.data, isSearchResult: false } } : n));
      //     // Don't add history state for clearing highlight, it's transient UI
      // }, 10000); // Clear after 10 seconds
      // return () => clearTimeout(timer);
    }
  }, [nodes, setNodes]); // Depend on nodes

  // --- Render Logic ---
  if (isDataLoading && !mindMap) {
    return (
      <div className="flex min-h-full items-center justify-center text-zinc-400">
        Loading mind map...
      </div>
    );
  }

  if (dataError && !mindMap) {
    return (
      <div className="flex min-h-full items-center justify-center text-rose-400">
        Error: {dataError}
      </div>
    );
  }

  if (!mindMap) {
    // Should not happen if dataError is checked, but defensive
    return (
      <div className="flex min-h-full items-center justify-center text-zinc-400">
        Mind map not found or invalid ID.
      </div>
    );
  }

  return (
    // Full viewport div for the map canvas
    <div className="relative w-full h-full overflow-hidden bg-zinc-900 rounded-md">
      {/* Added Tailwind background */}
      <MindMapToolbar
        mindMapTitle={mindMap.title}
        aiPrompt={aiPrompt}
        setAiPrompt={aiActions.setAiPrompt} // Use setter from aiActions
        aiSearchQuery={aiSearchQuery}
        setAiSearchQuery={aiActions.setAiSearchQuery} // Use setter from aiActions
        onGenerateMap={aiActions.generateMap}
        onAiSearch={aiActions.searchNodes}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={canUndo}
        canRedo={canRedo}
        isLoading={isBusy}
        aiLoadingStates={aiLoadingStates} // Pass the specific type
      />
      {/* Context Menu */}
      <ContextMenuDisplay
        contextMenuState={contextMenuState}
        closeContextMenu={contextMenuHandlers.close}
        nodes={nodes} // Pass current nodes for context (e.g., check if node has content)
        edges={edges}
        addNode={openNodeTypeModal} // Use the wrapper function
        deleteNode={crudActions.deleteNode}
        aiActions={{
          summarizeNode: aiActions.summarizeNode,
          summarizeBranch: aiActions.summarizeBranch,
          extractConcepts: aiActions.extractConcepts,
          openContentModal: (nodeId: string) => {
            aiActions.setAiContentTargetNodeId(nodeId); // Set target node ID
            setIsAiContentModalOpen(true); // Open the modal
          },
          suggestConnections: aiActions.suggestConnections,
          suggestMerges: aiActions.suggestMerges,
        }}
        saveEdgeStyle={crudActions.saveEdgeStyle}
        aiLoadingStates={aiLoadingStates} // Pass the specific type
        applyLayout={applyLayout}
        isLoading={isBusy} // Pass overall busy state
      />
      {/* Notifications */}
      <NotificationsDisplay notification={notification} />
      {/* AI Content Generation Modal */}
      <AiContentPromptModal
        isOpen={isAiContentModalOpen}
        onClose={() => setIsAiContentModalOpen(false)} // Close modal
        onGenerate={(prompt) => {
          if (aiContentTargetNodeId) {
            aiActions.generateContent(aiContentTargetNodeId, prompt); // Trigger generation
          }
          setIsAiContentModalOpen(false); // Close modal after triggering
          setAiContentTargetNodeId(null); // Clear target node ID
        }}
        isLoading={aiLoadingStates.isGeneratingContent} // Pass specific loading state
      />
      {/* Merge Suggestions Modal */}
      <MergeSuggestionsModal
        isOpen={isMergeModalOpen}
        onClose={() => setIsMergeModalOpen(false)} // Close modal
        suggestions={mergeSuggestions}
        onAccept={aiActions.acceptMerge}
        onDismiss={aiActions.dismissMerge}
        nodes={nodes} // Pass nodes to display content snippets
        // isLoading prop removed as it's not defined in MergeSuggestionsModalProps
        // You might want to add a loading state specifically for the modal actions if needed
      />
      {/* Select Node Type Modal */}
      <SelectNodeTypeModal
        isOpen={isNodeTypeModalOpen}
        onClose={() => {
          setIsNodeTypeModalOpen(false);
          setNodeToAddInfo(null); // Clear info if modal is closed without selection
        }}
        onSelectType={handleSelectNodeType} // Pass handler
      />
      {/* React Flow Canvas */}
      {/* Height needs to account for the toolbar height (60px) */}
      <div
        style={{
          width: "100%",
          height: "calc(100% - 60px)",
          marginTop: "60px",
        }}
      >
        <ReactFlow
          nodes={nodes} // Use current nodes state
          edges={allEdges} // Use combined edges (state + suggestions)
          onNodesChange={handleNodesChange} // Use wrapped handler
          onEdgesChange={handleEdgesChange} // Use wrapped handler
          onConnect={handleConnectWrapper} // Use wrapped handler
          onNodeContextMenu={handleNodeContextMenu} // Use wrapped handler
          onPaneContextMenu={handlePaneContextMenu} // Use wrapped handler
          onEdgeContextMenu={handleEdgeContextMenu}
          onPaneClick={contextMenuHandlers.onPaneClick} // Use handler from hook
          nodeTypes={nodeTypes} // Pass defined NodeTypes
          edgeTypes={edgeTypes} // Pass defined EdgeTypes
          snapToGrid={true} // Enable grid snapping
          fitView
          colorMode="dark"
          // Enable drag selection (default behavior often requires Shift key)
          selectionMode={SelectionMode.Partial} // Enables selecting nodes by dragging a rectangle
          selectNodesOnDrag={true} // Allows selecting nodes by dragging over them
          selectionOnDrag={true} // Enables the drag selection rectangle
          // Other props like defaultViewport, minZoom, maxZoom can be added here
        >
          {/* <MiniMap /> */}
          <Controls /> {/* <-- Uncomment or Add Controls */}
          {/* Background color should ideally be managed by the main container */}
          <Background color="#ccc" gap={16} />
          {/* Example dynamic background */}
        </ReactFlow>
      </div>
    </div>
  );
}

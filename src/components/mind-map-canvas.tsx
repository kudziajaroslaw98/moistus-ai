"use client";

import {
  Background,
  BackgroundVariant,
  Connection,
  Controls,
  Edge,
  EdgeMouseHandler,
  EdgeTypes, // Keep this
  Node,
  NodeTypes,
  OnEdgesChange,
  OnNodesChange,
  ReactFlow,
  ReactFlowInstance,
  SelectionMode,
  useReactFlow,
  useStore,
  XYPosition,
} from "@xyflow/react";
import { useParams } from "next/navigation";
import React, {
  MouseEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"; // Import React

// --- Hooks ---
import { useAiFeatures } from "@/hooks/use-ai-features";
import { useContextMenu } from "@/hooks/use-context-meny";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { useLayout } from "@/hooks/use-layout";
import { useMindMapCRUD } from "@/hooks/use-mind-map-crud";
import { useMindMapData } from "@/hooks/use-mind-map-data";
import { useMindMapHistory } from "@/hooks/use-mind-map-history";
import { useMindMapState } from "@/hooks/use-mind-map-state";
import { useNotifications } from "@/hooks/use-notifications";

// --- UI Components ---
import AiContentPromptModal from "@/components/modals/ai-content-prompt-modal";
import { ContextMenuDisplay } from "./context-menu-display";
import MergeSuggestionsModal from "./merge-suggestions-modal";
import { MindMapToolbar } from "./mind-map-toolbar/mind-map-toolbar";
import { NotificationsDisplay } from "./notifications-display";
import SelectNodeTypeModal from "./select-node-type-modal";
// Import custom node components directly here
import DefaultNode from "@/components/nodes/default-node"; // Import DefaultNode
import ImageNode from "@/components/nodes/image-node";
import QuestionNode from "@/components/nodes/question-node";
import ResourceNode from "@/components/nodes/resource-node";
import TaskNode from "@/components/nodes/task-node";
// Import the new node edit modal
import EdgeEditModal from "./modals/edge-edit-modal"; // Import EdgeEditModal
import NodeEditModal from "./modals/node-edit-modal";

// --- Constants and Types ---
import useOutsideAlerter from "@/hooks/use-click-outside";
import { AppEdge } from "@/types/app-edge"; // Ensure AppEdge is used
import { EdgeData } from "@/types/edge-data";
import { NodeData } from "@/types/node-data";
import { Minimize2 } from "lucide-react";
import DefaultEdge from "./edges/default-edge";
import EditableEdge from "./edges/editable-edge";
import SuggestedConnectionEdge from "./edges/suggested-connection-edge";
import AnnotationNode from "./nodes/annotation-node";

export function MindMapCanvas() {
  const params = useParams();
  const mapId = params.id as string;
  const reactFlowInstance = useReactFlow();
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [copiedNodes, setCopiedNodes] = useState<Node<NodeData>[]>([]);

  // --- Modals State ---
  const [isNodeTypeModalOpen, setIsNodeTypeModalOpen] = useState(false);
  const [nodeToAddInfo, setNodeToAddInfo] = useState<{
    parentId: string | null;
    position?: XYPosition;
  } | null>(null);

  // State for the Node Edit Modal
  const [isNodeEditModalOpen, setIsNodeEditModalOpen] = useState(false);
  const [nodeToEdit, setNodeToEdit] = useState<Node<NodeData> | null>(null);

  // State for the Edge Edit Modal
  const [isEdgeEditModalOpen, setIsEdgeEditModalOpen] = useState(false);
  const [edgeToEdit, setEdgeToEdit] = useState<AppEdge | null>(null);

  const nodesDraggable = useStore((s) => s.nodesDraggable);
  const nodesConnectable = useStore((s) => s.nodesConnectable);
  const elementsSelectable = useStore((s) => s.elementsSelectable);

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
    onNodesChange: onNodesChangeState, // Renamed to avoid conflict
    edges,
    setEdges,
    onEdgesChange: onEdgesChangeState, // Renamed to avoid conflict
  } = useMindMapState(initialNodes, initialEdges);

  // --- History ---
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

  // --- CRUD Operations ---
  const { crudActions, isLoading: isCrudLoading } = useMindMapCRUD({
    mapId,
    nodes,
    edges,
    setNodes,
    setEdges,
    addStateToHistory,
    showNotification,
  });

  // --- AI Features ---
  const {
    aiActions,
    aiLoadingStates,
    suggestedEdges,
    mergeSuggestions,
    isAiContentModalOpen,
    setIsAiContentModalOpen,
    aiContentTargetNodeId,
    setAiContentTargetNodeId,
    isMergeModalOpen,
    setIsMergeModalOpen,
    aiPrompt,
    aiSearchQuery,
    setAiPrompt, // Use setters from hook
    setAiSearchQuery, // Use setters from hook
  } = useAiFeatures({
    mapId,
    nodes,
    addNode: crudActions.addNode,
    deleteNode: crudActions.deleteNode,
    saveEdge: crudActions.addEdge, // saveEdge now uses addEdge CRUD
    saveNodeContent: crudActions.saveNodeContent, // Still used for quick edits? Or remove? Let's keep for now.
    setNodes,
    setEdges,
    addStateToHistory,
    showNotification,
    currentHistoryState, // Used for history state check within AI hook
  });

  // --- UI Interaction Hooks ---
  // Context Menu
  const { contextMenuState, contextMenuHandlers } = useContextMenu();

  // Layout
  const { applyLayout, isLoading: isLayoutLoading } = useLayout({
    nodes,
    edges,
    setNodes,
    reactFlowInstance: reactFlowInstance,
    addStateToHistory,
    showNotification,
    currentHistoryState,
    saveNodePosition: crudActions.saveNodePosition, // Pass saveNodePosition from CRUD
  });

  // --- Combined Edges for Display ---
  const allEdges = useMemo(
    () => [...edges, ...suggestedEdges],
    [edges, suggestedEdges],
  );

  // --- Loading State ---
  const isBusy =
    isDataLoading ||
    isCrudLoading ||
    isLayoutLoading ||
    Object.values(aiLoadingStates).some((loading) => loading);

  // --- Focus Mode Handlers ---
  const enterFocusMode = useCallback(() => {
    setIsFocusMode(true);
    // Optional: Add notification
    // showNotification("Entered Focus Mode.", "success", 2000);
  }, []);

  const exitFocusMode = useCallback(() => {
    setIsFocusMode(false);
    // Optional: Add notification
    // showNotification("Exited Focus Mode.", "success", 2000);
  }, []);

  // --- Node Type Selection Modal Logic ---
  const openNodeTypeModal = (
    parentId: string | null,
    position?: XYPosition,
  ) => {
    setNodeToAddInfo({ parentId, position });
    setIsNodeTypeModalOpen(true);
  };

  const handleSelectNodeType = useCallback(
    (selectedType: string) => {
      if (!nodeToAddInfo) {
        console.error("Node to add info is missing when selecting type.");
        showNotification("Error adding node.", "error");
        return;
      }

      // Use the addNode CRUD action to create the node with the selected type
      // The addNode action handles local state update, DB save, and history
      crudActions.addNode(
        nodeToAddInfo.parentId,
        `New ${selectedType}`, // Initial content
        selectedType, // Node type
        nodeToAddInfo.position, // Position
        // Pass initialData if needed: { metadata: { initialProp: value } }
      );

      setIsNodeTypeModalOpen(false);
      setNodeToAddInfo(null); // Clear info after selecting type
    },
    [nodeToAddInfo, crudActions, showNotification],
  );

  // --- Node Edit Modal Logic ---
  const handleOpenNodeEditModal = useCallback(
    (nodeId: string) => {
      // Simplified prop to just accept nodeId
      const node = nodes.find((n) => n.id === nodeId);
      if (node) {
        setNodeToEdit(node); // Set the actual node object
        setIsNodeEditModalOpen(true);
      } else {
        console.error("Node not found for editing:", nodeId);
        showNotification("Error: Node not found for editing.", "error");
      }
    },
    [nodes, showNotification],
  );

  const handleSaveNodeEdit = useCallback(
    async (nodeId: string, changes: Partial<NodeData>) => {
      // This function is called from the NodeEditModal when saving
      // It needs to save all changes (content, styles, metadata, etc.)
      // Use the comprehensive saveNodeProperties CRUD action
      await crudActions.saveNodeProperties(nodeId, changes);

      // The saveNodeProperties action updates the local state, DB, and history.
      // Modal remains open until explicitly closed by the user or parent logic.
      // showNotification is handled inside saveNodeProperties.
    },
    [crudActions],
  );

  const handleCloseNodeEditModal = useCallback(() => {
    setIsNodeEditModalOpen(false);
    setNodeToEdit(null); // Clear the node being edited
  }, []);

  // --- Edge Edit Modal Logic ---
  const handleOpenEdgeEditModal = useCallback(
    (edgeId: string) => {
      const edge = edges.find((e) => e.id === edgeId);
      if (edge) {
        setEdgeToEdit(edge);
        setIsEdgeEditModalOpen(true);
      } else {
        console.error("Edge not found for editing:", edgeId);
        showNotification("Error: Edge not found for editing.", "error");
      }
    },
    [edges, showNotification], // Depend on edges
  );

  const handleSaveEdgeEdit = useCallback(
    async (edgeId: string, changes: Partial<EdgeData>) => {
      // Use the saveEdgeProperties CRUD action
      await crudActions.saveEdgeProperties(edgeId, changes);
      // The saveEdgeProperties action updates local state, DB, history.
      // Modal remains open until explicitly closed.
    },
    [crudActions],
  );

  const handleCloseEdgeEditModal = useCallback(() => {
    setIsEdgeEditModalOpen(false);
    setEdgeToEdit(null); // Clear the edge being edited
  }, []);

  // --- Event Handlers passed to ReactFlow ---

  // Handle changes from React Flow (dragging, selecting, dimensions)
  // Pass current nodes state to handleNodeChanges
  const handleNodesChange: OnNodesChange = useCallback(
    (changes) => {
      onNodesChangeState(changes);
      crudActions.handleNodeChanges(changes, nodes); // Pass current nodes
      // History is added *after* React Flow updates state and CRUD starts saving (debounced)
      // History is handled within useMindMapHistory's effect monitoring nodes/edges
    },
    [onNodesChangeState, crudActions, nodes], // Added nodes dependency
  );

  // Handle edge changes from React Flow (currently only deletion)
  // Pass current edges and nodes state to handleEdgeChanges
  const handleEdgesChange: OnEdgesChange = useCallback(
    (changes) => {
      onEdgesChangeState(changes);
      crudActions.handleEdgeChanges(changes, edges, nodes); // Pass edges and nodes
      // History is added within useMindMapHistory's effect monitoring nodes/edges
    },
    [onEdgesChangeState, crudActions, edges, nodes], // Added edges and nodes dependencies
  );

  // Handle new connections drawn by the user
  // Pass connection params to addEdge CRUD action
  const handleConnectWrapper = useCallback(
    (params: Connection) => {
      // Changed from Connection | Edge to just Connection
      if (params.source && params.target) {
        // Add the new edge to DB and local state via CRUD action
        // Pass any default data if needed, otherwise addEdge will use its defaults
        crudActions.addEdge(params.source, params.target);
        // History is added inside addEdge after successful save and state update
      }
      // React Flow's onConnect expects to return the new edge object if handling locally.
      // Since CRUD handles state updates, we don't return the edge here.
      // React Flow state is updated by the setEdges call within crudActions.addEdge.
    },
    [crudActions], // Added crudActions dependency
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
    (event: MouseEvent) => {
      contextMenuHandlers.onPaneContextMenu(event);
    },
    [contextMenuHandlers],
  );

  const handleCopy = useCallback(() => {
    // Use getNodes() from the instance instead of the store directly
    const currentNodes = reactFlowInstance.getNodes();
    const selectedNodes = currentNodes.filter((node) => node.selected);

    if (selectedNodes.length > 0) {
      // Deep clone the nodes to avoid issues with direct state mutation later
      const nodesToCopy = selectedNodes.map((node) => ({
        ...node,
        data: { ...node.data }, // Ensure data is also cloned
        selected: false, // Copied nodes shouldn't be selected initially
      }));
      setCopiedNodes(nodesToCopy);
      showNotification(
        `Copied ${selectedNodes.length} node${selectedNodes.length > 1 ? "s" : ""}.`,
        "success",
      );
    } else {
      setCopiedNodes([]); // Clear clipboard if nothing selected
      // Optionally show a notification that nothing was copied
      // showNotification("Select nodes to copy.", "error");
    }
    // Depend on the instance and showNotification
  }, [reactFlowInstance, showNotification]);

  const handlePaste = useCallback(async () => {
    if (copiedNodes.length === 0 || !reactFlowInstance) {
      showNotification("Nothing to paste.", "error");
      return;
    }

    showNotification("Pasting nodes...", "success");

    // Get current selection using getNodes()
    const currentNodes = reactFlowInstance.getNodes();
    const selectedNodes = currentNodes.filter((node) => node.selected);

    // Determine parent: Use the first selected node if exactly one is selected
    const targetParentId =
      selectedNodes.length === 1 ? selectedNodes[0].id : null;

    // Calculate paste position (e.g., center of viewport + offset)
    // const viewport = reactFlowInstance.getViewport(); // viewport not strictly needed here
    const pasteCenter = reactFlowInstance.screenToFlowPosition({
      x: window.innerWidth / 2,
      y: window.innerHeight / 2 - 30, // Adjust for toolbar height perhaps
    });

    const pastedNodeIds: string[] = [];

    try {
      const createdNodes = await Promise.all(
        copiedNodes.map(async (copiedNode, index) => {
          const newPosition: XYPosition = {
            // Use a slightly larger offset for better visibility
            x: pasteCenter.x + index * 30 + Math.random() * 10 - 5,
            y: pasteCenter.y + index * 30 + Math.random() * 10 - 5,
          };

          // Clone the data to avoid modifying the clipboard state directly
          const clonedData = { ...copiedNode.data };

          // Prepare initial data, excluding fields set by addNode or that shouldn't be copied
          const initialDataForNewNode: Partial<NodeData> = {
            ...clonedData,
            content: (clonedData.content || "") + " (Copy)", // Ensure content exists before appending
            // Exclude specific fields
            id: undefined,
            parent_id: undefined,
            position_x: undefined,
            position_y: undefined,
            embedding: undefined, // Don't copy embeddings
            aiSummary: undefined, // Don't copy AI generated data
            extractedConcepts: undefined,
            isSearchResult: undefined, // Don't copy search result flag
          };

          const newNode = await crudActions.addNode(
            targetParentId,
            initialDataForNewNode.content, // Pass specific content
            copiedNode.type || "defaultNode",
            newPosition,
            initialDataForNewNode, // Pass the rest of the relevant data
          );

          if (newNode) {
            pastedNodeIds.push(newNode.id);
          }
          return newNode;
        }),
      );

      const successfulNodes = createdNodes.filter(
        (node) => node !== null,
      ) as Node<NodeData>[];

      if (successfulNodes.length > 0) {
        addStateToHistory("pasteNodes");

        // Select the newly pasted nodes using setNodes
        setNodes((nds) =>
          nds.map((n) => ({
            ...n,
            // Deselect previously selected nodes unless they were just pasted
            selected: pastedNodeIds.includes(n.id),
          })),
        );
        setEdges((eds) => eds.map((e) => ({ ...e, selected: false }))); // Deselect edges

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

    // Update dependencies
  }, [
    copiedNodes,
    reactFlowInstance,
    crudActions,
    showNotification,
    setNodes, // Added setNodes dependency
    setEdges, // Added setEdges dependency
    addStateToHistory,
  ]);

  const handleEdgeContextMenu = useCallback<EdgeMouseHandler<Edge<EdgeData>>>(
    (event, edge) => {
      contextMenuHandlers.onEdgeContextMenu(event, edge as AppEdge); // Cast to AppEdge if necessary
    },
    [contextMenuHandlers],
  );

  // Handle Edge Click to open Edit Modal
  const onReactFlowEdgeClick = useCallback(
    // Renamed for clarity
    (event: React.MouseEvent, edge: Edge<EdgeData>) => {
      // Correct signature
      // We receive the standard React Flow Edge object here
      // Prevent default selection/drag behavior (React Flow might already handle this)
      // event.stopPropagation(); // Can add if needed, but often React Flow manages

      console.log("React Flow Edge Clicked:", edge);
      handleOpenEdgeEditModal(edge.id); // Use the edge ID from the React Flow object
    },
    [handleOpenEdgeEditModal], // Depends on handleOpenEdgeEditModal
  );

  // Effect to clear search highlight when nodes change (optional cleanup)
  useEffect(() => {
    // This effect is complex to manage history around and might be removed
    // or simplified depending on desired UX for search highlight persistence.
    // Keeping the existing logic for now.
    const hasHighlight = nodes.some((n) => n.data?.isSearchResult);
    if (hasHighlight) {
      // Clear highlight after a delay
      const timer = setTimeout(() => {
        setNodes((nds) =>
          nds.map((n) =>
            n.data?.isSearchResult
              ? { ...n, data: { ...n.data, isSearchResult: false } }
              : n,
          ),
        );
        // Note: This local state change for clearing highlight is NOT added to history
      }, 10000); // Clear after 10 seconds
      return () => clearTimeout(timer);
    }
  }, [nodes, setNodes]); // Depend on nodes

  // --- Define nodeTypes object using useMemo to pass custom props ---
  const nodeTypesWithProps: NodeTypes = useMemo(
    () => ({
      defaultNode: (
        nodeProps, // Add the new default node
      ) => <DefaultNode {...nodeProps} onEditNode={handleOpenNodeEditModal} />,
      questionNode: (nodeProps) => (
        <QuestionNode {...nodeProps} onEditNode={handleOpenNodeEditModal} />
      ),
      taskNode: (nodeProps) => (
        <TaskNode {...nodeProps} onEditNode={handleOpenNodeEditModal} />
      ),
      imageNode: (nodeProps) => (
        <ImageNode {...nodeProps} onEditNode={handleOpenNodeEditModal} />
      ),
      resourceNode: (nodeProps) => (
        <ResourceNode {...nodeProps} onEditNode={handleOpenNodeEditModal} />
      ),
      // Add other custom node types here, passing onEditNode
      annotationNode: (nodeProps) => (
        <AnnotationNode {...nodeProps} onEditNode={handleOpenNodeEditModal} />
      ),
    }),
    [handleOpenNodeEditModal], // Recreate if handleOpenNodeEditModal changes
  );

  // --- Define edgeTypes object using useMemo to pass custom props ---
  const edgeTypesWithProps: EdgeTypes = useMemo(
    () => ({
      suggestedConnection: (edgeProps) => (
        <SuggestedConnectionEdge {...edgeProps} />
      ),
      editableEdge: (edgeProps) => <EditableEdge {...edgeProps} />,
      defaultEdge: (edgeProps) => <DefaultEdge {...edgeProps} />,
    }),
    [onReactFlowEdgeClick, showNotification], // Recreate if handleEdgeClick or showNotification changes
  );

  // --- Determine selected Element IDs for Keyboard Shortcuts ---
  // Use the selected property on the React Flow element directly
  const selectedNodeId = useMemo(
    () => nodes.find((n) => n.selected)?.id,
    [nodes],
  );
  const selectedEdgeId = useMemo(
    () => edges.find((e) => e.selected)?.id,
    [edges],
  );

  // --- Keyboard Shortcuts ---
  useKeyboardShortcuts({
    onUndo: handleUndo,
    onRedo: handleRedo,
    // Pass deleteNode from CRUD actions
    onDelete: (id) => {
      // Determine if it's a node or edge based on context or selection state
      // In this setup, selectedNodeId and selectedEdgeId indicate which is selected
      if (selectedNodeId === id) {
        crudActions.deleteNode(id);
      } else if (selectedEdgeId === id) {
        // Need a deleteEdge action in crudActions
        crudActions.deleteEdge(id); // Call the new deleteEdge CRUD action
      } else {
        console.warn("Attempted to delete unknown element with ID:", id);
      }
    },
    onCopy: handleCopy,
    onPaste: handlePaste,
    onAddChild: openNodeTypeModal, // Use the wrapper function
    selectedNodeId: selectedNodeId,
    selectedEdgeId: selectedEdgeId, // Pass selectedEdgeId
    canUndo,
    canRedo,
    isBusy,
    reactFlowInstance: reactFlowInstance as unknown as ReactFlowInstance,
  });

  const ref = useRef<HTMLDivElement>(null);
  useOutsideAlerter(ref, () => {
    contextMenuHandlers.close();
  });

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
    // This case might occur if mapId is undefined or map data is genuinely not found
    if (!mapId) {
      return (
        <div className="flex min-h-full items-center justify-center text-zinc-400">
          Invalid map ID provided.
        </div>
      );
    }
    return (
      <div className="flex min-h-full items-center justify-center text-zinc-400">
        Mind map not found.
      </div>
    );
  }

  const canvasHeight = isFocusMode ? "100%" : "calc(100% - 60px)"; // Adjust 60px if toolbar height differs
  const canvasMarginTop = isFocusMode ? "0px" : "60px"; // Adjust 60px if toolbar height differs

  return (
    <div className="relative h-full w-full overflow-hidden rounded-md bg-zinc-900">
      {isFocusMode ? (
        <div className="absolute top-3 right-3 z-20">
          <button
            onClick={exitFocusMode}
            className="flex items-center justify-center rounded-sm bg-zinc-700 p-2 text-zinc-200 shadow-md transition-colors hover:bg-zinc-600 focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-zinc-900 focus:outline-none"
            title="Exit Focus Mode"
            aria-label="Exit Focus Mode"
          >
            <Minimize2 className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <MindMapToolbar
          mindMapTitle={mindMap.title}
          aiPrompt={aiPrompt}
          setAiPrompt={setAiPrompt}
          aiSearchQuery={aiSearchQuery}
          setAiSearchQuery={setAiSearchQuery}
          onGenerateMap={aiActions.generateMap}
          onAiSearch={aiActions.searchNodes}
          onUndo={handleUndo}
          onRedo={handleRedo}
          canUndo={canUndo}
          canRedo={canRedo}
          isLoading={isBusy}
          aiLoadingStates={aiLoadingStates}
          onEnterFocusMode={enterFocusMode} // Pass the handler
        />
      )}
      {/* Context Menu */}
      <ContextMenuDisplay
        ref={ref}
        contextMenuState={contextMenuState}
        closeContextMenu={contextMenuHandlers.close}
        nodes={nodes}
        edges={edges} // Pass current edges
        addNode={openNodeTypeModal} // Use the wrapper function
        deleteNode={crudActions.deleteNode} // Use CRUD delete
        deleteEdge={crudActions.deleteEdge}
        aiActions={{
          summarizeNode: aiActions.summarizeNode,
          summarizeBranch: aiActions.summarizeBranch,
          extractConcepts: aiActions.extractConcepts,
          openContentModal: (nodeId: string) => {
            aiActions.setAiContentTargetNodeId(nodeId);
            setIsAiContentModalOpen(true);
          },
          suggestConnections: aiActions.suggestConnections,
          suggestMerges: aiActions.suggestMerges,
        }}
        saveEdgeStyle={crudActions.saveEdgeProperties} // Context menu edge style save now uses saveEdgeProperties
        aiLoadingStates={aiLoadingStates}
        applyLayout={applyLayout}
        reactFlowInstance={reactFlowInstance}
        isLoading={isBusy}
      />
      {/* Notifications */}
      <NotificationsDisplay notification={notification} />
      {/* AI Content Generation Modal */}
      <AiContentPromptModal
        isOpen={isAiContentModalOpen}
        onClose={() => {
          setIsAiContentModalOpen(false);
          setAiContentTargetNodeId(null); // Clear target node ID on close
        }}
        onGenerate={(prompt) => {
          if (aiContentTargetNodeId) {
            aiActions.generateContent(aiContentTargetNodeId, prompt);
          }
          // Modal is now closed by the onClose handler above
        }}
        isLoading={aiLoadingStates.isGeneratingContent}
      />
      {/* Merge Suggestions Modal */}
      <MergeSuggestionsModal
        isOpen={isMergeModalOpen}
        onClose={() => setIsMergeModalOpen(false)}
        suggestions={mergeSuggestions}
        onAccept={aiActions.acceptMerge}
        onDismiss={aiActions.dismissMerge}
        nodes={nodes}
        isLoading={aiLoadingStates.isAcceptingMerge} // Pass specific loading state
      />
      {/* Select Node Type Modal */}
      <SelectNodeTypeModal
        isOpen={isNodeTypeModalOpen}
        onClose={() => {
          setIsNodeTypeModalOpen(false);
          setNodeToAddInfo(null);
        }}
        onSelectType={handleSelectNodeType}
      />
      {/* Generic Node Edit Modal */}
      <NodeEditModal
        isOpen={isNodeEditModalOpen}
        onClose={handleCloseNodeEditModal}
        node={nodeToEdit} // Pass the node object
        onSave={handleSaveNodeEdit} // Pass the save handler
        isLoading={isCrudLoading} // Use CRUD loading state for saving
      />
      {/* Generic Edge Edit Modal */}
      <EdgeEditModal
        isOpen={isEdgeEditModalOpen}
        onClose={handleCloseEdgeEditModal}
        edge={edgeToEdit} // Pass the edge object
        onSave={handleSaveEdgeEdit} // Pass the save handler
        isLoading={isCrudLoading} // Use CRUD loading state for saving
        nodes={nodes} // Pass nodes for displaying node content in edge modal
      />

      <div
        style={{
          width: "100%",
          height: canvasHeight,
          marginTop: canvasMarginTop,
          transition: "height 0.2s ease-in-out, margin-top 0.2s ease-in-out",
        }}
        className="relative"
      >
        <ReactFlow
          nodes={nodes}
          edges={allEdges} // Render combined edges
          onNodesChange={handleNodesChange}
          onEdgesChange={handleEdgesChange}
          onConnect={handleConnectWrapper} // Use wrapped connect handler
          onNodeContextMenu={handleNodeContextMenu}
          onPaneContextMenu={handlePaneContextMenu}
          onEdgeContextMenu={handleEdgeContextMenu} // Use wrapped edge context menu
          onEdgeDoubleClick={onReactFlowEdgeClick}
          onPaneClick={contextMenuHandlers.close}
          nodeTypes={nodeTypesWithProps} // Use the memoized object with props
          edgeTypes={edgeTypesWithProps} // Use the memoized object with props
          snapToGrid={true}
          reconnectRadius={100}
          edgesReconnectable={true}
          nodesDraggable={nodesDraggable}
          nodesConnectable={nodesConnectable}
          elementsSelectable={elementsSelectable}
          fitView
          colorMode="dark"
          multiSelectionKeyCode={["Meta", "Control"]}
          selectionMode={SelectionMode.Partial}
          selectNodesOnDrag={true}
          selectionOnDrag={true}
        >
          <Controls />
          <Background
            color="#52525c"
            gap={16}
            variant={BackgroundVariant.Dots}
          />
        </ReactFlow>
      </div>
    </div>
  );
}

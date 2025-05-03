"use client";

import {
  Background,
  BackgroundVariant,
  Connection,
  Controls,
  Edge,
  EdgeMouseHandler,
  EdgeTypes,
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
  Dispatch,
  SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useAiFeatures } from "@/hooks/use-ai-features";
import { useContextMenu } from "@/hooks/use-context-meny";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { useLayout } from "@/hooks/use-layout";
import { useMindMapCRUD } from "@/hooks/use-mind-map-crud";
import { useMindMapData } from "@/hooks/use-mind-map-data";
import { useMindMapHistory } from "@/hooks/use-mind-map-history";
import { useMindMapState } from "@/hooks/use-mind-map-state";
import { useNotifications } from "@/hooks/use-notifications";

import AiContentPromptModal from "@/components/modals/ai-content-prompt-modal";
import { ContextMenuDisplay } from "./context-menu-display";
import MergeSuggestionsModal from "./merge-suggestions-modal";
import { MindMapToolbar } from "./mind-map-toolbar/mind-map-toolbar";
import SelectNodeTypeModal from "./modals/select-node-type-modal";
import { NotificationsDisplay } from "./notifications-display";

import DefaultNode from "@/components/nodes/default-node";
import ImageNode from "@/components/nodes/image-node";
import QuestionNode from "@/components/nodes/question-node";
import ResourceNode from "@/components/nodes/resource-node";
import TaskNode from "@/components/nodes/task-node";

import EdgeEditModal from "./modals/edge-edit-modal";
import NodeEditModal from "./modals/node-edit-modal";

import useOutsideAlerter from "@/hooks/use-click-outside";
import { AppEdge } from "@/types/app-edge";
import { EdgeData } from "@/types/edge-data";
import { NodeData } from "@/types/node-data";
import { Minimize2 } from "lucide-react";
import { CommandPalette } from "./command-palette";
import DefaultEdge from "./edges/default-edge";
import EditableEdge from "./edges/editable-edge";
import SuggestedConnectionEdge from "./edges/suggested-connection-edge";
import AnnotationNode from "./nodes/annotation-node";
import CodeNode from "./nodes/code-node";
import GroupNode from "./nodes/group-node";

export function MindMapCanvas() {
  const params = useParams();
  const mapId = params.id as string;
  const reactFlowInstance = useReactFlow();
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

  const nodesDraggable = useStore((s) => s.nodesDraggable);
  const nodesConnectable = useStore((s) => s.nodesConnectable);
  const elementsSelectable = useStore((s) => s.elementsSelectable);

  const toggleFocusMode = useCallback(() => {
    setIsFocusMode((prev) => !prev);
  }, [isFocusMode, setIsFocusMode]);

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
    onNodesChange: onNodesChangeState,
    edges,
    setEdges,
    onEdgesChange: onEdgesChangeState,
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
    addNode: crudActions.addNode,
    deleteNode: crudActions.deleteNode,
    saveEdge: crudActions.addEdge,
    saveNodeContent: crudActions.saveNodeContent,
    setNodes,
    setEdges: setEdges as Dispatch<SetStateAction<Edge<EdgeData>[]>>,
    addStateToHistory,
    showNotification,
    currentHistoryState,
  });

  const { contextMenuState, contextMenuHandlers } = useContextMenu();

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

  const allEdges = useMemo(
    () => [...edges, ...suggestedEdges],
    [edges, suggestedEdges],
  );

  const isBusy =
    isDataLoading ||
    isCrudLoading ||
    isLayoutLoading ||
    Object.values(aiLoadingStates).some((loading) => loading);

  const enterFocusMode = useCallback(() => {
    setIsFocusMode(true);
  }, []);

  const exitFocusMode = useCallback(() => {
    setIsFocusMode(false);
  }, []);

  const openNodeTypeModal = useCallback(
    (parentId: string | null, position?: XYPosition) => {
      setNodeToAddInfo({ parentId, position });
      setIsNodeTypeModalOpen(true);
    },
    [setNodeToAddInfo],
  );

  const handleSelectNodeType = useCallback(
    (selectedType: string) => {
      if (!nodeToAddInfo) {
        console.error("Node to add info is missing when selecting type.");
        showNotification("Error adding node.", "error");
        return;
      }

      crudActions.addNode(
        nodeToAddInfo.parentId,
        `New ${selectedType}`,
        selectedType,
        nodeToAddInfo.position,
      );

      setIsNodeTypeModalOpen(false);
      setNodeToAddInfo(null);
    },
    [nodeToAddInfo, crudActions, showNotification],
  );

  const handleOpenNodeEditModal = useCallback(
    (nodeId: string) => {
      const node = nodes.find((n) => n.id === nodeId);

      if (node) {
        setNodeToEdit(node);
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
      await crudActions.saveNodeProperties(nodeId, changes);
    },
    [crudActions],
  );

  const handleCloseNodeEditModal = useCallback(() => {
    setIsNodeEditModalOpen(false);
  }, []);

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
    [edges, showNotification],
  );

  const handleSaveEdgeEdit = useCallback(
    async (edgeId: string, changes: Partial<EdgeData>) => {
      await crudActions.saveEdgeProperties(edgeId, changes);
    },
    [crudActions],
  );

  const handleCloseEdgeEditModal = useCallback(() => {
    setIsEdgeEditModalOpen(false);
  }, []);

  const handleNodesChange: OnNodesChange = useCallback(
    (changes) => {
      onNodesChangeState(changes);
      crudActions.handleNodeChanges(changes, nodes);
    },
    [onNodesChangeState, crudActions, nodes],
  );

  const handleEdgesChange: OnEdgesChange = useCallback(
    (changes) => {
      onEdgesChangeState(changes);
      crudActions.handleEdgeChanges(changes, edges, nodes);
    },
    [onEdgesChangeState, crudActions, edges, nodes],
  );

  const handleConnectWrapper = useCallback(
    (params: Connection) => {
      if (params.source && params.target) {
        crudActions.addEdge(params.source, params.target);
      }
    },
    [crudActions],
  );

  const handleNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: Node<NodeData>) => {
      contextMenuHandlers.onNodeContextMenu(event, node);
    },
    [contextMenuHandlers],
  );

  const handlePaneContextMenu = useCallback(
    (event: MouseEvent | React.MouseEvent<Element, MouseEvent>) => {
      contextMenuHandlers.onPaneContextMenu(event as React.MouseEvent);
    },
    [contextMenuHandlers],
  );

  const handleCopy = useCallback(() => {
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

        setNodes((nds) =>
          nds.map((n) => ({
            ...n,

            selected: pastedNodeIds.includes(n.id),
          })),
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

  const handleEdgeContextMenu = useCallback<
    EdgeMouseHandler<Edge<Partial<EdgeData>>>
  >(
    (event, edge) => {
      contextMenuHandlers.onEdgeContextMenu(event, edge as AppEdge);
    },
    [contextMenuHandlers],
  );

  const onReactFlowEdgeClick = useCallback<
    EdgeMouseHandler<Edge<Partial<EdgeData>>>
  >(
    (event, edge) => {
      console.log("React Flow Edge Clicked:", edge);
      handleOpenEdgeEditModal(edge.id);
    },
    [handleOpenEdgeEditModal],
  );

  useEffect(() => {
    const hasHighlight = nodes.some((n) => n.data?.isSearchResult);

    if (hasHighlight) {
      const timer = setTimeout(() => {
        setNodes((nds) =>
          nds.map((n) =>
            n.data?.isSearchResult
              ? { ...n, data: { ...n.data, isSearchResult: false } }
              : n,
          ),
        );
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [nodes, setNodes]);

  const nodeTypesWithProps: NodeTypes = useMemo(
    () => ({
      defaultNode: (nodeProps) => (
        <DefaultNode {...nodeProps} onEditNode={handleOpenNodeEditModal} />
      ),
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

      annotationNode: (nodeProps) => (
        <AnnotationNode {...nodeProps} onEditNode={handleOpenNodeEditModal} />
      ),
      codeNode: (nodeProps) => (
        <CodeNode {...nodeProps} onEditNode={handleOpenNodeEditModal} />
      ),
      groupNode: (nodeProps) => (
        <GroupNode {...nodeProps} onEditNode={handleOpenNodeEditModal} />
      ),
    }),
    [handleOpenNodeEditModal],
  );

  const edgeTypesWithProps: EdgeTypes = useMemo(
    () => ({
      suggestedConnection: (edgeProps) => (
        <SuggestedConnectionEdge {...edgeProps} />
      ),
      editableEdge: (edgeProps) => <EditableEdge {...edgeProps} />,
      defaultEdge: (edgeProps) => <DefaultEdge {...edgeProps} />,
    }),
    [onReactFlowEdgeClick, showNotification],
  );

  const selectedNodeId = useMemo(
    () => nodes.find((n) => n.selected)?.id,
    [nodes],
  );
  const selectedEdgeId = useMemo(
    () => edges.find((e) => e.selected)?.id,
    [edges],
  );

  const commandPaletteActions = useMemo(
    () => ({
      undo: handleUndo,
      redo: handleRedo,
      addNode: (parentId: string | null = null) => openNodeTypeModal(parentId),
      deleteSelected: () => {
        if (selectedNodeId) crudActions.deleteNode(selectedNodeId);
        else if (selectedEdgeId) crudActions.deleteEdge(selectedEdgeId);
        else showNotification("Nothing selected to delete.", "error");
      },
      triggerSuggestConnections: aiActions.suggestConnections,
      triggerSuggestMerges: aiActions.suggestMerges,
      applyLayoutTB: () => applyLayout("TB"),
      applyLayoutLR: () => applyLayout("LR"),
      aiSearch: aiActions.searchNodes,
      toggleFocusMode: toggleFocusMode,
      groupSelectedNodes: () => {
        const selectedNodes = nodes.filter((n) => n.selected);

        if (selectedNodes.length > 1) {
          crudActions.groupNodes(selectedNodes.map((n) => n.id));
        } else {
          showNotification("Select 2 or more nodes to group.", "error");
        }
      },
    }),
    [
      handleUndo,
      handleRedo,
      openNodeTypeModal,
      selectedNodeId,
      selectedEdgeId,
      crudActions,
      aiActions,
      applyLayout,
      toggleFocusMode,
      nodes,
      showNotification,
    ],
  );

  useKeyboardShortcuts({
    onUndo: handleUndo,
    onRedo: handleRedo,

    onDelete: commandPaletteActions.deleteSelected,
    onAddChild: commandPaletteActions.addNode,
    onCopy: handleCopy,
    onPaste: handlePaste,
    selectedNodeId: selectedNodeId,
    selectedEdgeId: selectedEdgeId,
    canUndo,
    canRedo,
    isBusy,
    reactFlowInstance: reactFlowInstance as unknown as ReactFlowInstance,
  });

  const ref = useRef<HTMLDivElement>(null);
  useOutsideAlerter(ref, () => {
    contextMenuHandlers.close();
  });

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

  const canvasHeight = isFocusMode ? "100%" : "calc(100% - 60px)";
  const canvasMarginTop = isFocusMode ? "0px" : "60px";

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
          setAiPrompt={aiActions.setAiPrompt}
          aiSearchQuery={aiSearchQuery}
          setAiSearchQuery={aiActions.setAiSearchQuery}
          onGenerateMap={aiActions.generateMap}
          onAiSearch={aiActions.searchNodes}
          onUndo={handleUndo}
          onRedo={handleRedo}
          canUndo={canUndo}
          canRedo={canRedo}
          isLoading={isBusy}
          aiLoadingStates={aiLoadingStates}
          onEnterFocusMode={enterFocusMode}
          onCommandPaletteOpen={() => setIsCommandPaletteOpen(true)}
        />
      )}

      <CommandPalette
        isOpen={isCommandPaletteOpen}
        setIsOpen={setIsCommandPaletteOpen}
        actions={commandPaletteActions}
        canUndo={canUndo}
        canRedo={canRedo}
        nodes={nodes}
      />

      {/* Context Menu */}
      <ContextMenuDisplay
        ref={ref}
        contextMenuState={contextMenuState}
        closeContextMenu={contextMenuHandlers.close}
        nodes={nodes}
        edges={edges}
        addNode={openNodeTypeModal}
        deleteNode={crudActions.deleteNode}
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
        saveEdgeStyle={crudActions.saveEdgeProperties}
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
          aiActions.setAiContentTargetNodeId(null);
        }}
        onGenerate={(prompt) => {
          if (aiContentTargetNodeId) {
            aiActions.generateContent(aiContentTargetNodeId, prompt);
          }
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
        isLoading={aiLoadingStates.isAcceptingMerge}
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
        node={nodeToEdit}
        onSave={handleSaveNodeEdit}
        isLoading={isCrudLoading}
        clearData={() => setNodeToEdit(null)}
      />

      {/* Generic Edge Edit Modal */}
      <EdgeEditModal
        isOpen={isEdgeEditModalOpen}
        onClose={handleCloseEdgeEditModal}
        edge={edgeToEdit}
        onSave={handleSaveEdgeEdit}
        isLoading={isCrudLoading}
        nodes={nodes}
        clearData={() => setEdgeToEdit(null)}
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
          edges={allEdges}
          onNodesChange={handleNodesChange}
          onEdgesChange={handleEdgesChange}
          onConnect={handleConnectWrapper}
          onNodeContextMenu={handleNodeContextMenu}
          onPaneContextMenu={handlePaneContextMenu}
          onEdgeContextMenu={handleEdgeContextMenu}
          onEdgeDoubleClick={onReactFlowEdgeClick}
          onPaneClick={contextMenuHandlers.close}
          nodeTypes={nodeTypesWithProps}
          edgeTypes={edgeTypesWithProps}
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

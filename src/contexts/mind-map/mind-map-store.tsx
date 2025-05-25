import { defaultEdgeData } from "@/constants/default-edge-data";
import type { NodeTypes } from "@/constants/node-types";
import generateUuid from "@/helpers/generate-uuid";
import mergeEdgeData from "@/helpers/merge-edge-data";
import { createClient } from "@/helpers/supabase/client";
import { transformSupabaseData } from "@/helpers/transform-supabase-data";
import type { AppEdge } from "@/types/app-edge";
import type { EdgeData } from "@/types/edge-data";
import type { EdgesTableType } from "@/types/edges-table-type";
import type { MindMapData } from "@/types/mind-map-data";
import type { NodeData } from "@/types/node-data";
import type { NodesTableType } from "@/types/nodes-table-type";
import { debouncePerKey } from "@/utils/debounce-per-key";
import {
  calculateGroupBounds,
  generateGroupName,
} from "@/utils/group/group-utils";
import type { XYPosition } from "@xyflow/react";
import {
  applyEdgeChanges,
  applyNodeChanges,
  type ReactFlowInstance,
} from "@xyflow/react";
import dagre from "dagre";
import { toast } from "sonner";
import { create } from "zustand";
import { LayoutAlgorithms } from "@/utils/layout-algorithms";
import type { SpecificLayoutConfig } from "@/types/layout-types";
import type { CommentFilter, CommentSort } from "@/types/comment-types";
import type { ContextMenuState } from "@/types/context-menu-state";
import type {
  AppNode,
  AppState,
  LayoutDirection,
  LoadingStates,
} from "./app-state";

// Dagre graph instance for layout calculations
const g = new dagre.graphlib.Graph();
g.setDefaultEdgeLabel(() => ({}));

// Helper function to calculate layout using Dagre
const getLayoutedElements = (
  nodes: AppNode[],
  edges: AppEdge[],
  direction: LayoutDirection = "TB",
) => {
  g.setGraph({ rankdir: direction, nodesep: 80, ranksep: 150 });

  nodes.forEach((node) => {
    const nodeWidth = node.width || 320;
    const nodeHeight = node.height || 100;
    g.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });

  edges.forEach((edge) => {
    g.setEdge(edge.source, edge.target);
  });

  dagre.layout(g);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = g.node(node.id);

    if (!nodeWithPosition) {
      console.warn(`Dagre could not find node ${node.id} during layout.`);
      return node;
    }

    const nodeWidth = node.width || 320;
    const nodeHeight = node.height || 100;

    return {
      ...node,
      position: {
        x: nodeWithPosition.x - nodeWidth / 2,
        y: nodeWithPosition.y - nodeHeight / 2,
      },
      data: node.data, // Preserve existing node data
    };
  });

  return { layoutedNodes, layoutedEdges: edges }; // Edges are not modified by dagre layout
};

// Configuration for debounce timing
const SAVE_DEBOUNCE_MS = 800;

// Helper HOF for handling loading states and toasts
function withLoadingAndToast<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  T extends (...args: any[]) => Promise<any>,
>(
  action: T,
  loadingKey: keyof LoadingStates,
  options?: {
    initialMessage?: string;
    errorMessage?: string;
    successMessage?: string;
  },
): (...args: Parameters<T>) => Promise<Awaited<ReturnType<T>>> {
  return async (...args) => {
    const { setLoadingStates } = useAppStore.getState();
    const toastId = toast.loading(options?.initialMessage || "Loading...");

    setLoadingStates({ [loadingKey]: true });

    try {
      // Explicitly pass toastId as the last argument
      const res = await action(...args, toastId);
      toast.success(options?.successMessage || "Success!", { id: toastId });

      return res;
    } catch (e) {
      console.error(`Error in ${String(loadingKey)}:`, e);
      toast.error(
        e instanceof Error
          ? e.message
          : options?.errorMessage || "An error occurred.",
        { id: toastId },
      );
    } finally {
      setLoadingStates({ [loadingKey]: false });
    }
  };
}

// this is our useStore hook that we can use in our components to get parts of the store and call actions
const useAppStore = create<AppState>((set, get) => ({
  contextMenuState: {
    x: 0,
    y: 0,
    nodeId: null,
    edgeId: null,
  },
  
  // Layout state
  currentLayoutConfig: null,
  availableLayouts: LayoutAlgorithms.getLayoutPresets(),

  // Comments state
  nodeComments: {},
  mapComments: [],
  commentFilter: {},
  commentSort: { field: "created_at", direction: "desc" },
  selectedCommentId: null,
  commentDrafts: {},
  // --- History state ---
  history: [],
  historyIndex: -1,
  isReverting: false,
  canUndo: false,
  canRedo: false,
  setCanUndo: (value: boolean) => set({ canUndo: value }),
  setCanRedo: (value: boolean) => set({ canRedo: value }),

  // --- History actions ---
  /**
   * Adds a new state to the undo/redo history stack. Avoids consecutive duplicates.
   * @param actionName Optional name for the action
   * @param stateOverride Optionally override nodes/edges to save
   */
  addStateToHistory: (
    actionName?: string,
    stateOverride?: { nodes?: AppNode[]; edges?: AppEdge[] },
  ) => {
    const { nodes, edges, history, historyIndex } = get();
    const nodesToSave = stateOverride?.nodes ?? nodes;
    const edgesToSave = stateOverride?.edges ?? edges;
    const stateToPush = {
      nodes: nodesToSave,
      edges: edgesToSave,
      timestamp: Date.now(),
      actionName: actionName || "unknown",
    };
    const lastHistoryState = history[historyIndex];

    if (
      !lastHistoryState ||
      JSON.stringify({ nodes: stateToPush.nodes, edges: stateToPush.edges }) !==
        JSON.stringify({
          nodes: lastHistoryState.nodes,
          edges: lastHistoryState.edges,
        })
    ) {
      const newHistory = [...history.slice(0, historyIndex + 1), stateToPush];
      set({
        history: newHistory,
        historyIndex: newHistory.length - 1,
        canUndo: newHistory.length > 1,
        canRedo: false,
      });
    }
  },

  /**
   * Undo the last state change, restoring nodes/edges and optionally syncing with DB.
   */
  handleUndo: async () => {
    const { history, historyIndex, setNodes, setEdges } = get();

    if (historyIndex > 0) {
      const prevState = history[historyIndex - 1];
      setNodes(prevState.nodes);
      setEdges(prevState.edges);
      set({
        historyIndex: historyIndex - 1,
        canUndo: historyIndex - 1 > 0,
        canRedo: true,
      });
      // Optionally: sync with DB here if needed
    }
  },

  /**
   * Redo the next state change, restoring nodes/edges and optionally syncing with DB.
   */
  handleRedo: async () => {
    const { history, historyIndex, setNodes, setEdges } = get();

    if (historyIndex < history.length - 1) {
      const nextState = history[historyIndex + 1];
      setNodes(nextState.nodes);
      setEdges(nextState.edges);
      set({
        historyIndex: historyIndex + 1,
        canUndo: true,
        canRedo: historyIndex + 1 < history.length - 1,
      });
      // Optionally: sync with DB here if needed
    }
  },

  /**
   * Revert to a specific history state by index.
   * @param index The history index to revert to
   */
  revertToHistoryState: async (index: number) => {
    const { history, historyIndex, setNodes, setEdges, isReverting } = get();
    if (isReverting || index < 0 || index >= history.length) return;
    if (index === historyIndex) return;
    set({ isReverting: true });
    const targetState = history[index];
    setNodes(targetState.nodes);
    setEdges(targetState.edges);
    set({
      historyIndex: index,
      isReverting: false,
      canUndo: index > 0,
      canRedo: index < history.length - 1,
    });
    // Optionally: sync with DB here if needed
  },

  // --- History selectors ---
  getCurrentHistoryState: () => {
    const { history, historyIndex } = get();
    return history[historyIndex];
  },

  supabase: createClient(),
  mapId: null,
  reactFlowInstance: null,
  mindMap: null,
  nodes: [],
  selectedNodes: [],
  edges: [],
  isFocusMode: false,
  isDraggingNodes: false,
  copiedNodes: [],
  copiedEdges: [],

  popoverOpen: {
    contextMenu: false,
    commandPalette: false,
    nodeType: false,
    nodeEdit: false,
    edgeEdit: false,
    history: false,
    mergeSuggestions: false,
    aiContent: false,
    generateFromNodesModal: false,
    layoutSelector: false,
    commentsPanel: false,
    nodeComments: false,
  },
  isCommentsPanelOpen: false,
  selectedNodeId: null,
  nodeInfo: null,
  edgeInfo: null,
  loadingStates: {
    isAddingContent: false,
    isStateLoading: false,
    isGenerating: false,
    isSummarizing: false,
    isExtracting: false,
    isSearching: false,
    isGeneratingContent: false,
    isSuggestingConnections: false,
    isSummarizingBranch: false,
    isSuggestingMerges: false,
    isSavingNode: false,
    isSavingEdge: false,
    isApplyingLayout: false,
    isLoadingComments: false,
    isSavingComment: false,
    isDeletingComment: false,
  },
  lastSavedNodeTimestamps: {},
  lastSavedEdgeTimestamps: {},

  // Handlers
  onNodesChange: (changes) => {
    // Apply changes as before
    const updatedNodes = applyNodeChanges(changes, get().nodes);

    // Handle group movement synchronization
    const finalNodes = [...updatedNodes];
    const processedGroupIds = new Set<string>();

    changes.forEach((change) => {
      if (change.type === "position" && change.position) {
        const movedNode = finalNodes.find((n) => n.id === change.id);

        // If a group is moved, move its children (during dragging and after)
        if (
          movedNode?.data.metadata?.isGroup &&
          !processedGroupIds.has(change.id)
        ) {
          processedGroupIds.add(change.id);
          const groupChildren =
            (movedNode.data.metadata.groupChildren as string[]) || [];
          const oldPosition = get().nodes.find(
            (n) => n.id === change.id,
          )?.position;

          if (oldPosition && groupChildren.length > 0) {
            const deltaX = change.position.x - oldPosition.x;
            const deltaY = change.position.y - oldPosition.y;

            groupChildren.forEach((childId) => {
              const childIndex = finalNodes.findIndex((n) => n.id === childId);

              if (childIndex !== -1) {
                finalNodes[childIndex] = {
                  ...finalNodes[childIndex],
                  position: {
                    x: finalNodes[childIndex].position.x + deltaX,
                    y: finalNodes[childIndex].position.y + deltaY,
                  },
                };
              }
            });
          }
        }
      }
    });

    set({ nodes: finalNodes });

    // Trigger debounced saves for relevant node changes
    changes.forEach((change) => {
      // Only save when changes are complete (not during dragging/resizing)
      if (
        change.type === "position" &&
        change.position &&
        change.dragging === false
      ) {
        get().triggerNodeSave(change.id);

        // Also save moved children when group is moved
        const movedNode = finalNodes.find((n) => n.id === change.id);

        if (movedNode?.data.metadata?.isGroup) {
          const groupChildren =
            (movedNode.data.metadata.groupChildren as string[]) || [];
          groupChildren.forEach((childId) => {
            get().triggerNodeSave(childId);
          });
        }
      } else if (
        change.type === "dimensions" &&
        change.dimensions &&
        change.resizing === false
      ) {
        get().triggerNodeSave(change.id);
      } else if (change.type === "select" || change.type === "remove") {
        // No need to save for these change types
        return;
      } else if (change.type === "add") {
        // New nodes are handled elsewhere
        return;
      } else if (change.type === "replace") {
        // Data changes should trigger a save
        get().triggerNodeSave(change.id);
      }
    });
  },
  onEdgesChange: (changes) => {
    // Apply changes as before
    const updatedEdges = applyEdgeChanges(changes, get().edges);
    set({ edges: updatedEdges });

    // Trigger debounced saves for relevant edge changes
    changes.forEach((change) => {
      if (change.type === "remove") {
        // Edge removal is handled elsewhere
        return;
      } else if (change.type === "select") {
        // No need to save for selection changes
        return;
      } else if (change.type === "add") {
        // New edges are handled elsewhere
        return;
      } else if (change.type === "replace") {
        // Data changes should trigger a save
        get().triggerEdgeSave(change.id);
      }
    });
  },
  onConnect: (connection) => {
    if (!connection.source || !connection.target) return;

    const addEdge = get().addEdge;
    const newEdge = mergeEdgeData(defaultEdgeData(), {
      id: generateUuid(),
      source: connection.source,
      target: connection.target,
    });

    addEdge(connection.source, connection.target, newEdge);
  },

  // Setters
  setNodes: (nodes) => {
    set({ nodes });
  },
  setEdges: (edges) => {
    set({ edges });
  },
  setMindMap: (mindMap) => {
    set({ mindMap });
  },
  setLoadingStates: (loadingStates) => {
    set({ loadingStates: { ...get().loadingStates, ...loadingStates } });
  },
  setReactFlowInstance: (reactFlowInstance: ReactFlowInstance) => {
    set({ reactFlowInstance });
  },
  setEdgeInfo: (edgeInfo) => {
    set({ edgeInfo });
  },
  setNodeInfo: (nodeInfo) => {
    set({ nodeInfo });
  },
  setPopoverOpen: (popover) => {
    set({ popoverOpen: { ...get().popoverOpen, ...popover } });
  },
  setMapId: (mapId) => {
    set({ mapId });
  },
  setSelectedNodes: (selectedNodes) => {
    set({ selectedNodes });
    // Update selectedNodeId for comments panel
    if (selectedNodes.length === 1) {
      set({ selectedNodeId: selectedNodes[0].id });
    } else {
      set({ selectedNodeId: null });
    }
  },
  setIsDraggingNodes: (isDraggingNodes) => {
    set({ isDraggingNodes });
  },
  setContextMenuState: (state) => set({ contextMenuState: state }),

  // Comment panel actions
  toggleCommentsPanel: () => {
    set({ isCommentsPanelOpen: !get().isCommentsPanelOpen });
  },
  openCommentsPanel: (nodeId?: string) => {
    set({ 
      isCommentsPanelOpen: true,
      selectedNodeId: nodeId || get().selectedNodeId
    });
  },
  closeCommentsPanel: () => {
    set({ isCommentsPanelOpen: false });
  },

  // Getters
  getNode: (id: string) => {
    const nodes = get().nodes;
    return nodes.find((node) => node.id === id);
  },
  getEdge: (id: string) => {
    const edges = get().edges;
    return edges.find((edge) => edge.id === id);
  },
  // Actions
  toggleFocusMode: () => {
    set({
      isFocusMode: !get().isFocusMode,
    });
  },

  copySelectedNodes: () => {
    const { selectedNodes } = get();
    const { edges } = get();

    const toastId = toast.loading("Copying nodes...");
    if (selectedNodes.length === 0) return;

    // Get the selected node IDs
    const selectedNodeIds = new Set(selectedNodes.map((node) => node.id));

    // Find edges that connect only the selected nodes (internal edges)
    const internalEdges = edges.filter(
      (edge) =>
        selectedNodeIds.has(edge.source) && selectedNodeIds.has(edge.target),
    );

    set({
      copiedNodes: selectedNodes,
      copiedEdges: internalEdges,
    });

    toast.success("Nodes copied!", { id: toastId });
  },

  pasteNodes: async (position?: XYPosition) => {
    const { copiedNodes, copiedEdges, reactFlowInstance, addNode, addEdge } =
      get();

    if (copiedNodes.length === 0) return;

    // Generate a mapping of old IDs to new IDs
    const idMap = new Map<string, string>();

    // Create new nodes with new IDs
    const newNodes = copiedNodes.map((node, index) => {
      const newNodeId = generateUuid();
      idMap.set(node.id, newNodeId);

      // Calculate new position if provided
      let newPosition = { ...node.position };

      if (position && reactFlowInstance) {
        const pasteCenter = reactFlowInstance.screenToFlowPosition({
          x: window.innerWidth / 2,
          y: window.innerHeight / 2 - 30,
        });
        newPosition = {
          x: pasteCenter.x + index * 30 + Math.random() * 10 - 5,
          y: pasteCenter.y + index * 30 + Math.random() * 10 - 5,
        };
      }

      return {
        ...node,
        id: newNodeId,
        position: newPosition,
        selected: false, // Deselect after paste
      };
    });

    // Create new edges with new IDs and updated source/target
    const newEdges = copiedEdges.map((edge) => {
      const newEdgeId = generateUuid();
      return {
        ...edge,
        id: newEdgeId,
        source: idMap.get(edge.source) || edge.source,
        target: idMap.get(edge.target) || edge.target,
      };
    });

    // Add new nodes

    for (const node of newNodes) {
      await addNode({
        parentNode: null, // Will be handled by edges
        content: node.data.content || "",
        nodeType: (node.type as NodeTypes) || "default",
        data: {
          ...node.data,
          id: node.id,
        },
        position: node.position,
      });
    }

    // Add new edges

    for (const edge of newEdges) {
      await addEdge(edge.source, edge.target, {
        ...edge.data,
        id: edge.id,
      });
    }

    // Select the newly pasted nodes
    set({
      selectedNodes: newNodes,
    });
  },

  duplicateNodes: async (nodeIds: string[]) => {
    const { nodes, edges } = get();

    if (nodeIds.length === 0) return { nodes: [], edges: [] };

    // Find the nodes to duplicate
    const nodesToDuplicate = nodes.filter((node) => nodeIds.includes(node.id));
    const nodeIdSet = new Set(nodeIds);

    // Find internal edges
    const edgesToDuplicate = edges.filter(
      (edge) => nodeIdSet.has(edge.source) && nodeIdSet.has(edge.target),
    );

    // Generate new IDs
    const idMap = new Map<string, string>();
    const newNodes = nodesToDuplicate.map((node) => {
      const newId = generateUuid();
      idMap.set(node.id, newId);

      return {
        ...node,
        id: newId,
        position: {
          x: node.position.x + 50, // Offset slightly
          y: node.position.y + 50,
        },
        selected: false,
      };
    });

    const newEdges = edgesToDuplicate.map((edge) => ({
      ...edge,
      id: generateUuid(),
      source: idMap.get(edge.source) || edge.source,
      target: idMap.get(edge.target) || edge.target,
    }));

    return { nodes: newNodes, edges: newEdges };
  },
  fetchMindMapData: withLoadingAndToast(
    async (mapId: string) => {
      if (!mapId) {
        throw new Error("Map ID is required.");
      }

      const { data: mindMapData, error: mindMapError } = await get()
        .supabase.from("mind_maps")
        .select(
          `
              id,
              user_id,
              created_at,
              updated_at,
              description,
              title,
              tags,
              visibility,
              thumbnailUrl,
              nodes (
              id,
                map_id,
                parent_id,
                content,
                position_x,
                position_y,
                width,
                height,
                node_type,
                tags,
                status,
                importance,
                sourceUrl,
                metadata,
                aiData,
                created_at,
                updated_at
              ),
              edges (
                id,
                map_id,
                source,
                target,
                label,
                type,
                 animated,
                markerEnd,
                markerStart,
                style,
                metadata,
                aiData,
                created_at,
                updated_at
              )
            `,
        )
        .eq("id", mapId)
        .single();

      if (mindMapError) {
        console.error("Error fetching from Supabase:", mindMapError);
        throw new Error(
          mindMapError.message || "Failed to fetch mind map data.",
        );
      }

      if (!mindMapData) {
        throw new Error("Mind map not found.");
      }

      const transformedData = transformSupabaseData(
        mindMapData as unknown as MindMapData & {
          nodes: NodesTableType[];
          edges: EdgesTableType[];
        },
      );

      set({
        mindMap: transformedData.mindMap,
        nodes: transformedData.reactFlowNodes,
        edges: transformedData.reactFlowEdges,
      });
    },
    "isStateLoading",
    {
      initialMessage: "Fetching mind map data...",
      errorMessage: "Failed to fetch mind map data.",
      successMessage: "Mind map data fetched successfully.",
    },
  ),

  addNode: withLoadingAndToast(
    async (props: {
      parentNode: Partial<AppNode> | null;
      content?: string;
      nodeType?: NodeTypes;
      data?: Partial<NodeData>;
      position?: { x: number; y: number };
      toastId?: string;
    }) => {
      let { nodeType = "defaultNode" } = props;
      const { parentNode, position, data = {}, content = "New node" } = props;
      const { mapId, supabase, nodes, edges, addStateToHistory } = get();

      if (!mapId) {
        toast.loading(
          "Attempted to add node with unknown type: ${nodeType}. Falling back to 'defaultNode'.",
          { id: props.toastId },
        );
        nodeType = "defaultNode";
      }

      const newNodeId = generateUuid();
      let newNode: AppNode | null = null;
      let newNodePosition = position;

      if (position) {
        newNodePosition = position;
      } else if (parentNode && parentNode.position) {
        newNodePosition = {
          x: parentNode.position.x + (parentNode.width || 170) + 100,
          y: parentNode.position.y + (parentNode.height || 60) / 2 - 30,
        };
      } else {
        newNodePosition = {
          x: Math.random() * 400 + 50,
          y: Math.random() * 400 + 50,
        };
      }

      const user = await supabase?.auth.getUser();
      if (!user?.data.user) throw new Error("User not authenticated.");

      const newNodeDbData: Omit<NodeData, "created_at" | "updated_at"> & {
        created_at?: string;
        updated_at?: string;
      } = {
        id: newNodeId,
        user_id: user.data.user.id,
        map_id: mapId,
        parent_id: parentNode?.id,
        content: content,
        position_x: newNodePosition.x,
        position_y: newNodePosition.y,
        node_type: nodeType,
        ...data,
      };

      const { data: insertedNodeData, error: nodeInsertError } = await supabase
        .from("nodes")
        .insert([newNodeDbData])
        .select("*")
        .single();

      if (nodeInsertError || !insertedNodeData) {
        throw new Error(
          nodeInsertError?.message || "Failed to save new node to database.",
        );
      }

      newNode = {
        id: insertedNodeData.id,
        position: {
          x: insertedNodeData.position_x,
          y: insertedNodeData.position_y,
        },

        data: insertedNodeData,
        type: insertedNodeData.node_type || "defaultNode",

        width: insertedNodeData.width || undefined,
        height: insertedNodeData.height || undefined,
      };

      const finalNodes = [...nodes, newNode];
      const finalEdges = [...edges];

      const addEdge = get().addEdge;

      if (parentNode && parentNode.id) {
        const newEdge = await addEdge(
          parentNode.id,
          newNode.id,
          {
            source: parentNode.id,
            target: newNode.id,
          },
          props.toastId,
        );

        finalEdges.push(newEdge);
      }

      addStateToHistory("addNode", { nodes: finalNodes, edges: finalEdges });

      set({
        nodes: finalNodes,
        edges: finalEdges,
      });
    },
    "isAddingContent",
    {
      initialMessage: "Adding node...",
      errorMessage: "Failed to add node.",
      successMessage: "Node added successfully.",
    },
  ),
  updateNode: withLoadingAndToast(
    async (props: { nodeId: string; data: Partial<NodeData> }) => {
      const { nodeId, data } = props;
      let updatedNode: AppNode | null = null;

      // First update the local state
      set((state) => ({
        nodes: state.nodes.map((node) => {
          if (node.id === nodeId) {
            updatedNode = {
              ...node,
              type: data.node_type || node.type,
              width: data.width || node.width,
              height: data.height || node.height,
              position: {
                x: data.position_x || node.position.x,
                y: data.position_y || node.position.y,
              },
              data: {
                ...node.data,
                ...data,
                metadata: {
                  ...node.data.metadata,
                  ...data.metadata,
                },
                aiData: {
                  ...node.data.aiData,
                  ...data.aiData,
                },
              },
            };

            return updatedNode;
          }

          return node;
        }),
        nodeInfo: updatedNode,
      }));

      // Trigger debounced save to persist changes
      get().triggerNodeSave(nodeId);
    },
    "isAddingContent",
    {
      initialMessage: "Updating node...",
      errorMessage: "Failed to update node.",
      successMessage: "Node updated successfully.",
    },
  ),
  deleteNodes: withLoadingAndToast(
    async (nodesToDelete: AppNode[]) => {
      const {
        mapId,
        supabase,
        edges,
        nodes: allNodes,
        addStateToHistory,
      } = get();

      if (!mapId || !nodesToDelete) return;

      const edgesToDelete = edges.filter((edge) =>
        nodesToDelete.some(
          (node) => edge.source === node.id || edge.target === node.id,
        ),
      );

      const user = await supabase?.auth.getUser();
      if (!user?.data.user) throw new Error("User not authenticated.");

      const { error: deleteError } = await supabase
        .from("nodes")
        .delete()
        .in(
          "id",
          nodesToDelete.map((node) => node.id),
        )
        .eq("user_id", user.data.user.id);

      const { error: deleteEdgesError } = await supabase
        .from("edges")
        .delete()
        .in(
          "id",
          edgesToDelete.map((edge) => edge.id),
        )
        .eq("user_id", user.data.user.id);

      if (deleteError) {
        throw new Error(deleteError.message || "Failed to delete nodes.");
      }

      if (deleteEdgesError) {
        throw new Error(deleteEdgesError.message || "Failed to delete edges.");
      }

      const finalNodes = allNodes.filter((n) => !nodesToDelete.includes(n));
      const finalEdges = edges.filter((e) => !edgesToDelete.includes(e));

      addStateToHistory("deleteNode", { nodes: finalNodes, edges: finalEdges });

      set({
        nodes: finalNodes,
        edges: finalEdges,
      });
    },
    "isAddingContent",
    {
      initialMessage: "Deleting nodes...",
      errorMessage: "Failed to delete nodes.",
      successMessage: "Nodes deleted successfully.",
    },
  ),
  addEdge: withLoadingAndToast(
    async (
      sourceId: string,
      targetId: string,
      data: Partial<EdgeData>,
      toastId?: string,
    ) => {
      const { supabase, mapId, edges, nodes, addStateToHistory } = get();

      if (!mapId) {
        throw new Error("Cannot add connection: Map ID missing.");
      }

      const user = await supabase?.auth.getUser();
      if (!user?.data.user) throw new Error("User not authenticated.");

      const existingEdge = edges.find(
        (e) =>
          (e.source === sourceId && e.target === targetId) ||
          (e.source === targetId && e.target === sourceId),
      );

      if (existingEdge) {
        throw new Error("Edge already exists.");
      }

      const newEdge = mergeEdgeData(defaultEdgeData(), {
        type: "floatingEdge",
        ...data,
        map_id: mapId!,
        user_id: user.data.user.id,
      });

      const { data: insertedEdgeData, error: insertError } = await supabase
        .from("edges")
        .insert(newEdge)
        .select()
        .single();

      if (insertError) {
        throw new Error(insertError.message || "Failed to insert edge.");
      }

      const newFlowEdge: AppEdge = {
        id: insertedEdgeData.id,
        source: insertedEdgeData.source,
        target: insertedEdgeData.target,
        type: "floatingEdge", // Ensure type is floatingEdge
        animated: true,
        label: insertedEdgeData.label,
        style: {
          stroke: insertedEdgeData.style?.stroke || "#6c757d",
          strokeWidth: insertedEdgeData.style?.strokeWidth || 2,
        },
        markerEnd: insertedEdgeData.markerEnd,
        data: insertedEdgeData,
      };

      const finalEdges = [...edges, newFlowEdge];

      const { error: parentUpdateError } = await supabase
        .from("nodes")
        .update({ parent_id: sourceId, updated_at: new Date().toISOString() })
        .eq("id", targetId);

      if (parentUpdateError) {
        toast.warning(
          "Connection saved, but failed to set parent relationship in DB.",
          { id: toastId },
        );
      }

      const finalNodes = nodes.map((node) => {
        if (node.id === targetId) {
          return {
            ...node,
            parent_id: sourceId,
          };
        }

        return node;
      });

      set({
        edges: finalEdges,
        nodes: finalNodes,
      });

      addStateToHistory("addEdge", { edges: finalEdges, nodes: nodes });
      return newFlowEdge;
    },
    "isAddingContent",
    {
      initialMessage: "Adding edge...",
      errorMessage: "Failed to add edge.",
      successMessage: "Edge added successfully.",
    },
  ),
  deleteEdges: withLoadingAndToast(
    async (edgesToDelete: AppEdge[]) => {
      const { supabase, mapId, edges, nodes, addStateToHistory } = get();

      if (!mapId) {
        throw new Error("Cannot delete edge: Map ID missing.");
      }

      const user = await supabase?.auth.getUser();
      if (!user?.data.user) throw new Error("User not authenticated.");

      const { error: deleteError } = await supabase
        .from("edges")
        .delete()
        .in(
          "id",
          edgesToDelete.map((edge) => edge.id),
        )
        .eq("map_id", mapId);

      if (deleteError) {
        throw new Error(deleteError.message || "Failed to delete edge.");
      }

      const finalEdges = edges.filter((e) => !edgesToDelete.includes(e));

      const updatedNodes = nodes.map((node) => {
        const newParents = node.parentId
          ? edgesToDelete.filter((edge) => edge.source !== node.id)
          : [];

        return {
          ...node,
          parentId: newParents.length > 0 ? newParents[0].target : undefined,
        };
      });

      set({
        edges: finalEdges,
        nodes: updatedNodes,
      });

      addStateToHistory("deleteEdge", { edges: finalEdges, nodes: nodes });
    },
    "isAddingContent",
    {
      initialMessage: "Deleting edge...",
      errorMessage: "Failed to delete edge.",
      successMessage: "Edge deleted successfully.",
    },
  ),
  updateEdge: async (props: { edgeId: string; data: Partial<EdgeData> }) => {
    const { edges, nodes, addStateToHistory, mapId, supabase } = get();
    const { edgeId, data } = props;

    const user = (await supabase?.auth.getUser())?.data.user;

    if (!user) {
      toast.error("User not authenticated.");
      return;
    }

    // Update edge in local state first
    const finalEdges = edges.map((edge) => {
      if (edge.id === edgeId) {
        return {
          ...edge,
          id: edgeId,
          data: {
            ...edge.data,
            ...data,
            id: edgeId,
            map_id: mapId!,
            user_id: user.id,
            style: {
              ...edge.style,
              ...data.style,
            },
            metadata: {
              ...edge.data?.metadata,
              ...data.metadata,
            },
            aiData: {
              ...edge.data?.aiData,
              ...data.aiData,
            },
          },
        };
      }

      return edge;
    }) as AppEdge[];

    set({
      edges: finalEdges,
    });

    // Trigger debounced save to persist changes
    get().triggerEdgeSave(edgeId);

    addStateToHistory("updateEdge", { edges: finalEdges, nodes: nodes });
  },

  // Set an edge as a parent link and update the target node's parent_id
  setParentConnection: (edgeId: string) => {
    const {
      edges,
      nodes,
      triggerEdgeSave,
      triggerNodeSave,
      addStateToHistory,
    } = get();

    const edge = edges.find((e) => e.id === edgeId);

    if (!edge) {
      toast.error("Edge not found");
      return;
    }

    const targetNodeIdx = nodes.findIndex((n) => n.id === edge.target);

    if (targetNodeIdx === -1) {
      toast.error("Target node not found");
      return;
    }

    // Optimistic update
    const updatedEdges = edges.map((e) =>
      e.id === edgeId
        ? {
            ...e,
            data: {
              ...e.data,
              metadata: {
                ...(e.data?.metadata ?? {}),
                isParentLink: true,
              },
            },
          }
        : e,
    );
    const updatedNodes = nodes.map((n, idx) =>
      idx === targetNodeIdx
        ? {
            ...n,
            data: {
              ...n.data,
              parent_id: edge.source,
            },
          }
        : n,
    );

    set({ edges: updatedEdges as AppEdge[], nodes: updatedNodes });

    // Debounced save and history
    triggerEdgeSave(edgeId);
    triggerNodeSave(edge.target);
    addStateToHistory("setParentConnection", {
      nodes: updatedNodes,
      edges: updatedEdges as AppEdge[],
    });
  },

  // Debounced save functions
  triggerNodeSave: debouncePerKey(
    withLoadingAndToast(
      async (nodeId: string) => {
        const { nodes, supabase, mapId } = get();
        const node = nodes.find((n) => n.id === nodeId);

        if (!node || !node.data) {
          console.error(`Node with id ${nodeId} not found or has invalid data`);
          throw new Error(
            `Node with id ${nodeId} not found or has invalid data`,
          );
        }

        set((state) => ({
          lastSavedNodeTimestamps: {
            ...state.lastSavedNodeTimestamps,
            [nodeId]: Date.now(),
          },
        }));

        if (!mapId) {
          console.error("Cannot save node: No mapId defined");
          throw new Error("Cannot save node: No mapId defined");
        }

        const user_id = (await supabase.auth.getUser()).data.user?.id;

        if (!user_id) {
          throw new Error("Not authenticated");
        }

        // Prepare node data for saving, ensuring type safety
        const nodeData: NodesTableType = {
          id: nodeId,
          map_id: mapId,
          user_id: user_id,
          content: node.data.content || "",
          metadata: node.data.metadata || {},
          aiData: node.data.aiData || {},
          position_x: node.position.x,
          position_y: node.position.y,
          width: node.width,
          height: node.height,
          node_type: node.type || "defaultNode",
          updated_at: new Date().toISOString(),
          created_at: node.data.created_at,
          parent_id: node.parentId || node.data.parent_id || null,
        };

        // Save node data to Supabase
        supabase
          .from("nodes")
          .update(nodeData)
          .eq("id", nodeId)
          .eq("map_id", mapId)
          .then(({ error }) => {
            if (error) {
              console.error("Error saving node:", error);
              throw new Error("Failed to save node changes");
            }
          });
      },
      "isSavingNode",
      {
        initialMessage: "Saving node changes...",
        errorMessage: "Failed to save node chanes.",
        successMessage: "Saved node successfully.",
      },
    ),
    SAVE_DEBOUNCE_MS,
    (nodeId: string) => nodeId, // getKey function for triggerNodeSave
  ),

  triggerEdgeSave: debouncePerKey(
    withLoadingAndToast(
      async (edgeId: string) => {
        const { edges, supabase, mapId, addStateToHistory, nodes } = get();
        const edge = edges.find((e) => e.id === edgeId);

        if (!edge || !edge.data) {
          console.error(`Edge with id ${edgeId} not found or has invalid data`);
          throw new Error(
            `Edge with id ${edgeId} not found or has invalid data`,
          );
        }

        set((state) => ({
          lastSavedEdgeTimestamps: {
            ...state.lastSavedEdgeTimestamps,
            [edgeId]: Date.now(),
          },
        }));

        if (!mapId) {
          console.error("Cannot save edge: No mapId defined");
          throw new Error("Cannot save dge: No mapId defined");
        }

        const user_id = (await supabase.auth.getUser()).data.user?.id;

        if (!user_id) {
          throw new Error("Not authenticated");
        }

        const defaultEdge: Partial<EdgeData> = defaultEdgeData();

        // Prepare edge data for saving, ensuring type safety
        const edgeData: EdgeData = {
          ...defaultEdge,
          ...edge.data,
          user_id: user_id,
          id: edgeId,
          map_id: mapId,
          source: edge.source || "",
          target: edge.target || "",
          updated_at: new Date().toISOString(),
          animated: edge.data?.animated || defaultEdge.animated,
          metadata: {
            ...defaultEdge.metadata!,
            ...edge.data?.metadata,
          },
          aiData: {
            ...defaultEdge.aiData,
            ...edge.data?.aiData,
          },
          style: {
            ...defaultEdge.style!,
            ...edge.data?.style,
          },
        };

        // Save edge data to Supabase
        const { data: dbEdge, error } = await supabase
          .from("edges")
          .update(edgeData)
          .eq("id", edgeId)
          .select()
          .single();

        if (error) {
          console.error("Error saving edge:", error);
          throw new Error("Failed to save edge changes");
        }

        const finalEdges = edges.map((edge) => {
          if (edge.id === edgeId) {
            return {
              ...edge,
              data: mergeEdgeData(edge.data ?? {}, dbEdge),
              animated: JSON.parse(dbEdge.animated),
              style: dbEdge.style,
            };
          }

          return edge;
        }) as AppEdge[];

        set({
          edges: finalEdges,
        });

        addStateToHistory("updateEdge", { edges: finalEdges, nodes: nodes });
      },
      "isSavingEdge",
      {
        initialMessage: "Saving edge changes...",
        errorMessage: "Failed to save edge changes.",
        successMessage: "Saved edge successfully.",
      },
    ),
    SAVE_DEBOUNCE_MS,
    (edgeId: string) => edgeId, // getKey function for triggerEdgeSave
  ),

  applyLayout: withLoadingAndToast(
    async (direction: LayoutDirection) => {
      const {
        nodes,
        edges,
        setNodes,
        reactFlowInstance,
        addStateToHistory,
        triggerNodeSave, // Use triggerNodeSave for individual node position updates
      } = get();

      if (nodes.length === 0) {
        // No need to throw an error that stops execution, just inform the user.
        toast.error("Nothing to layout. Add some nodes first.");
        return; // Return early if there are no nodes
      }

      const { layoutedNodes } = getLayoutedElements(nodes, edges, direction);

      setNodes([...layoutedNodes]); // Update nodes in the store with new positions

      // After nodes are updated in the store, trigger debounced save for each moved node.
      // triggerNodeSave will pick up the latest position from the store.
      layoutedNodes.forEach((node) => {
        triggerNodeSave(node.id);
      });

      addStateToHistory(`applyLayout (${direction})`);

      // Fit view after a short delay to allow DOM updates and ensure layout is rendered
      setTimeout(() => {
        reactFlowInstance?.fitView({ padding: 0.1, duration: 300 });
      }, 50);
    },
    "isApplyingLayout", // Key for loading state
    {
      initialMessage: "Applying layout...",
      successMessage: "Layout applied and node positions are being saved.",
      errorMessage: "Failed to apply layout.",
    },
  ),

  // Group management actions
  createGroupFromSelected: withLoadingAndToast(
    async (label?: string): Promise<void> => {
      const { selectedNodes, nodes, addNode, updateNode } = get();

      if (selectedNodes.length < 2) {
        throw new Error("At least 2 nodes must be selected to create a group");
      }

      // Calculate bounds for the group using utilities
      const padding = 40;
      const bounds = calculateGroupBounds(selectedNodes, padding);
      const groupLabel = label || generateGroupName(nodes);
      const groupId = generateUuid();

      // Create the group node
      await addNode({
        parentNode: null,
        content: groupLabel,
        nodeType: "groupNode",
        position: { x: bounds.x, y: bounds.y },
        data: {
          id: groupId,
          width: bounds.width,
          height: bounds.height,
          metadata: {
            isGroup: true,
            groupChildren: selectedNodes.map((n) => n.id),
            label: groupLabel,
            backgroundColor: "rgba(113, 113, 122, 0.1)",
            borderColor: "#52525b",
            groupPadding: padding,
          },
        },
      });

      // Update selected nodes to reference this group
      for (const node of selectedNodes) {
        await updateNode({
          nodeId: node.id,
          data: {
            metadata: {
              ...node.data.metadata,
              groupId: groupId,
            },
          },
        });
      }
    },
    "isAddingContent",
    {
      initialMessage: "Creating group...",
      successMessage: "Group created successfully",
      errorMessage: "Failed to create group",
    },
  ),

  addNodesToGroup: withLoadingAndToast(
    async (groupId: string, nodeIds: string[]): Promise<void> => {
      const { nodes, updateNode } = get();

      const groupNode = nodes.find((n) => n.id === groupId);

      if (!groupNode || !groupNode.data.metadata?.isGroup) {
        throw new Error("Invalid group node");
      }

      const currentChildren =
        (groupNode.data.metadata.groupChildren as string[]) || [];
      const newChildren = [...new Set([...currentChildren, ...nodeIds])];

      // Update group node with new children
      await updateNode({
        nodeId: groupId,
        data: {
          metadata: {
            ...groupNode.data.metadata,
            groupChildren: newChildren,
          },
        },
      });

      // Update target nodes to reference this group
      for (const nodeId of nodeIds) {
        await updateNode({
          nodeId,
          data: {
            metadata: {
              groupId: groupId,
            },
          },
        });
      }
    },
    "isAddingContent",
    {
      initialMessage: "Adding nodes to group...",
      successMessage: "Nodes added to group",
      errorMessage: "Failed to add nodes to group",
    },
  ),

  removeNodesFromGroup: withLoadingAndToast(
    async (nodeIds: string[]): Promise<void> => {
      const { nodes, updateNode } = get();

      for (const nodeId of nodeIds) {
        const node = nodes.find((n) => n.id === nodeId);
        if (!node?.data.metadata?.groupId) continue;

        const groupId = node.data.metadata.groupId;
        const groupNode = nodes.find((n) => n.id === groupId);

        if (groupNode?.data.metadata?.isGroup) {
          const currentChildren =
            (groupNode.data.metadata.groupChildren as string[]) || [];
          const newChildren = currentChildren.filter((id) => id !== nodeId);

          // Update group node
          await updateNode({
            nodeId: groupId,
            data: {
              metadata: {
                ...groupNode.data.metadata,
                groupChildren: newChildren,
              },
            },
          });
        }

        // Remove group reference from node
        await updateNode({
          nodeId,
          data: {
            metadata: {
              ...node.data.metadata,
              groupId: undefined,
            },
          },
        });
      }
    },
    "isAddingContent",
    {
      initialMessage: "Removing nodes from group...",
      successMessage: "Nodes removed from group",
      errorMessage: "Failed to remove nodes from group",
    },
  ),

  deleteGroup: withLoadingAndToast(
    async (
      groupId: string,
      preserveChildren: boolean = true,
    ): Promise<void> => {
      const { nodes, deleteNodes, updateNode } = get();

      const groupNode = nodes.find((n) => n.id === groupId);

      if (!groupNode?.data.metadata?.isGroup) {
        throw new Error("Invalid group node");
      }

      const childNodeIds =
        (groupNode.data.metadata.groupChildren as string[]) || [];

      if (preserveChildren) {
        // Remove group reference from child nodes
        for (const nodeId of childNodeIds) {
          await updateNode({
            nodeId,
            data: {
              metadata: {
                groupId: undefined,
              },
            },
          });
        }
      } else {
        // Delete child nodes
        const childNodes = nodes.filter((n) => childNodeIds.includes(n.id));

        if (childNodes.length > 0) {
          await deleteNodes(childNodes);
        }
      }

      // Delete the group node
      await deleteNodes([groupNode]);
    },
    "isAddingContent",
    {
      initialMessage: "Deleting group...",
      successMessage: "Group deleted successfully",
      errorMessage: "Failed to delete group",
    },
  ),

  ungroupNodes: withLoadingAndToast(
    async (groupId: string): Promise<void> => {
      const { nodes, updateNode, deleteNodes } = get();

      const groupNode = nodes.find((n) => n.id === groupId);

      if (!groupNode?.data.metadata?.isGroup) {
        throw new Error("Invalid group node");
      }

      const childNodeIds =
        (groupNode.data.metadata.groupChildren as string[]) || [];

      // Remove group reference from all child nodes
      for (const nodeId of childNodeIds) {
        await updateNode({
          nodeId,
          data: {
            metadata: {
              groupId: undefined,
            },
          },
        });
      }

      // Delete the group node
      await deleteNodes([groupNode]);
    },
    "isAddingContent",
    {
      initialMessage: "Ungrouping nodes...",
      successMessage: "Nodes ungrouped successfully",
      errorMessage: "Failed to ungroup nodes",
    },
  ),

  // Collapse/Expand functionality
  getDirectChildrenCount: (nodeId: string): number => {
    const { edges } = get();
    return edges.filter(edge => edge.source === nodeId).length;
  },

  getDescendantNodeIds: (nodeId: string): string[] => {
    const { edges } = get();
    const descendants: string[] = [];
    const visited = new Set<string>();

    const findDescendants = (currentNodeId: string) => {
      if (visited.has(currentNodeId)) return;
      visited.add(currentNodeId);

      const childEdges = edges.filter(edge => edge.source === currentNodeId);
      
      for (const edge of childEdges) {
        if (!visited.has(edge.target)) {
          descendants.push(edge.target);
          findDescendants(edge.target);
        }
      }
    };

    findDescendants(nodeId);
    return descendants;
  },

  getVisibleNodes: (): AppNode[] => {
    const { nodes } = get();
    const collapsedNodes = nodes.filter(node => node.data.metadata?.isCollapsed);
    const hiddenNodeIds = new Set<string>();

    // Collect all descendant IDs of collapsed nodes
    for (const collapsedNode of collapsedNodes) {
      const descendants = get().getDescendantNodeIds(collapsedNode.id);
      descendants.forEach(id => hiddenNodeIds.add(id));
    }

    // Filter out hidden nodes first
    const visibleNodes = nodes.filter(node => !hiddenNodeIds.has(node.id));

    // Now handle groups - hide groups if all their children are hidden
    const groupNodes = visibleNodes.filter(node => node.data.metadata?.isGroup);
    const finalHiddenNodeIds = new Set(hiddenNodeIds);

    for (const groupNode of groupNodes) {
      const groupChildren = groupNode.data.metadata?.groupChildren as string[] || [];
      
      // If all group children are hidden, hide the group too
      if (groupChildren.length > 0 && groupChildren.every(childId => hiddenNodeIds.has(childId))) {
        finalHiddenNodeIds.add(groupNode.id);
      }
    }

    // Return only visible nodes (excluding groups with all hidden children)
    return nodes.filter(node => !finalHiddenNodeIds.has(node.id));
  },

  getVisibleEdges: (): AppEdge[] => {
    const { edges, nodes } = get();
    const visibleNodes = get().getVisibleNodes();
    const visibleNodeIds = new Set(visibleNodes.map(node => node.id));
    const collapsedNodeIds = new Set(
      nodes.filter(node => node.data.metadata?.isCollapsed).map(node => node.id)
    );

    // Return edges where:
    // 1. Both source and target are visible, OR
    // 2. Source is visible and target is a collapsed node (to show connection to collapsed branch)
    return edges.filter(edge => {
      const sourceVisible = visibleNodeIds.has(edge.source);
      const targetVisible = visibleNodeIds.has(edge.target);
      const targetIsCollapsed = collapsedNodeIds.has(edge.target);
      
      return (sourceVisible && targetVisible) || (sourceVisible && targetIsCollapsed);
    });
  },

  toggleNodeCollapse: async (nodeId: string): Promise<void> => {
    const { nodes, updateNode, addStateToHistory } = get();
    const node = nodes.find(n => n.id === nodeId);

    if (!node) {
      console.error(`Node with id ${nodeId} not found`);
      return;
    }

    const currentCollapsedState = node.data.metadata?.isCollapsed ?? false;
    const newCollapsedState = !currentCollapsedState;

    // Update the node's collapse state
    await updateNode({
      nodeId,
      data: {
        metadata: {
          ...node.data.metadata,
          isCollapsed: newCollapsedState,
        },
      },
    });

    // Add to history for undo/redo
    addStateToHistory(
      newCollapsedState ? "collapseNode" : "expandNode",
      { nodes: get().nodes, edges: get().edges }
    );
  },

  // Enhanced Layout functionality
  applyAdvancedLayout: withLoadingAndToast(
    async (config: SpecificLayoutConfig) => {
      const { nodes, edges, addStateToHistory } = get();
      
      const layoutResult = LayoutAlgorithms.applyLayout(nodes, edges, config);
      
      const updatedNodes = nodes.map(node => {
        const layoutNode = layoutResult.nodes.find(ln => ln.id === node.id);
        return layoutNode ? {
          ...node,
          position: layoutNode.position
        } : node;
      });

      set({ 
        nodes: updatedNodes,
        currentLayoutConfig: config
      });

      addStateToHistory("applyLayout", { nodes: updatedNodes, edges });
    },
    "isApplyingLayout",
    {
      initialMessage: "Applying layout...",
      successMessage: "Layout applied successfully",
      errorMessage: "Failed to apply layout",
    },
  ),


  setLayoutConfig: (config: SpecificLayoutConfig) => {
    set({ currentLayoutConfig: config });
  },

  getLayoutPresets: () => {
    return LayoutAlgorithms.getLayoutPresets();
  },

  // Comment functionality
  fetchNodeComments: withLoadingAndToast(
    async (nodeId: string) => {
      const { supabase, mapId } = get();
      
      if (!mapId) {
        throw new Error("Map ID is required");
      }

      const { data: comments, error } = await supabase
        .from("node_comments")
        .select("*")
        .eq("node_id", nodeId)
        .eq("map_id", mapId)
        .order("created_at", { ascending: true });

      if (error) {
        throw new Error(error.message);
      }

      set(state => ({
        nodeComments: {
          ...state.nodeComments,
          [nodeId]: comments || []
        }
      }));
    },
    "isLoadingComments",
    {
      initialMessage: "Loading comments...",
      successMessage: "Comments loaded successfully",
      errorMessage: "Failed to load comments",
    },
  ),


  fetchMapComments: withLoadingAndToast(
    async () => {
      const { supabase, mapId } = get();
      
      if (!mapId) {
        throw new Error("Map ID is required");
      }

      const { data: comments, error } = await supabase
        .from("map_comments")
        .select("*")
        .eq("map_id", mapId)
        .order("created_at", { ascending: true });

      if (error) {
        throw new Error(error.message);
      }

      set({ mapComments: comments || [] });
    },
    "isLoadingComments",
    {
      initialMessage: "Loading map comments...",
      successMessage: "Map comments loaded successfully",
      errorMessage: "Failed to load map comments",
    },
  ),

  addNodeComment: withLoadingAndToast(
    async (nodeId: string, content: string, parentId?: string) => {
      const { supabase, mapId } = get();
      
      if (!mapId) {
        throw new Error("Map ID is required");
      }

      const user = await supabase.auth.getUser();
      if (!user.data.user) {
        throw new Error("User not authenticated");
      }

      const { data: comment, error } = await supabase
        .from("node_comments")
        .insert({
          node_id: nodeId,
          map_id: mapId,
          content,
          author_id: user.data.user.id,
          parent_comment_id: parentId,
        })
        .select("*")
        .single();

      if (error) {
        throw new Error(error.message);
      }

      set(state => ({
        nodeComments: {
          ...state.nodeComments,
          [nodeId]: [...(state.nodeComments[nodeId] || []), comment]
        }
      }));

      // Clear draft
      get().clearCommentDraft(nodeId);
    },
    "isSavingComment",
    {
      initialMessage: "Adding comment...",
      successMessage: "Comment added successfully",
      errorMessage: "Failed to add comment",
    },
  ),

  addMapComment: withLoadingAndToast(
    async (content: string, position?: { x: number; y: number }, parentId?: string) => {
      const { supabase, mapId } = get();
      
      if (!mapId) {
        throw new Error("Map ID is required");
      }

      const user = await supabase.auth.getUser();
      if (!user.data.user) {
        throw new Error("User not authenticated");
      }

      const { data: comment, error } = await supabase
        .from("map_comments")
        .insert({
          map_id: mapId,
          content,
          author_id: user.data.user.id,
          parent_comment_id: parentId,
          position,
        })
        .select("*")
        .single();

      if (error) {
        throw new Error(error.message);
      }

      set(state => ({
        mapComments: [...state.mapComments, comment]
      }));

      // Clear draft
      get().clearCommentDraft(mapId);
    },
    "isSavingComment",
    {
      initialMessage: "Adding map comment...",
      successMessage: "Map comment added successfully",
      errorMessage: "Failed to add map comment",
    },
  ),

  updateComment: withLoadingAndToast(
    async (commentId: string, content: string) => {
      const { supabase } = get();

      const { data: comment, error } = await supabase
        .from("comments")
        .update({ 
          content,
          is_edited: true,
          edited_at: new Date().toISOString()
        })
        .eq("id", commentId)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      // Update local state
      set(state => {
        const newNodeComments = { ...state.nodeComments };
        Object.keys(newNodeComments).forEach(nodeId => {
          newNodeComments[nodeId] = newNodeComments[nodeId].map(c => 
            c.id === commentId ? { ...c, ...comment } : c
          );
        });

        const newMapComments = state.mapComments.map(c => 
          c.id === commentId ? { ...c, ...comment } : c
        );

        return {
          nodeComments: newNodeComments,
          mapComments: newMapComments
        };
      });
    },
    "isSavingComment",
    {
      initialMessage: "Updating comment...",
      successMessage: "Comment updated successfully",
      errorMessage: "Failed to update comment",
    },
  ),

  deleteComment: withLoadingAndToast(
    async (commentId: string) => {
      const { supabase } = get();

      const { error } = await supabase
        .from("comments")
        .delete()
        .eq("id", commentId);

      if (error) {
        throw new Error(error.message);
      }

      // Update local state
      set(state => {
        const newNodeComments = { ...state.nodeComments };
        Object.keys(newNodeComments).forEach(nodeId => {
          newNodeComments[nodeId] = newNodeComments[nodeId].filter(c => c.id !== commentId);
        });

        const newMapComments = state.mapComments.filter(c => c.id !== commentId);

        return {
          nodeComments: newNodeComments,
          mapComments: newMapComments,
          selectedCommentId: state.selectedCommentId === commentId ? null : state.selectedCommentId
        };
      });
    },
    "isDeletingComment",
    {
      initialMessage: "Deleting comment...",
      successMessage: "Comment deleted successfully",
      errorMessage: "Failed to delete comment",
    },
  ),

  resolveComment: withLoadingAndToast(
    async (commentId: string) => {
      const { supabase } = get();

      const user = await supabase.auth.getUser();
      if (!user.data.user) {
        throw new Error("User not authenticated");
      }

      const { data: comment, error } = await supabase
        .from("comments")
        .update({ 
          is_resolved: true,
          resolved_by: user.data.user.id,
          resolved_at: new Date().toISOString()
        })
        .eq("id", commentId)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      // Update local state
      set(state => {
        const newNodeComments = { ...state.nodeComments };
        Object.keys(newNodeComments).forEach(nodeId => {
          newNodeComments[nodeId] = newNodeComments[nodeId].map(c => 
            c.id === commentId ? { ...c, ...comment } : c
          );
        });

        const newMapComments = state.mapComments.map(c => 
          c.id === commentId ? { ...c, ...comment } : c
        );

        return {
          nodeComments: newNodeComments,
          mapComments: newMapComments
        };
      });
    },
    "isSavingComment",
    {
      initialMessage: "Resolving comment...",
      successMessage: "Comment resolved successfully",
      errorMessage: "Failed to resolve comment",
    },
  ),

  unresolveComment: withLoadingAndToast(
    async (commentId: string) => {
      const { supabase } = get();

      const { data: comment, error } = await supabase
        .from("comments")
        .update({ 
          is_resolved: false,
          resolved_by: null,
          resolved_at: null
        })
        .eq("id", commentId)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      // Update local state
      set(state => {
        const newNodeComments = { ...state.nodeComments };
        Object.keys(newNodeComments).forEach(nodeId => {
          newNodeComments[nodeId] = newNodeComments[nodeId].map(c => 
            c.id === commentId ? { ...c, ...comment } : c
          );
        });

        const newMapComments = state.mapComments.map(c => 
          c.id === commentId ? { ...c, ...comment } : c
        );

        return {
          nodeComments: newNodeComments,
          mapComments: newMapComments
        };
      });
    },
    "isSavingComment",
    {
      initialMessage: "Unresolving comment...",
      successMessage: "Comment unresolved successfully",
      errorMessage: "Failed to unresolve comment",
    },
  ),

  setCommentFilter: (filter: CommentFilter) => {
    set({ commentFilter: filter });
  },

  setCommentSort: (sort: CommentSort) => {
    set({ commentSort: sort });
  },

  setSelectedComment: (commentId: string | null) => {
    set({ selectedCommentId: commentId });
  },

  updateCommentDraft: (targetId: string, content: string) => {
    set(state => ({
      commentDrafts: {
        ...state.commentDrafts,
        [targetId]: content
      }
    }));
  },

  clearCommentDraft: (targetId: string) => {
    set(state => {
      const newDrafts = { ...state.commentDrafts };
      delete newDrafts[targetId];
      return { commentDrafts: newDrafts };
    });
  },
}));

export default useAppStore;

import { defaultEdgeData } from "@/constants/default-edge-data";
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
import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  type ReactFlowInstance,
} from "@xyflow/react";
import { toast } from "sonner";
import { create } from "zustand";
import type { AppNode, AppState } from "./app-state";

// this is our useStore hook that we can use in our components to get parts of the store and call actions
const useAppStore = create<AppState>((set, get) => ({
  supabase: createClient(),
  mapId: null,
  reactFlowInstance: null,
  mindMap: null,
  nodes: [],
  selectedNodes: [],
  edges: [],
  isFocusMode: false,
  popoverOpen: {
    commandPalette: false,
    nodeType: false,
    nodeEdit: false,
    edgeEdit: false,
    history: false,
    mergeSuggestions: false,
    aiContent: false,
  },
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
  },

  // Handlers
  onNodesChange: (changes) => {
    set({
      nodes: applyNodeChanges(changes, get().nodes),
    });
  },
  onEdgesChange: (changes) => {
    set({
      edges: applyEdgeChanges(changes, get().edges),
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
  },

  // Actions
  toggleFocusMode: () => {
    set({
      isFocusMode: !get().isFocusMode,
    });
  },
  fetchMindMapData: async (mapId: string) => {
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
      throw new Error(mindMapError.message || "Failed to fetch mind map data.");
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
  addNode: async (props) => {
    let { nodeType = "defaultNode" } = props;
    const { parentNode, position, data = {}, content = "New node" } = props;
    const { mapId, supabase, nodes, edges } = get();
    const toastId = toast.loading("Adding node...");

    if (!mapId) {
      toast.loading(
        "Attempted to add node with unknown type: ${nodeType}. Falling back to 'defaultNode'.",
        { id: toastId },
      );
      nodeType = "defaultNode";
    }

    set((state) => ({
      loadingStates: { ...state.loadingStates, isAddingContent: true },
    }));

    const newNodeId = generateUuid();
    let newNode: AppNode | null = null;
    let newNodePosition = position;

    try {
      if (parentNode) {
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
      const finalEdges = parentNode?.id
        ? addEdge(
            {
              source: parentNode?.id,
              target: newNodeId,
              sourceHandle: null,
              targetHandle: null,
            },
            edges,
          )
        : edges;

      //     TODO: uncomment after implementing it in zustand
      //     addStateToHistory("addNode", { nodes: finalNodes, edges: finalEdges });
      toast.success("Node added successfully.", { id: toastId });

      set({
        nodes: finalNodes,
        edges: finalEdges,
      });
    } catch (e) {
      console.error("Error adding node:", e);
      toast.error(e instanceof Error ? e.message : "Failed to add node.", {
        id: toastId,
      });
      return;
    } finally {
      set((state) => ({
        loadingStates: { ...state.loadingStates, isAddingContent: false },
      }));
    }
  },
  updateNode: async (props) => {
    const { nodeId, data } = props;
    const { supabase } = get();
    const toastId = toast.loading("Updating node...");

    set((state) => ({
      loadingStates: { ...state.loadingStates, isUpdatingContent: true },
    }));

    try {
      const user = await supabase?.auth.getUser();
      if (!user?.data.user) throw new Error("User not authenticated.");

      const { error: updateError } = await supabase
        .from("nodes")
        .update(data)
        .eq("id", nodeId)
        .eq("user_id", user.data.user.id);

      if (updateError) {
        throw new Error(updateError.message || "Failed to update node.");
      }

      let updatedNode: AppNode | null = null;

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

      toast.success("Node updated successfully.", { id: toastId });
    } catch (e) {
      console.error("Error updating node:", e);
      toast.error(e instanceof Error ? e.message : "Failed to update node.", {
        id: toastId,
      });
      return;
    } finally {
      set((state) => ({
        loadingStates: { ...state.loadingStates, isUpdatingContent: false },
      }));
    }
  },
  deleteNodes: async (nodesToDelete: AppNode[]) => {
    const { mapId, supabase, edges, nodes: allNodes } = get();
    const toastId = toast.loading("Deleting nodes...");

    set((state) => ({
      loadingStates: { ...state.loadingStates, isUpdatingContent: true },
    }));

    if (!mapId || !nodesToDelete) return;

    const edgesToDelete = edges.filter((edge) =>
      nodesToDelete.some(
        (node) => edge.source === node.id || edge.target === node.id,
      ),
    );

    try {
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

      //     TODO: uncomment after implementing it in zustand
      //     addStateToHistory("deleteNode", { nodes: finalNodes, edges: finalEdges });
      toast.success("Nodes deleted successfully.", { id: toastId });

      set({
        nodes: finalNodes,
        edges: finalEdges,
      });
    } catch (e) {
      console.error("Error deleting nodes:", e);
      toast.error(e instanceof Error ? e.message : "Failed to delete nodes.", {
        id: toastId,
      });
      return;
    } finally {
      set((state) => ({
        loadingStates: { ...state.loadingStates, isUpdatingContent: false },
      }));
    }
  },
  addEdge: async (
    sourceId: string,
    targetId: string,
    data: Partial<EdgeData>,
  ) => {
    const { supabase, mapId, edges, nodes } = get();
    const toastId = toast.loading("Adding edge...");

    set((state) => ({
      loadingStates: { ...state.loadingStates, isAddingContent: true },
    }));

    try {
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

      //     TODO: uncomment after implementing it in zustand
      //     addStateToHistory("addEdge", { edges: finalEdges, nodes: nodes });

      toast.success("Edge added successfully.", { id: toastId });
    } catch (e) {
      console.error("Error adding edge:", e);
      toast.error(e instanceof Error ? e.message : "Failed to add edge.", {
        id: toastId,
      });
      return;
    } finally {
      set((state) => ({
        loadingStates: { ...state.loadingStates, isAddingContent: false },
      }));
    }
  },
  deleteEdges: async (edgesToDelete: AppEdge[]) => {
    const { supabase, mapId, edges, nodes } = get();
    const toastId = toast.loading("Deleting edge...");

    set((state) => ({
      loadingStates: { ...state.loadingStates, isUpdatingContent: true },
    }));

    try {
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

      //     TODO: uncomment after implementing it in zustand
      //     addStateToHistory("deleteEdge", { edges: finalEdges, nodes: nodes });

      toast.success("Edge deleted successfully.", { id: toastId });
    } catch (e) {
      console.error("Error deleting edge:", e);
      toast.error(e instanceof Error ? e.message : "Failed to delete edge.", {
        id: toastId,
      });
      return;
    } finally {
      set((state) => ({
        loadingStates: { ...state.loadingStates, isUpdatingContent: false },
      }));
    }
  },
  updateEdge: async (props: { edgeId: string; data: Partial<EdgeData> }) => {
    const { supabase, mapId, edges } = get();
    const toastId = toast.loading("Updating edge...");

    set((state) => ({
      loadingStates: { ...state.loadingStates, isUpdatingContent: true },
    }));

    try {
      if (!mapId) {
        throw new Error("Cannot update edge: Map ID missing.");
      }

      const user = await supabase?.auth.getUser();
      if (!user?.data.user) throw new Error("User not authenticated.");

      const { data: dbEdgeData, error: updateError } = await supabase
        .from("edges")
        .update(props.data)
        .eq("id", props.edgeId)
        .select("*")
        .single();

      if (updateError) {
        throw new Error(updateError.message || "Failed to update edge.");
      }

      const finalEdges = edges.map((edge) => {
        if (edge.id === props.edgeId) {
          return {
            ...dbEdgeData,
            label: dbEdgeData.label,
            animated: JSON.parse(String(dbEdgeData.animated)),
            markerEnd: dbEdgeData.markerEnd,
            style: {
              ...edge.style,
              ...dbEdgeData.style,
            },
            markerStart: dbEdgeData.markerStart,

            data: {
              ...edge.data,
              ...dbEdgeData,
            },
          } as AppEdge;
        }

        return edge;
      });

      set({
        edges: finalEdges,
      });

      //     TODO: uncomment after implementing it in zustand
      //     addStateToHistory("updateEdge", { edges: finalEdges, nodes: nodes });

      toast.success("Edge updated successfully.", { id: toastId });
    } catch (e) {
      console.error("Error updating edge:", e);
      toast.error(e instanceof Error ? e.message : "Failed to update edge.", {
        id: toastId,
      });
      return;
    } finally {
      set((state) => ({
        loadingStates: { ...state.loadingStates, isUpdatingContent: false },
      }));
    }
  },
}));

export default useAppStore;

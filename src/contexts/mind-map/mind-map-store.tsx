import generateUuid from "@/helpers/generate-uuid";
import { createClient } from "@/helpers/supabase/client";
import { transformSupabaseData } from "@/helpers/transform-supabase-data";
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
    set({
      edges: addEdge(connection, get().edges),
    });
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
}));

export default useAppStore;

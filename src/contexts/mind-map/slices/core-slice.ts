import { createClient } from "@/helpers/supabase/client";
import { transformSupabaseData } from "@/helpers/transform-supabase-data";
import withLoadingAndToast from "@/helpers/with-loading-and-toast";
import type { EdgesTableType } from "@/types/edges-table-type";
import type { MindMapData } from "@/types/mind-map-data";
import type { NodesTableType } from "@/types/nodes-table-type";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { ReactFlowInstance } from "@xyflow/react";
import type { StateCreator } from "zustand";
import type { AppState } from "../app-state";

export type CoreDataSlice = {
  supabase: SupabaseClient;
  mindMap: MindMapData | null;
  mapId: string | null;
  reactFlowInstance: ReactFlowInstance | null;
  currentUser: User | null;

  setMindMap: (mindMap: MindMapData | null) => void;
  setReactFlowInstance: (reactFlowInstance: ReactFlowInstance | null) => void;
  setMapId: (mapId: string | null) => void;
  setCurrentUser: (currentUser: User | null) => void;

  getCurrentUser: () => Promise<User | null>;
  centerOnNode: (nodeId: string) => void;

  fetchMindMapData: (mapId: string) => Promise<void>;
};

export const createCoreDataSlice: StateCreator<
  AppState,
  [],
  [],
  CoreDataSlice
> = (set, get) => ({
  // Initial state
  supabase: createClient(),
  mapId: null,
  reactFlowInstance: null,
  mindMap: null,
  currentUser: null,

  // Actions
  setMindMap: (mindMap) => set({ mindMap }),
  setReactFlowInstance: (reactFlowInstance) => set({ reactFlowInstance }),
  setMapId: (mapId) => set({ mapId }),
  setCurrentUser: (currentUser) => set({ currentUser }),

  getCurrentUser: async () => {
    const { data } = await get().supabase.auth.getUser();
    const currentUser = data?.user;

    set({ currentUser });

    return currentUser;
  },

  centerOnNode: (nodeId: string) => {
    const { reactFlowInstance, nodes } = get();

    if (!reactFlowInstance) {
      console.warn("ReactFlow instance not available");
      return;
    }

    const node = nodes.find((n) => n.id === nodeId);

    if (!node) {
      console.warn(`Node with id ${nodeId} not found`);
      return;
    }

    // Center the view on the node with smooth animation
    reactFlowInstance.setCenter(
      node.position.x + (node.width || 0) / 2,
      node.position.y + (node.height || 0) / 2,
      { zoom: 1.2, duration: 800 },
    );
    reactFlowInstance.updateNode(nodeId, { selected: true });
    get().setSelectedNodes([node]);
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
});

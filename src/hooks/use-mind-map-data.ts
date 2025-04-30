import { useState, useEffect, useCallback } from "react"; // Import useCallback
import { createClient } from "@/helpers/supabase/client";
import { transformDataToReactFlow } from "@/helpers/transform-data-to-react-flow";
import { MindMapData } from "@/types/mind-map-data";
import { NodeData } from "@/types/node-data";
import { Node } from "@xyflow/react";
import { useNotifications } from "./use-notifications";
import { EdgeData } from "@/types/edge-data"; // Import EdgeData and AppEdge
import { AppEdge } from "@/types/app-edge";

interface UseMindMapDataResult {
  mindMap: MindMapData | null;
  initialNodes: Node<NodeData>[];
  initialEdges: AppEdge[]; // Use AppEdge for initial edges
  isLoading: boolean;
  error: string | null;
  fetchMindMapData: () => Promise<void>; // Make async
}

export function useMindMapData(
  mapId: string | undefined,
): UseMindMapDataResult {
  const [mindMap, setMindMap] = useState<MindMapData | null>(null);
  const [initialNodes, setInitialNodes] = useState<Node<NodeData>[]>([]);
  const [initialEdges, setInitialEdges] = useState<AppEdge[]>([]); // Use AppEdge
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { showNotification } = useNotifications();
  const supabase = createClient();

  const fetchMindMapData = useCallback(async () => {
    // Wrap in useCallback
    if (!mapId) {
      setError("Map ID is missing.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    setMindMap(null);
    setInitialNodes([]);
    setInitialEdges([]);

    try {
      // --- Fetch Mind Map Data ---
      const { data: mapData, error: mapError } = await supabase
        .from("mind_maps")
        .select("*")
        .eq("id", mapId)
        .single();

      if (mapError || !mapData) {
        // Check for 'Row not found' explicitly if needed for 404, otherwise treat as error
        if (mapError?.code === "PGRST116") {
          // Supabase code for 'Row not found'
          throw new Error("Mind map not found.");
        }
        throw new Error(mapError?.message || "Failed to fetch mind map.");
      }
      setMindMap(mapData);

      // --- Fetch Nodes ---
      const { data: nodesData, error: nodesError } = await supabase
        .from("nodes")
        .select("*") // Fetch all columns including new style/metadata
        .eq("map_id", mapId);

      if (nodesError) {
        throw new Error(nodesError.message || "Failed to load mind map nodes.");
      }

      // --- Fetch Edges (from the new 'edges' table) ---
      const { data: edgesData, error: edgesError } = await supabase
        .from("edges")
        .select("*") // Fetch all columns including type, label, style, color
        .eq("map_id", mapId);

      if (edgesError) {
        // Log error but don't necessarily fail if nodes loaded
        console.error("Error fetching edges:", edgesError);
        // Optionally show a warning notification
        showNotification("Warning: Failed to load some connections.", "error");
      }

      // Transform fetched data into React Flow format
      const transformedData = transformDataToReactFlow(
        (nodesData as NodeData[]) || [], // Ensure nodesData is an array
        (edgesData as EdgeData[]) || [], // Ensure edgesData is an array
      );

      setInitialNodes(transformedData.reactFlowNodes);
      setInitialEdges(transformedData.reactFlowEdges);

      showNotification("Mind map loaded.", "success");
    } catch (err: unknown) {
      // Use unknown
      console.error("Error fetching mind map data:", err);
      const message =
        err instanceof Error
          ? err.message
          : "An unexpected error occurred loading the map.";
      setError(message);
      showNotification(message, "error");
    } finally {
      setIsLoading(false);
    }
    // Add dependencies for useCallback
  }, [mapId, supabase, showNotification]);

  useEffect(() => {
    fetchMindMapData();
  }, [fetchMindMapData]); // Depend on the memoized fetch function

  return {
    mindMap,
    initialNodes,
    initialEdges,
    isLoading,
    error,
    fetchMindMapData,
  };
}

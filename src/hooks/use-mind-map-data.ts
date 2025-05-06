import { createClient } from "@/helpers/supabase/client";
import { transformSupabaseData } from "@/helpers/transform-supabase-data";
import { useNotifications } from "@/hooks/use-notifications";
import { AppEdge } from "@/types/app-edge";
import type { EdgeData } from "@/types/edge-data";
import { MindMapData } from "@/types/mind-map-data";
import { NodeData } from "@/types/node-data";
import { SupabaseClient } from "@supabase/supabase-js";
import { Node } from "@xyflow/react";
import { useEffect, useState } from "react";
import useSWR from "swr"; // Import useSWR

type NodesTableType = NodeData & { user_id: string };
type EdgesTableType = EdgeData & { user_id: string };

interface UseMindMapDataResult {
  mindMap: MindMapData | null; // SWR data can be undefined initially
  initialNodes: Node<NodeData>[];
  initialEdges: AppEdge[];
  isLoading: boolean;
  error: string | null | undefined; // SWR error can be an object or string
  fetchMindMapData: () => void; // This will now use SWR's mutate
}

// Define a fetcher function for SWR
const fetcher = async (
  mapId: string,
  supabase: SupabaseClient,
): Promise<{
  mindMap: MindMapData;
  initialNodes: Node<NodeData>[];
  initialEdges: AppEdge[];
}> => {
  if (!mapId) {
    throw new Error("Map ID is required.");
  }

  const { data: mindMapData, error: mindMapError } = await supabase
    .from("mind_maps")
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

  return {
    mindMap: transformedData.mindMap,
    initialNodes: transformedData.reactFlowNodes,
    initialEdges: transformedData.reactFlowEdges,
  };
};

export function useMindMapData(
  mapId: string | undefined,
): UseMindMapDataResult {
  const supabase = createClient();
  const { showNotification } = useNotifications();

  // Use SWR for data fetching
  const {
    data,
    error: swrError,
    isLoading,
    mutate,
  } = useSWR(mapId ? `/maps/${mapId}` : null, () => fetcher(mapId!, supabase), {
    onError: (err) => {
      console.error("SWR Error fetching mind map data:", err);
      const message =
        err instanceof Error
          ? err.message
          : "An unexpected error occurred loading the map.";
      showNotification(message, "error");
    },
    // onSuccess: () => {
    //   showNotification("Mind map loaded.", "success"); // Optional: if you want a notification on successful load/revalidation
    // }
  });

  // States derived from SWR's response
  const [initialNodes, setInitialNodes] = useState<Node<NodeData>[]>([]);
  const [initialEdges, setInitialEdges] = useState<AppEdge[]>([]);

  useEffect(() => {
    if (data) {
      setInitialNodes(data.initialNodes);
      setInitialEdges(data.initialEdges);
    }
  }, [data]);

  const fetchMindMapData = () => {
    if (mapId) {
      mutate(); // Trigger revalidation
    }
  };

  const errorString = swrError
    ? swrError instanceof Error
      ? swrError.message
      : String(swrError)
    : null;

  return {
    mindMap: data?.mindMap ?? null,
    initialNodes,
    initialEdges,
    isLoading,
    error: errorString,
    fetchMindMapData,
  };
}

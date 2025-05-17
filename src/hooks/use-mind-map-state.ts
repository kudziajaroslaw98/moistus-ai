import { createClient } from "@/helpers/supabase/client";
import { transformSupabaseData } from "@/helpers/transform-supabase-data";
import { AppEdge } from "@/types/app-edge";
import { EdgeData } from "@/types/edge-data";
import { MindMapData } from "@/types/mind-map-data";
import { NodeData } from "@/types/node-data";
import { SupabaseClient } from "@supabase/supabase-js";
import {
  Connection,
  EdgeChange,
  Node,
  NodeChange,
  OnEdgesChange,
  OnNodesChange,
  useEdgesState,
  useNodesState,
} from "@xyflow/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import useSWR from "swr";

interface UseMindMapStateResult {
  mindMap: MindMapData | null;
  nodes: Node<NodeData>[];
  setNodes: React.Dispatch<React.SetStateAction<Node<NodeData>[]>>;
  onNodesChange: OnNodesChange;
  edges: AppEdge[];
  setEdges: React.Dispatch<React.SetStateAction<AppEdge[]>>;
  onEdgesChange: OnEdgesChange;
  onConnect: (params: Connection) => void;
  isStateLoading: boolean;
  stateError?: Error | string | null;
}

interface NodesTableType extends NodeData {
  user_id: string;
}

interface EdgesTableType extends EdgeData {
  user_id: string;
}

const fetchMindMapData = async (
  mapId: string,
  supabase: SupabaseClient,
): Promise<{
  mindMap: MindMapData;
  nodes: Node<NodeData>[];
  edges: AppEdge[];
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
    nodes: transformedData.reactFlowNodes,
    edges: transformedData.reactFlowEdges,
  };
};

export function useMindMapState(
  mapId: string | undefined,
): UseMindMapStateResult {
  const [isDataFetching, setIsDataFetching] = useState(true);
  const [mindMapData, setMindMapData] = useState<MindMapData | null>(null);
  const [nodes, setNodes, onNodesChangeDirect] = useNodesState<Node<NodeData>>(
    [],
  );
  const [edges, setEdges, onEdgesChangeDirect] = useEdgesState<AppEdge>([]);
  const toastIdRef = useRef<string | number | undefined>(undefined);
  const supabase = createClient();
  const {
    data: fetchedMindMapData,
    error: swrError,
    isLoading,
  } = useSWR(
    mapId ? `/maps/${mapId}` : null,
    () => fetchMindMapData(mapId!, supabase),
    {
      onError: (err) => {
        console.error("SWR Error fetching mind map data:", err);
        const message =
          err instanceof Error
            ? err.message
            : "An unexpected error occurred loading the map.";
        toast.error(message);
      },
    },
  );

  useEffect(() => {
    if (isLoading && toastIdRef.current === undefined) {
      toastIdRef.current = toast.loading("Loading mind map...");
    } else if (!isLoading && fetchedMindMapData && isDataFetching) {
      toast.success("Mind map loaded.", { id: toastIdRef.current });
      setNodes(fetchedMindMapData.nodes);
      setEdges(fetchedMindMapData.edges);
      setMindMapData(fetchedMindMapData.mindMap);
      setIsDataFetching(false);
    }
  }, [isLoading]);

  const errorString = swrError
    ? swrError instanceof Error
      ? swrError.message
      : String(swrError)
    : null;

  useEffect(() => {
    if (!isLoading && swrError) {
      if (errorString) {
        toast.error(errorString);
      }
    }
  }, [isLoading, swrError, errorString]);

  const onNodesChange: OnNodesChange = useCallback(
    (changes: NodeChange[]) => {
      onNodesChangeDirect(changes as NodeChange<Node<NodeData>>[]);
    },
    [onNodesChangeDirect],
  );

  const onEdgesChange: OnEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      onEdgesChangeDirect(changes as EdgeChange<AppEdge>[]);
    },
    [onEdgesChangeDirect],
  );

  const onConnect = useCallback((params: Connection) => {
    console.log("onConnect called with:", params);
  }, []);

  return {
    mindMap: mindMapData,
    nodes: nodes as Node<NodeData>[],
    setNodes: setNodes as React.Dispatch<
      React.SetStateAction<Node<NodeData>[]>
    >,
    onNodesChange,
    edges: edges as AppEdge[],
    setEdges: setEdges as React.Dispatch<React.SetStateAction<AppEdge[]>>,
    isStateLoading: isLoading || isDataFetching,
    stateError: errorString,
    onEdgesChange,
    onConnect,
  };
}

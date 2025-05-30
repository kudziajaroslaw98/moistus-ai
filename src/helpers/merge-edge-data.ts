import type { EdgeData } from "@/types/edge-data";

function mergeEdgeData(
  defaultEdge: Partial<EdgeData>,
  newEdge: Partial<EdgeData>,
): Partial<EdgeData> {
  return {
    ...defaultEdge,
    ...newEdge,
    style: {
      ...defaultEdge.style,
      ...newEdge.style,
    },
    aiData: {
      ...defaultEdge.aiData,
      ...newEdge.aiData,
    },
    metadata: {
      ...defaultEdge.metadata,
      ...newEdge.metadata,
    },
  };
}

export default mergeEdgeData;

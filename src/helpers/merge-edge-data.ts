import type { EdgeData } from "@/types/edge-data";

function mergeEdgeData(
  defaultEdge: Partial<EdgeData>,
  newEdge: Partial<EdgeData>,
): Partial<EdgeData> {
  return {
    ...defaultEdge,
    ...newEdge,
    // @ts-expect-error TODO: inspect later
    style: {
      ...defaultEdge.style,
      ...newEdge.style,
    },
    aiData: {
      ...defaultEdge.aiData,
      ...newEdge.aiData,
    },
    // @ts-expect-error TODO: inspect later
    metadata: {
      ...defaultEdge.metadata,
      ...newEdge.metadata,
    },
  };
}

export default mergeEdgeData;

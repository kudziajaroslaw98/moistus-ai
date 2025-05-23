import generateUuid from "@/helpers/generate-uuid";
import type { EdgeData } from "@/types/edge-data";

export function defaultEdgeData(): Omit<EdgeData, "map_id" | "user_id"> {
  return {
    id: generateUuid(),
    style: {
      stroke: "#6c757d",
      strokeWidth: "2px",
    },
    aiData: {},
    metadata: {
      isParentLink: false,
      pathType: "bezier",
    },
    type: "floatingEdge",
    created_at: new Date().toUTCString(),
    updated_at: new Date().toUTCString(),
    animated: false,
  } as Omit<EdgeData, "map_id" | "user_id">;
}

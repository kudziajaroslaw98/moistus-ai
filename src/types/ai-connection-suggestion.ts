import { Edge } from "@xyflow/react";

export interface AiConnectionSuggestion extends Edge<Record<string, unknown>> {
  sourceNodeId: string;
  targetNodeId: string;
  reason?: string;
}

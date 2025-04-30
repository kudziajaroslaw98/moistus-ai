export interface EdgeData extends Record<string, unknown> {
  id: string; // Database ID for the edge
  map_id: string; // ID of the map the edge belongs to
  source: string; // Source node ID
  target: string; // Target node ID
  type?: string; // React Flow edge type (e.g., 'smoothstep', 'straight', 'step', or custom types)
  label?: string; // Optional label for the edge
  color?: string; // Optional color for the edge
  style?: React.CSSProperties; // Optional custom CSS style object
  animated?: boolean; // Whether the edge is animated
  markerEnd?: string; // ID of the marker to use at the end
  created_at?: string;
  updated_at?: string;

  // Properties for suggested edges (could be a union type, but adding here for simplicity)
  reason?: string; // For suggested connections
  sourceNodeId?: string; // For suggested connections (redundant with source, but kept for compatibility with AiConnectionSuggestion)
  targetNodeId?: string; // For suggested connections (redundant with target, but kept for compatibility with AiConnectionSuggestion)
}

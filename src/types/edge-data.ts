export interface EdgeData extends Record<string, unknown> {
  id: string; // Database ID for the edge
  map_id: string; // ID of the map the edge belongs to
  user_id: string; // User ID who created the edge (or owns the map)
  source: string; // Source node ID
  target: string; // Target node ID
  type?: string; // React Flow edge type (e.g., 'smoothstep', 'straight', 'step', or custom types)
  label?: string; // Optional label for the edge
  animated?: boolean; // Whether the edge is animated
  markerEnd?: string; // ID of the marker to use at the end
  created_at?: string;
  updated_at?: string;
  color?: string; // Optional color (redundant if using style.stroke, but kept for flexibility/simplicity)
  strokeWidth?: number; // Optional stroke width
  metadata?: {
    [key: string]: unknown;
  };
  isSuggested?: boolean; // Flag to indicate if this is a temporary suggested edge
  reason?: string; // For suggested connections
}

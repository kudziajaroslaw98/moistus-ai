export interface NodeData extends Record<string, unknown> {
  id: string;
  map_id: string;
  parent_id: string | null;
  content: string; // Now stores rich text HTML
  position_x: number;
  position_y: number;
  node_type?: string; // Added node_type
  metadata?: {
    [key: string]: unknown; // Use a more specific type if you define metadata structure
    url?: string; // Optional URL
    isComplete?: boolean; // Optional flag to indicate if the node is complete
    image_url?: string; // Optional image URL
    // Example: customData?: { [key: string]: unknown };
    // Example: tags?: string[];
    // Example: attributes?: { [key: string]: unknown };
  }; // Use a more specific type if you define metadata structure
  created_at: string;
  updated_at: string;
  // Add frontend-specific flags
  isSearchResult?: boolean;
  // Add styling properties
  backgroundColor?: string;
  borderColor?: string;
  color?: string;
}

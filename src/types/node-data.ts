export interface NodeData extends Record<string, unknown> {
  id: string;
  map_id: string;
  parent_id: string | null; // This might become obsolete if edges table is the source of truth for parent-child relationships, but useful for tree-like structures. Keep for now.
  content: string | null; // Now stores rich text HTML
  position_x: number;
  position_y: number;
  node_type?: string; // Added node_type
  width?: number | null; // Add width property
  height?: number | null; // Add height property

  // --- General Node Properties ---
  // These should ideally be separate columns in the 'nodes' table for easier querying/indexing
  // Adding here for data structure clarity, assuming they map to DB columns or are stored in metadata
  tags?: string[] | null; // For categorization, filtering, search (Could be separate table in DB)
  status?: string | null; // e.g., 'draft', 'completed', 'in-progress'
  importance?: number | null; // e.g., 1-5 or 'high', 'medium', 'low'
  sourceUrl?: string | null; // Link to external information
  // createdByAi?: boolean; // Flag to track AI generation - maybe infer from content source? Or add to metadata

  // --- AI-Specific Data ---
  // These would ideally be separate columns or handled via extensions (like vector for embeddings)
  embedding?: number[]; // Vector embedding for semantic search
  aiSummary?: string; // Stored summary
  extractedConcepts?: string[]; // Stored extracted concepts

  // --- Type-Specific Metadata (JSONB) ---
  // This is the JSONB column. We can add common/optional keys here for better intellisense,
  // but the DB column is general and can hold anything based on `node_type`.
  metadata?: {
    [key: string]: unknown; // Flexible JSONB storage

    // TaskNode
    isComplete?: boolean;
    dueDate?: string; // ISO date string or similar
    priority?: string | number; // Task priority

    // ResourceNode
    url?: string; // The main resource URL
    faviconUrl?: string; // Automatically fetched favicon
    thumbnailUrl?: string; // Automatically generated/fetched thumbnail
    summary?: string; // AI-generated summary of the resource itself
    showThumbnail?: boolean;
    showSummary?: boolean;

    // ImageNode
    imageUrl?: string; // The main image URL
    altText?: string;
    caption?: string; // Optional text caption for the image
    showCaption?: boolean;

    // QuestionNode
    answer?: string; // Answer to the question

    // AnnotationNode
    fontSize?: number | string; // e.g., 12, '1rem', 'small'
    fontWeight?: string | number; // e.g., 'normal', 'bold', 400, 700
    targetNodeId?: string; // If this annotation is linked to another specific node
    annotationType?: "comment" | "idea" | "quote" | "summary"; // e.g., 'comment', 'idea', 'todo', 'question'
    // Add other specific metadata for your custom node types
  } | null;

  created_at: string;
  updated_at: string;

  // Add frontend-specific flags
  isSearchResult?: boolean;
}

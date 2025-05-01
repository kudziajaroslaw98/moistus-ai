export interface MindMapData {
  id: string;
  user_id: string;
  title: string;
  // --- Additional Map Properties ---
  // These should ideally be separate columns in the 'mind_maps' table
  description: string | null; // A longer description
  tags?: string[]; // For categorization/searching maps (Could be separate table)
  visibility?: "private" | "public" | "shared"; // Access control level
  // sharedWith?: string[]; // Array of user IDs or a separate table for sharing details
  thumbnailUrl?: string | null; // URL to an auto-generated preview image

  created_at: string;
  updated_at: string;
}

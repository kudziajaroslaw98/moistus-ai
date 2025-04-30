import { SupabaseClient } from "@supabase/supabase-js"; // Import SupabaseClient type

export const deleteNodeAndDescendants = async (
  nodeId: string,
  supabase: SupabaseClient, // Accept Supabase client instance
) => {
  // This assumes you have ON DELETE CASCADE set up for the parent_id foreign key
  // in your Supabase 'nodes' table. If not, you'll need a more complex recursive
  // deletion logic here or in a Supabase function.
  const { error } = await supabase.from("nodes").delete().eq("id", nodeId);

  if (error) {
    console.error("Error deleting node and descendants:", error);
    // Rethrow or handle error appropriately
    throw error; // Rethrow to allow catching in the calling hook
  }
};

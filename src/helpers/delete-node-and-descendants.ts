import { SupabaseClient } from "@supabase/supabase-js";

export const deleteNodeById = async (
  nodeId: string,
  supabase: SupabaseClient,
) => {
  const { error } = await supabase.from("nodes").delete().eq("id", nodeId);

  if (error) {
    console.error("Error deleting node and descendants:", error);

    throw error;
  }
};

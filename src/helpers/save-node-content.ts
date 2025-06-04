import { createClient } from "./supabase/client";

export const saveNodeContent = async (nodeId: string, content: string) => {
  const supabase = createClient();

  const trimmedContent = content.trim();
  const { error } = await supabase
    .from("nodes")
    .update({ content: trimmedContent, updated_at: new Date().toISOString() })
    .eq("id", nodeId);

  if (error) {
    console.error("Error saving node content:", error);
  }
};

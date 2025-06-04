import { NodeData } from "@/types/node-data";
import { createClient } from "./supabase/client";

export async function saveNodeData(
  nodeId: string,
  updatedData: Partial<NodeData>,
): Promise<void> {
  const supabase = createClient();

  const { data: currentNode, error: fetchError } = await supabase
    .from("nodes")
    .select("data")
    .eq("id", nodeId)
    .single();

  if (fetchError) {
    console.error("Error fetching current node data:", fetchError);
    throw new Error("Failed to fetch current node data for saving.");
  }

  const mergedMetadata = {
    ...(currentNode?.data?.metadata || {}),
    ...(updatedData.metadata || {}),
  };

  const dataToUpdate: Partial<NodeData> = {
    updated_at: new Date().toISOString(),
  };

  if (updatedData.content !== undefined) {
    dataToUpdate.data = {
      ...(currentNode?.data || {}),
      content: updatedData.content,
      label: updatedData.content,
      metadata: mergedMetadata,
    };
  } else {
    dataToUpdate.data = {
      ...(currentNode?.data || {}),
      metadata: mergedMetadata,
    };
  }

  const { error: updateError } = await supabase
    .from("nodes")
    .update(dataToUpdate)
    .eq("id", nodeId);

  if (updateError) {
    console.error("Error saving node data:", updateError);
    throw new Error("Failed to save node data.");
  }
}

import { supabaseClient } from "@/helpers/supabase/client";
import { NodeData } from "@/types/node-data";

export async function saveNodeData(nodeId: string, updatedData: Partial<NodeData>): Promise<void> {
  const supabase = supabaseClient;

  // Fetch the current node data to merge metadata
  const { data: currentNode, error: fetchError } = await supabase
    .from("nodes")
    .select("data")
    .eq("id", nodeId)
    .single();

  if (fetchError) {
    console.error("Error fetching current node data:", fetchError);
    throw new Error("Failed to fetch current node data for saving.");
  }

  // Merge existing metadata with updated metadata
  const mergedMetadata = {
    ...(currentNode?.data?.metadata || {}), // Existing metadata
    ...(updatedData.metadata || {}), // New metadata from the form
  };

  // Prepare the data to update
  const dataToUpdate: any = {
    updated_at: new Date().toISOString(),
  };

  if (updatedData.content !== undefined) {
    dataToUpdate.data = {
      ...(currentNode?.data || {}), // Keep existing data fields
      content: updatedData.content,
      label: updatedData.content, // Update label for minimap
      metadata: mergedMetadata, // Include merged metadata
    };
  } else {
     // If content is not being updated, just update metadata
     dataToUpdate.data = {
        ...(currentNode?.data || {}), // Keep existing data fields
        metadata: mergedMetadata, // Include merged metadata
     };
     // Ensure label is still based on content if content wasn't updated
     if (currentNode?.data?.content !== undefined) {
         dataToUpdate.data.label = currentNode.data.content;
     }
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

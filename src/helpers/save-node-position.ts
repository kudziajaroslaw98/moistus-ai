import { createClient } from "@/helpers/supabase/client";
import { XYPosition } from "@xyflow/react";

/**
 * Saves the position of a node to the database.
 * @param nodeId The ID of the node to save.
 * @param position The new position of the node.
 */
export async function saveNodePosition(nodeId: string, position: XYPosition): Promise<void> {
  const supabase = createClient();

  // Ensure user is authenticated before attempting to save
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    console.error("User not authenticated. Cannot save node position.");
    // Depending on your app's flow, you might want to redirect or show an error
    throw new Error("Authentication required to save node position.");
  }

  const { error } = await supabase
    .from('nodes') // Assuming your nodes table is named 'nodes'
    .update({ position: position }) // Update the 'position' column
    .eq('id', nodeId) // Where the node id matches
    .eq('user_id', user.id); // Ensure the node belongs to the authenticated user

  if (error) {
    console.error("Error saving node position:", error);
    throw error; // Re-throw the error for the caller to handle
  }

  console.log(`Node position saved successfully for node ${nodeId}`);
}

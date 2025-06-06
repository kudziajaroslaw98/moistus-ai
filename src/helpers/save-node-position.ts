import { createClient } from '@/helpers/supabase/client';
import { XYPosition } from '@xyflow/react';

/**
 * Saves the position of a node to the database.
 * @param nodeId The ID of the node to save.
 * @param position The new position of the node.
 */
export async function saveNodePosition(
	nodeId: string,
	position: XYPosition
): Promise<void> {
	const supabase = createClient();

	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) {
		console.error('User not authenticated. Cannot save node position.');

		throw new Error('Authentication required to save node position.');
	}

	const { error } = await supabase
		.from('nodes')
		.update({ position: position })
		.eq('id', nodeId)
		.eq('user_id', user.id);

	if (error) {
		console.error('Error saving node position:', error);
		throw error;
	}

	console.log(`Node position saved successfully for node ${nodeId}`);
}

import { respondError, respondSuccess } from '@/helpers/api/responses';
import { createClient } from '@/helpers/supabase/server';

export async function DELETE(
	req: Request,
	{ params }: { params: Promise<{ id: string }> }
) {
	const supabaseServer = await createClient();

	try {
		console.log('before');
		const { id: mapId } = await params;

		// Get the authenticated user
		const {
			data: { user },
			error: userError,
		} = await supabaseServer.auth.getUser();

		if (userError || !user) {
			return respondError(
				'User not authenticated',
				401,
				'User not authenticated'
			);
		}

		console.log('before2');

		const { error: deleteError } = await supabaseServer
			.from('mind_maps')
			.delete()
			.eq('id', mapId)
			.eq('user_id', user.id); // Ensure the user owns the map

		console.log('before3');

		if (deleteError) {
			console.error('Error deleting mind map:', deleteError);

			if (deleteError.code === 'PGRST116') {
				return respondError(
					'Mind map not found or not owned by user.',
					404,
					'Mind map not found.'
				);
			}

			return respondError('Error deleting mind map.', 500, deleteError.message);
		}

		console.log('before4');

		// If deletion is successful (and ON DELETE CASCADE is set up for nodes)
		return respondSuccess(
			{ message: 'Mind map deleted successfully.' },
			200,
			'Mind map deleted successfully.'
		);
	} catch (error) {
		console.error('Error in DELETE /api/maps/[id]:', error);
		return respondError(
			'Error deleting mind map.',
			500,
			'Internal server error.'
		);
	}
}

import { createClient } from '@/helpers/supabase/server';
import { NextResponse } from 'next/server';

interface RouteParams {
	params: {
		tokenId: string;
	};
}

export async function DELETE(request: Request, { params }: RouteParams) {
	try {
		const supabase = await createClient();
		const { tokenId } = params;

		// Verify authentication
		const {
			data: { user },
			error: authError,
		} = await supabase.auth.getUser();

		if (authError || !user) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		// Get the share token and verify ownership
		const { data: shareToken, error: tokenError } = await supabase
			.from('share_tokens')
			.select(
				`
        id,
        map_id,
        created_by,
        is_active,
        mind_maps!inner(id, user_id)
      `
			)
			.eq('id', tokenId)
			.single();

		if (tokenError || !shareToken) {
			return NextResponse.json(
				{ error: 'Share token not found' },
				{ status: 404 }
			);
		}

		// Check if user has permission to revoke this token
		const isOwner = shareToken.mind_maps.find(
			(map) => map.id === shareToken.id && map.user_id === user.id
		);
		const isCreator = shareToken.created_by === user.id;

		if (!isOwner && !isCreator) {
			// Check if user has sharing permissions through existing shares
			const { data: shareData } = await supabase
				.from('mind_map_shares')
				.select('can_edit')
				.eq('map_id', shareToken.map_id)
				.eq('user_id', user.id)
				.single();

			if (!shareData?.can_edit) {
				return NextResponse.json(
					{ error: 'Permission denied' },
					{ status: 403 }
				);
			}
		}

		// Check if token is already inactive
		if (!shareToken.is_active) {
			return NextResponse.json(
				{ error: 'Share token is already inactive' },
				{ status: 400 }
			);
		}

		// Deactivate the share token
		const { error: updateError } = await supabase
			.from('share_tokens')
			.update({
				is_active: false,
				updated_at: new Date().toISOString(),
			})
			.eq('id', tokenId);

		if (updateError) {
			console.error('Error revoking share token:', updateError);
			return NextResponse.json(
				{ error: 'Failed to revoke room code' },
				{ status: 500 }
			);
		}

		// Log the revocation
		try {
			await supabase.from('share_access_logs').insert({
				share_token_id: tokenId,
				user_id: user.id,
				access_type: 'leave',
				metadata: {
					action: 'revoked',
					revoked_by: user.id,
					timestamp: new Date().toISOString(),
				},
			});
		} catch (logError) {
			console.error('Error logging revocation:', logError);
			// Don't fail the request for logging errors
		}

		return NextResponse.json({
			success: true,
			message: 'Room code revoked successfully',
		});
	} catch (error) {
		console.error('Error in revoke-room-code:', error);
		return NextResponse.json(
			{ error: 'Internal server error' },
			{ status: 500 }
		);
	}
}

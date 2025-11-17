import { createClient } from '@/helpers/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
	try {
		const supabase = await createClient();

		// Get the current user
		const {
			data: { user },
			error: authError,
		} = await supabase.auth.getUser();

		if (authError || !user) {
			return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
		}

		// Fetch mind maps count
		const { count: mindMapsCount, error: mapsError } = await supabase
			.from('mind_maps')
			.select('*', { count: 'exact', head: true })
			.eq('user_id', user.id);

		if (mapsError) {
			console.error('Error fetching mind maps count:', mapsError);
		}

		// Fetch unique collaborators count (users who have accessed maps shared by this user)
		// First, get all map IDs for this user
		const { data: userMaps, error: userMapsError } = await supabase
			.from('mind_maps')
			.select('id')
			.eq('user_id', user.id);

		let uniqueCollaborators = 0;

		if (userMapsError) {
			console.error('Error fetching user maps for collaborators:', userMapsError);
		} else if (userMaps && userMaps.length > 0) {
			// Extract map IDs
			const mapIds = userMaps.map((map) => map.id);

			// Fetch share access data for these maps
			const { data: shareAccessData, error: shareError } = await supabase
				.from('share_access')
				.select('user_id')
				.in('map_id', mapIds)
				.neq('user_id', user.id); // Exclude the owner themselves

			if (shareError) {
				console.error('Error fetching collaborators:', shareError);
			} else if (shareAccessData) {
				// Count unique collaborators
				uniqueCollaborators = new Set(
					shareAccessData.map((item) => item.user_id)
				).size;
			}
		}

		// Fetch AI usage count (from ai_usage_log table)
		const { count: aiUsageCount, error: aiError } = await supabase
			.from('ai_usage_log')
			.select('*', { count: 'exact', head: true })
			.eq('user_id', user.id);

		if (aiError) {
			console.error('Error fetching AI usage:', aiError);
		}

		// Calculate storage (rough estimate: count total nodes + edges)
		const { count: nodesCount, error: nodesError } = await supabase
			.from('nodes')
			.select('*', { count: 'exact', head: true })
			.eq('user_id', user.id);

		if (nodesError) {
			console.error('Error fetching nodes count:', nodesError);
		}

		const { count: edgesCount, error: edgesError } = await supabase
			.from('edges')
			.select('*', { count: 'exact', head: true })
			.eq('user_id', user.id);

		if (edgesError) {
			console.error('Error fetching edges count:', edgesError);
		}

		// Rough storage estimate: assume average of 1KB per node/edge
		const estimatedStorageMB =
			Math.ceil(((nodesCount || 0) + (edgesCount || 0)) / 1024) || 1;

		return NextResponse.json({
			data: {
				mindMapsCount: mindMapsCount || 0,
				collaboratorsCount: uniqueCollaborators,
				storageUsedMB: estimatedStorageMB,
				aiSuggestionsCount: aiUsageCount || 0,
			},
		});
	} catch (error) {
		console.error('Error in usage GET:', error);
		return NextResponse.json(
			{ error: 'Internal server error' },
			{ status: 500 }
		);
	}
}

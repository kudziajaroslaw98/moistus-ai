import {
	checkRateLimit,
	dataExportRateLimiter,
} from '@/helpers/api/rate-limiter';
import { createClient } from '@/helpers/supabase/server';

export async function GET(request: Request) {
	try {
		const supabase = await createClient();

		const {
			data: { user },
			error: authError,
		} = await supabase.auth.getUser();

		if (authError || !user) {
			return Response.json({ error: 'Not authenticated' }, { status: 401 });
		}

		// Block anonymous users (GDPR applies to identified users)
		if (user.is_anonymous) {
			return Response.json(
				{ error: 'Anonymous users cannot export data' },
				{ status: 403 }
			);
		}

		// Rate limit: 1 export per hour per user
		const rateLimitResult = checkRateLimit(
			request,
			dataExportRateLimiter,
			user.id
		);
		if (!rateLimitResult.allowed) {
			return Response.json(
				{
					error: 'Too many export requests. Please try again later.',
					retryAfter: Math.ceil(
						(rateLimitResult.resetTime - Date.now()) / 1000
					),
				},
				{ status: 429 }
			);
		}

		const warnings: string[] = [];

		// --- Batch 1: Independent top-level queries ---
		const [
			profileResult,
			mindMapsResult,
			foldersResult,
			subscriptionsResult,
			paymentHistoryResult,
			preferencesResult,
			usageQuotasResult,
			activityLogResult,
		] = await Promise.all([
			supabase
				.from('user_profiles')
				.select('*')
				.eq('user_id', user.id)
				.single(),
			supabase.from('mind_maps').select('*').eq('user_id', user.id),
			supabase.from('map_folders').select('*').eq('user_id', user.id),
			supabase.from('user_subscriptions').select('*').eq('user_id', user.id),
			supabase.from('payment_history').select('*').eq('user_id', user.id),
			supabase.from('user_preferences').select('*').eq('user_id', user.id),
			supabase.from('user_usage_quotas').select('*').eq('user_id', user.id),
			supabase
				.from('profile_activity_log')
				.select('*')
				.eq('user_id', user.id),
		]);

		// Profile is critical — if it fails, abort
		if (profileResult.error) {
			return Response.json(
				{ error: 'Failed to retrieve user profile' },
				{ status: 500 }
			);
		}

		// Track non-critical batch 1 failures
		if (mindMapsResult.error) warnings.push('Failed to export mind maps');
		if (foldersResult.error) warnings.push('Failed to export folders');
		if (subscriptionsResult.error)
			warnings.push('Failed to export subscriptions');
		if (paymentHistoryResult.error)
			warnings.push('Failed to export payment history');
		if (preferencesResult.error) warnings.push('Failed to export preferences');
		if (usageQuotasResult.error)
			warnings.push('Failed to export usage quotas');
		if (activityLogResult.error)
			warnings.push('Failed to export activity log');

		const mindMaps = mindMapsResult.data ?? [];
		const mapIds = mindMaps.map((m) => m.id);

		// --- Batch 2: Map-dependent queries (skip if no maps) ---
		let nodes: Record<string, unknown>[] = [];
		let edges: Record<string, unknown>[] = [];
		let comments: Record<string, unknown>[] = [];
		let shareTokens: Record<string, unknown>[] = [];
		let shareAccess: Record<string, unknown>[] = [];
		let mapHistoryEvents: Record<string, unknown>[] = [];

		if (mapIds.length > 0) {
			const [
				nodesResult,
				edgesResult,
				commentsResult,
				shareTokensResult,
				shareAccessResult,
				mapHistoryResult,
			] = await Promise.all([
				batchedIn(supabase, 'nodes', 'map_id', mapIds),
				batchedIn(supabase, 'edges', 'map_id', mapIds),
				batchedIn(supabase, 'comments', 'map_id', mapIds),
				supabase
					.from('share_tokens')
					.select('*')
					.eq('created_by', user.id),
				supabase.from('share_access').select('*').eq('user_id', user.id),
				batchedIn(supabase, 'map_history_events', 'map_id', mapIds),
			]);

			if (nodesResult.error) warnings.push('Failed to export nodes');
			if (edgesResult.error) warnings.push('Failed to export edges');
			if (commentsResult.error) warnings.push('Failed to export comments');
			if (shareTokensResult.error)
				warnings.push('Failed to export share tokens');
			if (shareAccessResult.error)
				warnings.push('Failed to export share access');
			if (mapHistoryResult.error)
				warnings.push('Failed to export map history');

			// Filter out system-only ghost nodes
			nodes = (nodesResult.data ?? []).filter(
				(n) => n.node_type !== 'ghostNode'
			);
			edges = edgesResult.data ?? [];
			comments = commentsResult.data ?? [];
			shareTokens = shareTokensResult.data ?? [];
			shareAccess = shareAccessResult.data ?? [];
			mapHistoryEvents = mapHistoryResult.data ?? [];
		}

		// --- Batch 3: User's comment messages & reactions ---
		let commentMessages: Record<string, unknown>[] = [];
		let commentReactions: Record<string, unknown>[] = [];

		const [messagesResult, reactionsResult] = await Promise.all([
			supabase
				.from('comment_messages')
				.select('*')
				.eq('user_id', user.id),
			supabase
				.from('comment_reactions')
				.select('*')
				.eq('user_id', user.id),
		]);

		if (messagesResult.error)
			warnings.push('Failed to export comment messages');
		if (reactionsResult.error)
			warnings.push('Failed to export comment reactions');

		commentMessages = messagesResult.data ?? [];
		commentReactions = reactionsResult.data ?? [];

		// --- Strip sensitive fields ---
		const sanitizedTokens = shareTokens.map(
			({ token: _token, ...rest }) => rest
		);

		const sanitizedSubscriptions = (subscriptionsResult.data ?? []).map(
			({
				polar_subscription_id: _psi,
				polar_customer_id: _pci,
				...rest
			}) => rest
		);

		const sanitizedPaymentHistory = (paymentHistoryResult.data ?? []).map(
			({ polar_order_id: _poi, ...rest }) => rest
		);

		// --- Build nested structure ---
		// Group nodes, edges, comments by map
		const nodesByMap = groupBy(nodes, 'map_id');
		const edgesByMap = groupBy(edges, 'map_id');
		const commentsByMap = groupBy(comments, 'map_id');
		const messagesByComment = groupBy(commentMessages, 'comment_id');
		const reactionsByComment = groupBy(commentReactions, 'comment_id');

		const enrichedMaps = mindMaps.map((map) => ({
			...map,
			nodes: nodesByMap[map.id] ?? [],
			edges: edgesByMap[map.id] ?? [],
			comments: (commentsByMap[map.id] ?? []).map((comment) => ({
				...comment,
				messages: messagesByComment[comment.id as string] ?? [],
				reactions: reactionsByComment[comment.id as string] ?? [],
			})),
		}));

		const exportData = {
			export_metadata: {
				exported_at: new Date().toISOString(),
				format_version: '1.0',
				user_id: user.id,
				warnings,
			},
			profile: profileResult.data,
			preferences: preferencesResult.data ?? [],
			mind_maps: enrichedMaps,
			folders: foldersResult.data ?? [],
			sharing: {
				tokens_created: sanitizedTokens,
				maps_accessed: shareAccess,
			},
			billing: {
				subscriptions: sanitizedSubscriptions,
				payment_history: sanitizedPaymentHistory,
				usage_quotas: usageQuotasResult.data ?? [],
			},
			activity: {
				profile_activity: activityLogResult.data ?? [],
				map_history: mapHistoryEvents,
			},
		};

		const json = JSON.stringify(exportData, null, 2);
		const timestamp = new Date().toISOString().split('T')[0];
		const filename = `shiko-data-export-${timestamp}.json`;

		return new Response(json, {
			headers: {
				'Content-Type': 'application/json',
				'Content-Disposition': `attachment; filename="${filename}"`,
			},
		});
	} catch (error) {
		console.error('Data export failed:', error);
		return Response.json({ error: 'Internal server error' }, { status: 500 });
	}
}

function groupBy(
	items: Record<string, unknown>[],
	key: string
): Record<string, Record<string, unknown>[]> {
	const result: Record<string, Record<string, unknown>[]> = {};
	for (const item of items) {
		const groupKey = item[key] as string;
		if (!groupKey) continue;
		if (!result[groupKey]) result[groupKey] = [];
		result[groupKey].push(item);
	}
	return result;
}

const BATCH_SIZE = 50;

/**
 * Query a table using .in() in batches to avoid URL length limits.
 */
async function batchedIn(
	supabase: Awaited<ReturnType<typeof createClient>>,
	table: string,
	column: string,
	ids: string[]
): Promise<{ data: Record<string, unknown>[] | null; error: unknown }> {
	const chunks: string[][] = [];
	for (let i = 0; i < ids.length; i += BATCH_SIZE) {
		chunks.push(ids.slice(i, i + BATCH_SIZE));
	}

	const results = await Promise.all(
		chunks.map((chunk) =>
			supabase.from(table).select('*').in(column, chunk)
		)
	);

	const allRows: Record<string, unknown>[] = [];
	for (const result of results) {
		if (result.error) return { data: null, error: result.error };
		if (result.data) allRows.push(...result.data);
	}

	return { data: allRows, error: null };
}

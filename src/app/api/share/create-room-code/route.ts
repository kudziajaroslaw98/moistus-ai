import { respondError, respondSuccess } from '@/helpers/api/responses';
import { withAuthValidation } from '@/helpers/api/with-auth-validation';
import { checkCollaboratorLimit } from '@/helpers/api/with-subscription-check';
import { z } from 'zod';

const CreateRoomCodeSchema = z.object({
	map_id: z.string().uuid(),
	role: z.enum(['editor', 'commentator', 'viewer']).default('viewer'),
	can_edit: z.boolean().optional(),
	can_comment: z.boolean().optional(),
	can_view: z.boolean().optional(),
	max_users: z.number().min(1).max(100).default(50),
	expires_in_hours: z.number().min(1).max(168).optional(), // Max 1 week
});

export const POST = withAuthValidation(
	CreateRoomCodeSchema,
	async (req, data, supabase, user) => {
		// 1. Verify user owns the map
		const { data: map, error: mapError } = await supabase
			.from('mind_maps')
			.select('id, title')
			.eq('id', data.map_id)
			.eq('user_id', user.id)
			.single();

		if (mapError || !map) {
			return respondError('Map not found or unauthorized', 403);
		}

		// 2. Check collaborator limit
		const { allowed, limit, remaining, currentCount } =
			await checkCollaboratorLimit(supabase, data.map_id, user.id);

		if (!allowed) {
			return respondError(
				`Collaborator limit reached. You have ${currentCount} collaborators (limit: ${limit}). Upgrade to Pro for unlimited collaborators.`,
				402,
				'COLLABORATOR_LIMIT_REACHED',
				{
					currentCount,
					limit,
					remaining,
					upgradeUrl: '/dashboard/settings/billing',
				}
			);
		}

		// For free users, cap max_users to remaining limit
		const effectiveMaxUsers =
			limit === -1
				? data.max_users
				: Math.min(data.max_users, remaining > 0 ? remaining : 1);

		// 3. Generate unique room code directly
		const generateRoomCode = () => {
			const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
			let result = '';

			for (let i = 0; i < 6; i++) {
				result += chars.charAt(Math.floor(Math.random() * chars.length));
			}

			return `${result.slice(0, 3)}-${result.slice(3)}`;
		};

		let tokenData = generateRoomCode();

		// Ensure uniqueness by checking existing tokens
		let attempts = 0;

		while (attempts < 10) {
			const { data: existing } = await supabase
				.from('share_tokens')
				.select('token')
				.eq('token', tokenData)
				.eq('is_active', true)
				.single();

			if (!existing) break;
			tokenData = generateRoomCode();
			attempts++;
		}

		if (attempts >= 10) {
			return respondError('Failed to generate unique room code', 500);
		}

		// 4. Calculate expiration
		const expires_at = data.expires_in_hours
			? new Date(
					Date.now() + data.expires_in_hours * 60 * 60 * 1000
				).toISOString()
			: null;

		// 5. Create permissions object
		const permissions = {
			role: data.role,
			can_edit: data.can_edit ?? data.role === 'editor',
			can_comment: data.can_comment ?? data.role !== 'viewer',
			can_view: data.can_view ?? true,
		};

		// 6. Create share token (with capped max_users for free tier)
		const { data: token, error: createError } = await supabase
			.from('share_tokens')
			.insert({
				map_id: data.map_id,
				token: tokenData,
				token_type: 'room_code',
				permissions,
				max_users: effectiveMaxUsers,
				expires_at,
				created_by: user.id,
			})
			.select()
			.single();

		if (createError) {
			console.error('Failed to create share token:', createError);
			return respondError('Failed to create room code', 500);
		}

		// 7. Return the complete token object
		return respondSuccess(token);
	}
);

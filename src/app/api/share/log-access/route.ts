import { createClient } from '@/helpers/supabase/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const logAccessSchema = z.object({
	share_token_id: z.string().uuid(),
	user_id: z.string().uuid().optional(),
	guest_user_id: z.string().uuid().optional(),
	access_type: z.enum(['join', 'leave', 'view', 'edit', 'comment']),
	session_duration: z.number().optional(),
	metadata: z.record(z.unknown()).optional().default({}),
});

export async function POST(request: Request) {
	try {
		const supabase = await createClient();

		// Parse and validate request body
		const body = await request.json();
		const validatedData = logAccessSchema.parse(body);

		// Get current user (might be null for guest access)
		const {
			data: { user },
		} = await supabase.auth.getUser();

		// Extract request metadata
		const ip =
			// @ts-expect-error todo: implement proper IP extraction logic
			request.ip ||
			request.headers.get('x-forwarded-for')?.split(',')[0] ||
			request.headers.get('x-real-ip') ||
			'unknown';

		const userAgent = request.headers.get('user-agent') || 'unknown';
		const referrer = request.headers.get('referer') || null;

		// Ensure either user_id or guest_user_id is provided
		const finalUserId = validatedData.user_id || user?.id || null;
		const finalGuestUserId = validatedData.guest_user_id || null;

		if (!finalUserId && !finalGuestUserId) {
			return NextResponse.json(
				{ error: 'Either user_id or guest_user_id must be provided' },
				{ status: 400 }
			);
		}

		// Verify the share token exists and is active
		const { data: shareToken, error: tokenError } = await supabase
			.from('share_tokens')
			.select('id, is_active')
			.eq('id', validatedData.share_token_id)
			.single();

		if (tokenError || !shareToken || !shareToken.is_active) {
			return NextResponse.json(
				{ error: 'Invalid or inactive share token' },
				{ status: 404 }
			);
		}

		// Create access log entry
		const { data: accessLog, error: logError } = await supabase
			.from('share_access_logs')
			.insert({
				share_token_id: validatedData.share_token_id,
				user_id: finalUserId,
				guest_user_id: finalGuestUserId,
				access_type: validatedData.access_type,
				ip_address: ip,
				user_agent: userAgent,
				referrer: referrer,
				session_duration: validatedData.session_duration,
				metadata: {
					...validatedData.metadata,
					timestamp: new Date().toISOString(),
					client_info: {
						user_agent: userAgent,
						referrer: referrer,
						ip: ip,
					},
				},
			})
			.select()
			.single();

		if (logError) {
			console.error('Error creating access log:', logError);
			return NextResponse.json(
				{ error: 'Failed to log access' },
				{ status: 500 }
			);
		}

		// Update current user count for join/leave events
		if (
			validatedData.access_type === 'join' ||
			validatedData.access_type === 'leave'
		) {
			// This could be done with a database function for better performance
			// For now, we'll update it here
			const { error: updateError } = await supabase.rpc(
				'update_share_token_user_count'
			);

			if (updateError) {
				console.error('Error updating user count:', updateError);
				// Don't fail the request for this
			}
		}

		return NextResponse.json(
			{
				success: true,
				log_id: accessLog.id,
			},
			{ status: 201 }
		);
	} catch (error) {
		console.error('Error in log-access:', error);

		if (error instanceof z.ZodError) {
			return NextResponse.json(
				{ error: 'Invalid request data', details: error.errors },
				{ status: 400 }
			);
		}

		return NextResponse.json(
			{ error: 'Internal server error' },
			{ status: 500 }
		);
	}
}

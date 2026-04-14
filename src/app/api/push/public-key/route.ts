import { respondError, respondSuccess } from '@/helpers/api/responses';
import { createClient } from '@/helpers/supabase/server';

export async function GET() {
	try {
		const supabase = await createClient();
		const {
			data: { user },
			error: authError,
		} = await supabase.auth.getUser();

		if (authError || !user) {
			return respondError('Not authenticated', 401, 'Not authenticated');
		}

		const publicKey = process.env.NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY;
		if (!publicKey) {
			return respondError(
				'Push is not configured on this environment',
				503,
				'Missing NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY'
			);
		}

		return respondSuccess(
			{
				publicKey,
			},
			200,
			'Web push public key returned'
		);
	} catch (error) {
		console.error('[push/public-key] failed', error);
		return respondError('Failed to load push key', 500, 'Internal server error');
	}
}


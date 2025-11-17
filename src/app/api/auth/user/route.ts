import { createClient } from '@/helpers/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(_request: Request) {
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

		// Return user data without sensitive information
		const userData = {
			id: user.id,
			email: user.email,
			name: user.user_metadata?.display_name || user.email,
			avatar_url: user.user_metadata?.avatar_url,
			created_at: user.created_at,
			updated_at: user.updated_at,
		};

		return NextResponse.json(userData);
	} catch (error) {
		console.error('Error in auth/user:', error);
		return NextResponse.json(
			{ error: 'Internal server error' },
			{ status: 500 }
		);
	}
}

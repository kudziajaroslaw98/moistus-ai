import { createClient } from '@/helpers/supabase/server';
import type { PublicUserProfile } from '@/types/user-profile-types';
import { NextResponse, type NextRequest } from 'next/server';

export async function GET(
	_request: NextRequest,
	{ params }: { params: Promise<{ userId: string }> }
) {
	try {
		const { userId } = await params;

		if (!userId) {
			return NextResponse.json(
				{ error: 'User ID is required' },
				{ status: 400 }
			);
		}

		const supabase = await createClient();

		// Fetch user profile from database (including preferences for privacy check)
		const { data: profile, error: profileError } = await supabase
			.from('user_profiles')
			.select(
				`
				id,
				user_id,
				full_name,
				display_name,
				avatar_url,
				bio,
				is_anonymous,
				preferences,
				created_at
			`
			)
			.eq('user_id', userId)
			.single();

		if (profileError || !profile) {
			// If profile not found, return minimal data
			return NextResponse.json({
				data: {
					id: userId,
					user_id: userId,
					full_name: 'Collaborator',
					display_name: 'Collaborator',
					isAnonymous: true,
					created_at: new Date().toISOString(),
				} as PublicUserProfile,
			});
		}

		// Check privacy settings - default to private for security
		const preferences = profile.preferences as {
			privacy?: { profile_visibility?: 'public' | 'private' | 'connections' };
		} | null;
		const visibility = preferences?.privacy?.profile_visibility ?? 'private';

		// If profile is private, return minimal data
		if (visibility === 'private') {
			const minimalProfile: PublicUserProfile = {
				id: profile.id,
				user_id: profile.user_id,
				full_name: profile.display_name || profile.full_name || 'Collaborator',
				is_anonymous: profile.is_anonymous || false,
				created_at: profile.created_at,
			};
			return NextResponse.json({ data: minimalProfile });
		}

		// Build full public profile (for 'public' or 'connections' visibility)
		const publicProfile: PublicUserProfile = {
			id: profile.id,
			user_id: profile.user_id,
			full_name: profile.full_name || 'Collaborator',
			display_name: profile.display_name,
			avatar_url: profile.avatar_url,
			bio: profile.bio,
			is_anonymous: profile.is_anonymous || false,
			created_at: profile.created_at,
		};

		// Set cache headers for 5 minutes
		return NextResponse.json({ data: publicProfile });
	} catch (error) {
		console.error('Error in public-profile GET:', error);
		return NextResponse.json(
			{ error: 'Internal server error' },
			{ status: 500 }
		);
	}
}

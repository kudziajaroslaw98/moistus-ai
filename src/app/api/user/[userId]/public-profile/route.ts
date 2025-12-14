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

		// Get current authenticated user for debugging
		const {
			data: { user: authUser },
		} = await supabase.auth.getUser();

		console.log('[public-profile] Request:', {
			requestedUserId: userId,
			currentAuthUserId: authUser?.id,
			isAuthenticated: !!authUser,
		});

		// Fetch user profile from database
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
				created_at
			`
			)
			.eq('user_id', userId)
			.single();

		console.log('[public-profile] Query result:', {
			found: !!profile,
			error: profileError?.message,
			profileData: profile
				? {
						user_id: profile.user_id,
						full_name: profile.full_name,
						has_bio: !!profile.bio,
					}
				: null,
		});

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

		// Build public profile from database data
		// TODO: Respect privacy settings from preferences field
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

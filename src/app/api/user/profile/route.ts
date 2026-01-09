import { createClient } from '@/helpers/supabase/server';
import { generateFallbackAvatar } from '@/helpers/user-profile-helpers';
import type { UserProfileFormData } from '@/types/user-profile-types';
import { NextResponse } from 'next/server';

// Default preferences for new profiles
const DEFAULT_PREFERENCES = {
	theme: 'system' as const,
	accentColor: 'sky',
	reducedMotion: false,
	defaultNodeType: 'defaultNode' as const,
	privacy: {
		profile_visibility: 'public' as const,
	},
};

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

		// Fetch profile from database
		const { data: existingProfile, error: fetchError } = await supabase
			.from('user_profiles')
			.select('*')
			.eq('user_id', user.id)
			.single();

		// If profile not found (PGRST116), create one
		if (fetchError?.code === 'PGRST116' || !existingProfile) {
			const oauthAvatar = user.user_metadata?.avatar_url || user.user_metadata?.picture;
			const avatarUrl = oauthAvatar || generateFallbackAvatar(user.id);

			const { data: newProfile, error: createError } = await supabase
				.from('user_profiles')
				.insert({
					user_id: user.id,
					full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || '',
					display_name:
						user.user_metadata?.display_name ||
						user.user_metadata?.full_name ||
						user.user_metadata?.name ||
						'',
					avatar_url: avatarUrl,
					bio: '',
					is_anonymous: user.is_anonymous ?? false,
					preferences: DEFAULT_PREFERENCES,
				})
				.select()
				.single();

			if (createError) {
				console.error('Error creating profile:', createError);
				return NextResponse.json(
					{ error: 'Failed to create profile' },
					{ status: 500 }
				);
			}

			return NextResponse.json({ data: newProfile });
		}

		// Other fetch errors
		if (fetchError) {
			console.error('Error fetching profile:', fetchError);
			return NextResponse.json(
				{ error: 'Failed to fetch profile' },
				{ status: 500 }
			);
		}

		return NextResponse.json({ data: existingProfile });
	} catch (error) {
		console.error('Error in user/profile GET:', error);
		return NextResponse.json(
			{ error: 'Internal server error' },
			{ status: 500 }
		);
	}
}

export async function PUT(request: Request) {
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

		const body = await request.json();
		const profileData: Partial<UserProfileFormData> = body;

		// Validate required fields
		if (profileData.full_name !== undefined && !profileData.full_name.trim()) {
			return NextResponse.json(
				{ error: 'Full name cannot be empty' },
				{ status: 400 }
			);
		}

		// Build update object with only provided fields
		const updateData: Record<string, unknown> = {};

		if (profileData.full_name !== undefined) {
			updateData.full_name = profileData.full_name.trim();
		}
		if (profileData.display_name !== undefined) {
			updateData.display_name = profileData.display_name.trim();
		}
		if (profileData.bio !== undefined) {
			updateData.bio = profileData.bio;
		}
		if (profileData.preferences !== undefined) {
			updateData.preferences = profileData.preferences;
		}

		// Nothing to update
		if (Object.keys(updateData).length === 0) {
			return NextResponse.json(
				{ error: 'No valid fields to update' },
				{ status: 400 }
			);
		}

		// Update profile in database
		const { data: updatedProfile, error: updateError } = await supabase
			.from('user_profiles')
			.update(updateData)
			.eq('user_id', user.id)
			.select()
			.single();

		if (updateError) {
			console.error('Error updating profile:', updateError);
			return NextResponse.json(
				{ error: 'Failed to update profile' },
				{ status: 500 }
			);
		}

		return NextResponse.json({
			data: updatedProfile,
			message: 'Profile updated successfully'
		});
	} catch (error) {
		console.error('Error in user/profile PUT:', error);
		return NextResponse.json(
			{ error: 'Internal server error' },
			{ status: 500 }
		);
	}
}

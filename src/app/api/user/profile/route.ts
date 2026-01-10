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

		// Handle fetch errors first - only PGRST116 (not found) is acceptable
		if (fetchError) {
			if (fetchError.code !== 'PGRST116') {
				console.error('Error fetching profile:', fetchError);
				return NextResponse.json(
					{ error: 'Failed to fetch profile' },
					{ status: 500 }
				);
			}
		}

		// Create profile if not found (PGRST116 error or no existing profile)
		if (!existingProfile) {
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

		// Validate full_name - must be a non-empty string if provided
		if (profileData.full_name !== undefined) {
			if (typeof profileData.full_name !== 'string' || !profileData.full_name.trim()) {
				return NextResponse.json(
					{ error: 'Full name cannot be empty' },
					{ status: 400 }
				);
			}
		}

		// Validate preferences structure if provided
		if (profileData.preferences !== undefined) {
			if (
				typeof profileData.preferences !== 'object' ||
				profileData.preferences === null ||
				Array.isArray(profileData.preferences)
			) {
				return NextResponse.json(
					{ error: 'Invalid preferences format' },
					{ status: 400 }
				);
			}
		}

		// Build update object with only provided fields
		const updateData: Record<string, unknown> = {};

		if (typeof profileData.full_name === 'string') {
			updateData.full_name = profileData.full_name.trim();
		}
		if (typeof profileData.display_name === 'string') {
			updateData.display_name = profileData.display_name.trim();
		}
		if (profileData.bio !== undefined) {
			updateData.bio = profileData.bio;
		}

		// Merge preferences with existing ones to preserve keys not sent
		if (profileData.preferences !== undefined) {
			// Fetch existing profile to get current preferences
			const { data: existingProfile } = await supabase
				.from('user_profiles')
				.select('preferences')
				.eq('user_id', user.id)
				.single();

			const existingPreferences = (existingProfile?.preferences as Record<string, unknown>) ?? {};
			updateData.preferences = {
				...existingPreferences,
				...profileData.preferences,
			};
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

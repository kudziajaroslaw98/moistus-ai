import { createClient } from '@/helpers/supabase/server';
import { UserProfileFormData } from '@/types/user-profile-types';
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

		// TODO: Get user profile from database
		// For now, return mock data based on user metadata
		const profile = {
			id: user.id,
			user_id: user.id,
			full_name: user.user_metadata?.display_name || user.email?.split('@')[0] || '',
			display_name: user.user_metadata?.display_name || '',
			avatar_url: user.user_metadata?.avatar_url,
			bio: '',
			preferences: {
				theme: 'dark',
				language: 'en',
				timezone: 'UTC',
				notifications: {
					email_comments: true,
					email_mentions: true,
					email_reactions: false,
					push_comments: true,
					push_mentions: true,
					push_reactions: false,
				},
				privacy: {
					show_email: false,
					show_location: true,
					show_company: true,
					profile_visibility: 'public',
				},
			},
			created_at: user.created_at,
			updated_at: user.updated_at,
		};

		return NextResponse.json({ data: profile });
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
		const profileData: UserProfileFormData = body;

		// Validate required fields
		if (!profileData.full_name) {
			return NextResponse.json(
				{ error: 'Full name is required' },
				{ status: 400 }
			);
		}

		// TODO: Save to database
		// For now, just return success
		const updatedProfile = {
			id: user.id,
			user_id: user.id,
			...profileData,
			updated_at: new Date().toISOString(),
		};

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

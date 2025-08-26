import { createClient } from '@/helpers/supabase/server';
import { NextResponse } from 'next/server';

interface PrivacySettings {
	profile: {
		visibility: 'public' | 'connections' | 'private';
		showEmail: boolean;
		showLocation: boolean;
		showCompany: boolean;
		showActivity: boolean;
	};
	mindMaps: {
		defaultVisibility: 'public' | 'private' | 'unlisted';
		allowSearchIndexing: boolean;
		allowComments: boolean;
		allowReactions: boolean;
	};
	data: {
		allowAnalytics: boolean;
		allowImprovement: boolean;
		allowMarketing: boolean;
	};
}

export async function GET(request: Request) {
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

		// TODO: Get privacy settings from database
		// For now, return default settings
		const settings: PrivacySettings = {
			profile: {
				visibility: 'public',
				showEmail: false,
				showLocation: true,
				showCompany: true,
				showActivity: true,
			},
			mindMaps: {
				defaultVisibility: 'private',
				allowSearchIndexing: true,
				allowComments: true,
				allowReactions: true,
			},
			data: {
				allowAnalytics: true,
				allowImprovement: true,
				allowMarketing: false,
			},
		};

		return NextResponse.json({ data: settings });
	} catch (error) {
		console.error('Error in user/privacy GET:', error);
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
		const settings: PrivacySettings = body;

		// TODO: Validate and save privacy settings to database
		
		return NextResponse.json({ 
			data: settings,
			message: 'Privacy settings updated successfully' 
		});
	} catch (error) {
		console.error('Error in user/privacy PUT:', error);
		return NextResponse.json(
			{ error: 'Internal server error' },
			{ status: 500 }
		);
	}
}
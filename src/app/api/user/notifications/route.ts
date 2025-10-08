import { createClient } from '@/helpers/supabase/server';
import { NextResponse } from 'next/server';

interface NotificationSettings {
	email: {
		enabled: boolean;
		comments: boolean;
		mentions: boolean;
		reactions: boolean;
		collaborations: boolean;
		updates: boolean;
		marketing: boolean;
	};
	push: {
		enabled: boolean;
		comments: boolean;
		mentions: boolean;
		reactions: boolean;
		collaborations: boolean;
	};
	frequency: 'instant' | 'daily' | 'weekly';
	quietHours: {
		enabled: boolean;
		start: string;
		end: string;
	};
}

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

		// TODO: Get notification settings from database
		// For now, return default settings
		const settings: NotificationSettings = {
			email: {
				enabled: true,
				comments: true,
				mentions: true,
				reactions: false,
				collaborations: true,
				updates: true,
				marketing: false,
			},
			push: {
				enabled: true,
				comments: true,
				mentions: true,
				reactions: false,
				collaborations: true,
			},
			frequency: 'instant',
			quietHours: {
				enabled: true,
				start: '22:00',
				end: '08:00',
			},
		};

		return NextResponse.json({ data: settings });
	} catch (error) {
		console.error('Error in user/notifications GET:', error);
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
		const settings: NotificationSettings = body;

		// TODO: Validate and save notification settings to database
		
		return NextResponse.json({ 
			data: settings,
			message: 'Notification settings updated successfully' 
		});
	} catch (error) {
		console.error('Error in user/notifications PUT:', error);
		return NextResponse.json(
			{ error: 'Internal server error' },
			{ status: 500 }
		);
	}
}
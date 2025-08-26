import { createClient } from '@/helpers/supabase/server';
import { NextResponse } from 'next/server';

interface AppearanceSettings {
	theme: 'light' | 'dark' | 'system';
	accentColor: string;
	language: string;
	timezone: string;
	fontSize: number;
	compactMode: boolean;
	animations: boolean;
	reducedMotion: boolean;
	canvas: {
		gridVisible: boolean;
		snapToGrid: boolean;
		defaultZoom: number;
		minZoom: number;
		maxZoom: number;
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

		// TODO: Get appearance settings from database
		// For now, return default settings
		const settings: AppearanceSettings = {
			theme: 'dark',
			accentColor: 'sky',
			language: 'en',
			timezone: 'UTC',
			fontSize: 14,
			compactMode: false,
			animations: true,
			reducedMotion: false,
			canvas: {
				gridVisible: true,
				snapToGrid: true,
				defaultZoom: 100,
				minZoom: 25,
				maxZoom: 200,
			},
		};

		return NextResponse.json({ data: settings });
	} catch (error) {
		console.error('Error in user/appearance GET:', error);
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
		const settings: AppearanceSettings = body;

		// TODO: Validate and save appearance settings to database
		
		return NextResponse.json({ 
			data: settings,
			message: 'Appearance settings updated successfully' 
		});
	} catch (error) {
		console.error('Error in user/appearance PUT:', error);
		return NextResponse.json(
			{ error: 'Internal server error' },
			{ status: 500 }
		);
	}
}
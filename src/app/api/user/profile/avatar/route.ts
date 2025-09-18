import { createClient } from '@/helpers/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
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

		const formData = await request.formData();
		const file = formData.get('avatar') as File;

		if (!file) {
			return NextResponse.json(
				{ error: 'No file provided' },
				{ status: 400 }
			);
		}

		// Validate file type
		const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

		if (!allowedTypes.includes(file.type)) {
			return NextResponse.json(
				{ error: 'Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed' },
				{ status: 400 }
			);
		}

		// Validate file size (2MB limit)
		const maxSize = 2 * 1024 * 1024; // 2MB

		if (file.size > maxSize) {
			return NextResponse.json(
				{ error: 'File size too large. Maximum size is 2MB' },
				{ status: 400 }
			);
		}

		// TODO: Upload to Supabase Storage
		// For now, just return a mock response
		const avatarUrl = `https://api.dicebear.com/7.x/initials/svg?seed=${user.email}`;

		// TODO: Update user profile with new avatar URL
		
		return NextResponse.json({ 
			data: { 
				avatar_url: avatarUrl,
				message: 'Avatar uploaded successfully' 
			} 
		});
	} catch (error) {
		console.error('Error in user/profile/avatar POST:', error);
		return NextResponse.json(
			{ error: 'Internal server error' },
			{ status: 500 }
		);
	}
}
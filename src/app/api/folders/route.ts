import { createClient } from '@/helpers/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
	try {
		const supabase = await createClient();

		// Get current user
		const {
			data: { user },
			error: authError,
		} = await supabase.auth.getUser();

		if (authError || !user) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		// Fetch user's folders and team folders

		//get user team ids
		const { data: userTeams, error: userTeamsError } = await supabase
			.from('team_members')
			.select('team_id')
			.eq('user_id', user.id);

		if (userTeamsError) {
			console.error('Error fetching user teams:', userTeamsError);
			return NextResponse.json(
				{ error: 'Failed to fetch user teams' },
				{ status: 500 }
			);
		}

		const userTeamIds = userTeams.map((team) => team.team_id);

		const { data: folders, error: foldersError } = await supabase
			.from('map_folders')
			.select(
				`
        *
      `
			)
			.or(
				`user_id.eq.${user.id}${userTeamIds.length > 0 ? `,team_id.in.(${userTeamIds.join(',')})` : ''}`
			)
			.order('position', { ascending: true });

		if (foldersError) {
			console.error('Error fetching folders:', foldersError);
			return NextResponse.json(
				{ error: 'Failed to fetch folders' },
				{ status: 500 }
			);
		}

		// Build folder tree structure
		const folderMap = new Map();
		const rootFolders = [];

		// First pass: create map of all folders
		folders?.forEach((folder) => {
			folderMap.set(folder.id, {
				...folder,
				map_count: folder._count?.[0]?.count || 0,
				children: [],
			});
		});

		// Second pass: build tree structure
		folders?.forEach((folder) => {
			const folderWithChildren = folderMap.get(folder.id);

			if (folder.parent_id) {
				const parent = folderMap.get(folder.parent_id);

				if (parent) {
					parent.children.push(folderWithChildren);
				}
			} else {
				rootFolders.push(folderWithChildren);
			}
		});

		console.log(rootFolders);

		return NextResponse.json({
			data: {
				folders: rootFolders,
				total: folders?.length || 0,
			},
		});
	} catch (error) {
		console.error('Error in GET /api/folders:', error);
		return NextResponse.json(
			{ error: 'Internal server error' },
			{ status: 500 }
		);
	}
}

export async function POST(request: NextRequest) {
	try {
		const supabase = await createClient();

		// Get current user
		const {
			data: { user },
			error: authError,
		} = await supabase.auth.getUser();

		if (authError || !user) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		// Parse request body
		const body = await request.json();
		const { name, parent_id, team_id, color, icon } = body;

		if (!name) {
			return NextResponse.json(
				{ error: 'Folder name is required' },
				{ status: 400 }
			);
		}

		// Create folder
		const { data: folder, error: createError } = await supabase
			.from('map_folders')
			.insert({
				name,
				parent_id: parent_id || null,
				user_id: team_id ? null : user.id,
				team_id: team_id || null,
				color: color || '#6B7280',
				icon: icon || 'folder',
				position: 0,
			})
			.select()
			.single();

		if (createError) {
			console.error('Error creating folder:', createError);
			return NextResponse.json(
				{ error: 'Failed to create folder' },
				{ status: 500 }
			);
		}

		return NextResponse.json({
			folder,
			message: 'Folder created successfully',
		});
	} catch (error) {
		console.error('Error in POST /api/folders:', error);
		return NextResponse.json(
			{ error: 'Internal server error' },
			{ status: 500 }
		);
	}
}

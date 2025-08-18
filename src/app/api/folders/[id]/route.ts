import { createClient } from '@/helpers/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Fetch folder
    const { data: folder, error: folderError } = await supabase
      .from('map_folders')
      .select(`
        *,
        mind_maps(count),
        children:map_folders!parent_id(*)
      `)
      .eq('id', params.id)
      .single();

    if (folderError) {
      console.error('Error fetching folder:', folderError);
      return NextResponse.json(
        { error: 'Folder not found' },
        { status: 404 }
      );
    }

    // Check if user has access to this folder
    const hasAccess = folder.user_id === user.id ||
      (folder.team_id && await checkTeamMembership(supabase, folder.team_id, user.id));

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      folder
    });

  } catch (error) {
    console.error('Error in GET /api/folders/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const updates: any = {};

    // Only allow updating certain fields
    const allowedFields = ['name', 'color', 'icon', 'parent_id', 'position'];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    // Add updated_at timestamp
    updates.updated_at = new Date().toISOString();

    // Update folder
    const { data: folder, error: updateError } = await supabase
      .from('map_folders')
      .update(updates)
      .eq('id', params.id)
      .or(`user_id.eq.${user.id},team_id.in.(
        SELECT team_id FROM team_members
        WHERE user_id = '${user.id}'
        AND role IN ('owner', 'editor')
      )`)
      .select()
      .single();

    if (updateError || !folder) {
      console.error('Error updating folder:', updateError);
      return NextResponse.json(
        { error: 'Failed to update folder or insufficient permissions' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      folder,
      message: 'Folder updated successfully'
    });

  } catch (error) {
    console.error('Error in PATCH /api/folders/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Move all maps in this folder to root (set folder_id to null)
    const { error: updateMapsError } = await supabase
      .from('mind_maps')
      .update({ folder_id: null })
      .eq('folder_id', params.id);

    if (updateMapsError) {
      console.error('Error moving maps to root:', updateMapsError);
    }

    // Move all child folders to root
    const { error: updateFoldersError } = await supabase
      .from('map_folders')
      .update({ parent_id: null })
      .eq('parent_id', params.id);

    if (updateFoldersError) {
      console.error('Error moving child folders to root:', updateFoldersError);
    }

    // Delete the folder
    const { error: deleteError } = await supabase
      .from('map_folders')
      .delete()
      .eq('id', params.id)
      .or(`user_id.eq.${user.id},team_id.in.(
        SELECT team_id FROM team_members
        WHERE user_id = '${user.id}'
        AND role = 'owner'
      )`);

    if (deleteError) {
      console.error('Error deleting folder:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete folder or insufficient permissions' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      message: 'Folder deleted successfully'
    });

  } catch (error) {
    console.error('Error in DELETE /api/folders/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper function to check team membership
async function checkTeamMembership(
  supabase: any,
  teamId: string,
  userId: string
): Promise<boolean> {
  const { data } = await supabase
    .from('team_members')
    .select('id')
    .eq('team_id', teamId)
    .eq('user_id', userId)
    .single();

  return !!data;
}

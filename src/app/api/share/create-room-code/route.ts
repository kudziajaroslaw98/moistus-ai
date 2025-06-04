import { createClient } from "@/helpers/supabase/server";
import { ShareToken } from "@/types/sharing-types";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const createRoomCodeSchema = z.object({
  map_id: z.string().uuid(),
  role: z.enum(["owner", "editor", "commenter", "viewer"]),
  can_edit: z.boolean().optional().default(false),
  can_comment: z.boolean().optional().default(true),
  can_view: z.boolean().optional().default(true),
  max_users: z.number().min(1).max(100).optional().default(50),
  expires_at: z.string().optional(),
  created_by: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = createRoomCodeSchema.parse(body);

    // Verify user owns the map or has permission to share it
    const { data: mapData, error: mapError } = await supabase
      .from("mind_maps")
      .select("id, user_id")
      .eq("id", validatedData.map_id)
      .single();

    if (mapError || !mapData) {
      return NextResponse.json(
        { error: "Mind map not found" },
        { status: 404 },
      );
    }

    if (mapData.user_id !== user.id) {
      // Check if user has sharing permissions through existing shares
      const { data: shareData } = await supabase
        .from("mind_map_shares")
        .select("can_edit")
        .eq("map_id", validatedData.map_id)
        .eq("user_id", user.id)
        .single();

      if (!shareData?.can_edit) {
        return NextResponse.json(
          { error: "Permission denied" },
          { status: 403 },
        );
      }
    }

    // Generate unique room code
    const { data: roomCode, error: codeError } =
      await supabase.rpc("generate_room_code");

    if (codeError || !roomCode) {
      return NextResponse.json(
        { error: "Failed to generate room code" },
        { status: 500 },
      );
    }

    // Create permissions object
    const permissions = {
      role: validatedData.role,
      can_edit: validatedData.can_edit,
      can_comment: validatedData.can_comment,
      can_view: validatedData.can_view,
    };

    // Create share token
    const { data: shareToken, error: createError } = await supabase
      .from("share_tokens")
      .insert({
        map_id: validatedData.map_id,
        token: roomCode,
        token_type: "room_code",
        permissions,
        max_users: validatedData.max_users,
        expires_at: validatedData.expires_at,
        created_by: user.id,
      })
      .select()
      .single();

    if (createError) {
      console.error("Error creating share token:", createError);
      return NextResponse.json(
        { error: "Failed to create room code" },
        { status: 500 },
      );
    }

    // Transform to ShareToken type
    const token: ShareToken = {
      id: shareToken.id,
      map_id: shareToken.map_id,
      token: shareToken.token,
      token_type: shareToken.token_type,
      share_link_hash: shareToken.share_link_hash,
      permissions: shareToken.permissions,
      max_users: shareToken.max_users,
      current_users: shareToken.current_users || 0,
      expires_at: shareToken.expires_at,
      is_active: shareToken.is_active,
      created_by: shareToken.created_by,
      created_at: shareToken.created_at,
      updated_at: shareToken.updated_at,
    };

    return NextResponse.json(token, { status: 201 });
  } catch (error) {
    console.error("Error in create-room-code:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.errors },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

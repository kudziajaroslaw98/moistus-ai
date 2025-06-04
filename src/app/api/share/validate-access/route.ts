import { createClient } from "@/helpers/supabase/server";
import { ShareAccessValidation } from "@/types/sharing-types";
import { PostgrestSingleResponse } from "@supabase/postgrest-js";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const validateAccessSchema = z.object({
  token: z.string().length(6),
  guest_session_id: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Parse and validate request body
    const body = await request.json();
    const { token, guest_session_id } = validateAccessSchema.parse(body);

    // Get current user (might be null for guest access)
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Use the database function to validate access
    const {
      data: validationResult,
      error: validationError,
    }: PostgrestSingleResponse<ShareAccessValidation> = await supabase
      .rpc("validate_share_access", {
        token_param: token,
        user_id_param: user?.id || null,
        guest_session_id_param: guest_session_id || null,
      })
      .single();

    if (validationError) {
      console.error("Error validating share access:", validationError);
      return NextResponse.json(
        { error: "Failed to validate access" },
        { status: 500 },
      );
    }

    // Transform result to ShareAccessValidation type
    const validation: ShareAccessValidation = {
      share_token_id: validationResult.share_token_id,
      map_id: validationResult.map_id,
      permissions: validationResult.permissions,
      is_valid: validationResult.is_valid,
      error_message: validationResult.error_message,
    };

    return NextResponse.json(validation);
  } catch (error) {
    console.error("Error in validate-access:", error);

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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token || token.length !== 6) {
      return NextResponse.json(
        { error: "Invalid token format" },
        { status: 400 },
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Use the database function to validate access
    const {
      data: validationResult,
      error: validationError,
    }: PostgrestSingleResponse<ShareAccessValidation> = await supabase
      .rpc("validate_share_access", {
        token_param: token,
        user_id_param: user?.id || null,
        guest_session_id_param: null,
      })
      .single();

    if (validationError) {
      console.error("Error validating share access:", validationError);
      return NextResponse.json(
        { error: "Failed to validate access" },
        { status: 500 },
      );
    }

    const validation: ShareAccessValidation = {
      share_token_id: validationResult?.share_token_id,
      map_id: validationResult?.map_id,
      permissions: validationResult?.permissions,
      is_valid: validationResult?.is_valid,
      error_message: validationResult?.error_message,
    };

    return NextResponse.json(validation);
  } catch (error) {
    console.error("Error in validate-access GET:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

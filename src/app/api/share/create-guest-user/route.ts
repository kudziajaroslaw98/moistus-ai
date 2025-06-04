import { createClient } from "@/helpers/supabase/server";
import { GuestUser } from "@/types/sharing-types";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const createGuestUserSchema = z.object({
  display_name: z.string().min(1).max(255),
  email: z.string().email().optional(),
  session_id: z.string().min(1).max(255),
  fingerprint_hash: z.string().optional(),
  session_data: z.record(z.unknown()).optional().default({}),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Parse and validate request body
    const body = await request.json();
    const validatedData = createGuestUserSchema.parse(body);

    // Check if session_id already exists
    const { data: existingGuest } = await supabase
      .from("guest_users")
      .select("id")
      .eq("session_id", validatedData.session_id)
      .single();

    if (existingGuest) {
      return NextResponse.json(
        { error: "Session already exists" },
        { status: 409 },
      );
    }

    // Create guest user record
    const { data: guestUser, error: createError } = await supabase
      .from("guest_users")
      .insert({
        display_name: validatedData.display_name,
        email: validatedData.email,
        session_id: validatedData.session_id,
        fingerprint_hash: validatedData.fingerprint_hash,
        session_data: validatedData.session_data,
        first_seen: new Date().toISOString(),
        last_activity: new Date().toISOString(),
      })
      .select()
      .single();

    if (createError) {
      console.error("Error creating guest user:", createError);
      return NextResponse.json(
        { error: "Failed to create guest user" },
        { status: 500 },
      );
    }

    // Transform to GuestUser type
    const guest: GuestUser = {
      id: guestUser.id,
      session_id: guestUser.session_id,
      display_name: guestUser.display_name,
      email: guestUser.email,
      avatar_url: guestUser.avatar_url,
      fingerprint_hash: guestUser.fingerprint_hash,
      first_seen: guestUser.first_seen,
      last_activity: guestUser.last_activity,
      conversion_date: guestUser.conversion_date,
      converted_user_id: guestUser.converted_user_id,
      session_data: guestUser.session_data || {},
      created_at: guestUser.created_at,
      updated_at: guestUser.updated_at,
    };

    // Set guest session in response for RLS policies
    const response = NextResponse.json(guest, { status: 201 });
    response.headers.set(
      "Set-Cookie",
      `guest_session_id=${validatedData.session_id}; Path=/; HttpOnly; SameSite=Strict`,
    );

    return response;
  } catch (error) {
    console.error("Error in create-guest-user:", error);

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

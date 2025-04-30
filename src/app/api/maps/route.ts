import { createClient } from "@/helpers/supabase/server";
import uuid from "@/helpers/uuid";
import { ApiResponse } from "@/types/api-response";
import { MindMapData } from "@/types/mind-map-data";
import { NextResponse } from "next/server";
import { z } from "zod";

// Define schema for creating a new map
const createMapSchema = z.object({
  title: z.string().min(1, "Map title cannot be empty"),
});

export async function GET() {
  const supabaseServer = await createClient();
  try {
    // Get the authenticated user
    const {
      data: { user },
      error: userError,
    } = await supabaseServer.auth.getUser();

    if (userError || !user) {
      return NextResponse.json<ApiResponse<unknown>>(
        {
          error: "Error fetching mind maps.",
          status: "error",
          statusNumber: 401,
          statusText: "User not authenticated.",
        },
        {
          status: 401,
        },
      );
    }

    // Fetch all mind maps belonging to the authenticated user
    const { data: maps, error: fetchError } = await supabaseServer
      .from("mind_maps")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }); // Order by creation date

    if (fetchError) {
      console.error("Error fetching mind maps:", fetchError);
      return NextResponse.json<ApiResponse<unknown>>(
        {
          error: "Error fetching mind maps.",
          status: "error",
          statusNumber: 500,
          statusText: fetchError.message,
        },
        {
          status: 500,
        },
      );
    }

    return NextResponse.json<ApiResponse<{ maps: MindMapData[] }>>(
      {
        data: { maps },
        statusNumber: 200,
        statusText: "Mind maps fetched successfully.",
        status: "success",
      },
      {
        status: 200,
      },
    );
  } catch (error) {
    console.error("Error in GET /api/maps:", error);
    return NextResponse.json<ApiResponse<unknown>>(
      {
        error: "Error fetching mind maps.",
        status: "error",
        statusNumber: 500,
        statusText: "Internal server error.",
      },
      {
        status: 500,
      },
    );
  }
}

export async function POST(req: Request) {
  const supabaseServer = await createClient();
  try {
    // Get the authenticated user
    const {
      data: { user },
      error: userError,
    } = await supabaseServer.auth.getUser();

    if (userError || !user) {
      return NextResponse.json<ApiResponse<unknown>>(
        {
          error: "User not authenticated.",
          status: "error",
          statusNumber: 401,
          statusText: "User not authenticated.",
        },
        {
          status: 401,
        },
      );
    }

    // Parse and validate the request body
    const body = await req.json();
    const validationResult = createMapSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json<ApiResponse<unknown>>(
        {
          error: validationResult.error.issues.join(","),
          status: "error",
          statusNumber: 400,
          statusText: "Invalid request data.",
        },
        {
          status: 400,
        },
      );
    }

    const { title } = validationResult.data;
    const newMapId = uuid(); // Generate a unique ID for the new map

    // Insert the new mind map into the database
    const { data: newMap, error: insertError } = await supabaseServer
      .from("mind_maps")
      .insert([
        {
          id: newMapId,
          user_id: user.id,
          title: title,
        },
      ])
      .select() // Select the inserted row to return it
      .single(); // Expecting a single inserted row

    if (insertError) {
      console.error("Error creating new mind map:", insertError);
      return NextResponse.json<ApiResponse<unknown>>(
        {
          error: "Error creating new mind map.",
          status: "error",
          statusNumber: 500,
          statusText: insertError.message,
        },
        { status: 500, statusText: "Error creating new mind map." },
      );
    }

    // Optionally, create a default root node for the new map
    const defaultRootNodeId = uuid();
    const { error: nodeInsertError } = await supabaseServer
      .from("nodes")
      .insert([
        {
          id: defaultRootNodeId,
          map_id: newMap.id, // Link to the new map
          parent_id: null, // This is the root
          content: "Main Topic", // Default content
          position_x: 250, // Default position
          position_y: 250,
        },
      ]);

    if (nodeInsertError) {
      console.warn(
        "Warning: Failed to create default root node for new map:",
        nodeInsertError,
      );
      // Continue even if node creation fails, the map still exists
    }

    return NextResponse.json<ApiResponse<unknown>>(
      {
        data: {
          map: newMap,
        },
        statusNumber: 201,
        statusText: "Mind map created successfully.",
        status: "success",
      },
      { status: 201 },
    ); // Return the created map
  } catch (error) {
    console.error("Error in POST /api/maps:", error);
    return NextResponse.json<ApiResponse<unknown>>(
      {
        error: "Error creating mind map.",
        status: "error",
        statusNumber: 500,
        statusText: "Internal server error.",
      },
      {
        status: 500,
      },
    );
  }
}

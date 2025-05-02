import { createClient } from "@/helpers/supabase/server";
import { ApiResponse } from "@/types/api-response";
import { NextResponse } from "next/server";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabaseServer = await createClient();
  try {
    const { id: mapId } = await params;

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
        { status: 401 },
      );
    }

    // Delete the mind map, ensuring it belongs to the authenticated user
    // This relies on RLS policies in Supabase AND potentially ON DELETE CASCADE
    // on the 'nodes' table's map_id foreign key to delete associated nodes.
    const { error: deleteError } = await supabaseServer
      .from("mind_maps")
      .delete()
      .eq("id", mapId)
      .eq("user_id", user.id); // Ensure the user owns the map

    if (deleteError) {
      console.error("Error deleting mind map:", deleteError);
      // Check if the error is due to the map not being found or not owned by the user
      if (deleteError.code === "PGRST116") {
        // Example code for "no rows found" or similar
        return NextResponse.json<ApiResponse<unknown>>(
          {
            error: "Mind map not found or not owned by user.",
            status: "error",
            statusNumber: 404,
            statusText: "Mind map not found.",
          },
          { status: 404 },
        );
      }
      return NextResponse.json<ApiResponse<unknown>>(
        {
          error: "Error deleting mind map.",
          status: "error",
          statusNumber: 500,
          statusText: deleteError.message,
        },
        { status: 500 },
      );
    }

    // If deletion is successful (and ON DELETE CASCADE is set up for nodes)
    return NextResponse.json<ApiResponse<unknown>>(
      {
        data: { message: "Mind map deleted successfully." },
        statusNumber: 200,
        statusText: "Mind map deleted successfully.",
        status: "success",
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error in DELETE /api/maps/[id]:", error);
    return NextResponse.json<ApiResponse<unknown>>(
      {
        error: "Error deleting mind map.",
        status: "error",
        statusNumber: 500,
        statusText: "Internal server error.",
      },
      { status: 500 },
    );
  }
}

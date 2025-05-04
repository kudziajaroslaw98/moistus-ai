import { respondError, respondSuccess } from "@/helpers/api/responses";
import { withApiValidation } from "@/helpers/api/with-api-validation";
import generateUuid from "@/helpers/generate-uuid";
import { z } from "zod";

// Define schema for creating a new map
const requestBodySchema = z.object({
  title: z.string().min(1, "Map title cannot be empty"),
});

export const GET = withApiValidation(
  z.any().nullish(),
  async (req, validatedBody, supabase, user) => {
    try {
      const { data: maps, error: fetchError } = await supabase
        .from("mind_maps")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }); // Order by creation date

      if (fetchError) {
        console.error("Error fetching mind maps:", fetchError);
        return respondError(
          "Error fetching mind maps.",
          500,
          fetchError.message,
        );
      }

      return respondSuccess({ maps }, 200, "Mind maps fetched successfully.");
    } catch (error) {
      console.error("Error in GET /api/maps:", error);
      return respondError(
        "Error fetching mind maps.",
        500,
        "Internal server error.",
      );
    }
  },
);

export const POST = withApiValidation(
  requestBodySchema,
  async (req, validatedBody, supabase, user) => {
    try {
      const { title } = validatedBody;
      const newMapId = generateUuid(); // Generate a unique ID for the new map

      // Insert the new mind map into the database
      const { data: newMap, error: insertError } = await supabase
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
        return respondError(
          "Error creating new mind map.",
          500,
          insertError.message,
        );
      }

      // Optionally, create a default root node for the new map
      const defaultRootNodeId = generateUuid();
      const { error: nodeInsertError } = await supabase.from("nodes").insert([
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
      }

      return respondSuccess(
        { map: newMap },
        201,
        "Mind map created successfully.",
      );
    } catch (error) {
      console.error("Error in POST /api/maps:", error);
      return respondError(
        "Error creating mind map.",
        500,
        "Internal server error.",
      );
    }
  },
);

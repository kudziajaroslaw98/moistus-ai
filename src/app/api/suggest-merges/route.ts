import { createClient } from "@/helpers/supabase/server";
import { AiMergeSuggestion } from "@/types/ai-merge-suggestion";
import { ApiResponse } from "@/types/api-response"; // <-- Import ApiResponse
import { NextResponse } from "next/server";
import { z } from "zod";

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  throw new Error("Missing GEMINI_API_KEY environment variable");
}

const requestBodySchema = z.object({
  mapId: z.string().uuid("Invalid map ID format"),
});

export async function POST(req: Request) {
  const supabaseServer = await createClient();
  try {
    const body = await req.json();
    const validationResult = requestBodySchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json<ApiResponse<unknown>>(
        {
          error: validationResult.error.issues.join(", "),
          status: "error",
          statusNumber: 400,
          statusText: "Invalid request body.",
        },
        { status: 400 },
      );
    }

    const { mapId } = validationResult.data;

    const { data: nodesData, error: fetchError } = await supabaseServer
      .from("nodes")
      .select("id, content")
      .eq("map_id", mapId);

    if (fetchError) {
      console.error("Error fetching nodes for merge suggestion:", fetchError);
      return NextResponse.json<ApiResponse<unknown>>(
        {
          error: "Error fetching map nodes for merge suggestion.",
          status: "error",
          statusNumber: 500,
          statusText: fetchError.message,
        },
        { status: 500 },
      );
    }

    if (!nodesData || nodesData.length < 2) {
      return NextResponse.json<
        ApiResponse<{ suggestions: AiMergeSuggestion[] }>
      >(
        {
          data: { suggestions: [] },
          status: "success",
          statusNumber: 200,
          statusText:
            "Not enough nodes in map to suggest merges (minimum 2 required).",
        },
        { status: 200 },
      );
    }

    // --- Simplified AI Logic (as per original code) ---
    const mergeSuggestions: AiMergeSuggestion[] = [];
    const processedPairs = new Set<string>();

    for (let i = 0; i < nodesData.length; i++) {
      for (let j = i + 1; j < nodesData.length; j++) {
        const node1 = nodesData[i];
        const node2 = nodesData[j];

        const content1 =
          node1.content?.replace(/<\/?[^>]+(>|$)/g, "").trim() || "";
        const content2 =
          node2.content?.replace(/<\/?[^>]+(>|$)/g, "").trim() || "";

        if (content1.length > 0 && content1 === content2) {
          const pairKey = [node1.id, node2.id].sort().join("-");
          if (!processedPairs.has(pairKey)) {
            mergeSuggestions.push({
              node1Id: node1.id,
              node2Id: node2.id,
              reason: "Identical content",
            });
            processedPairs.add(pairKey);
          }
        }
        // TODO: Add embedding-based similarity check here
      }
    }
    // --- End AI Logic ---

    return NextResponse.json<ApiResponse<{ suggestions: AiMergeSuggestion[] }>>(
      {
        data: { suggestions: mergeSuggestions },
        status: "success",
        statusNumber: 200,
        statusText: "Merge suggestions generated successfully.",
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error during AI merge suggestion:", error);
    return NextResponse.json<ApiResponse<unknown>>(
      {
        error: "Internal server error during AI merge suggestion.",
        status: "error",
        statusNumber: 500,
        statusText:
          error instanceof Error ? error.message : "Internal Server Error",
      },
      { status: 500 },
    );
  }
}

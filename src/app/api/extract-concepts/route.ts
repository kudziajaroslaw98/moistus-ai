import { respondError, respondSuccess } from "@/helpers/api/responses";
import { createClient } from "@/helpers/supabase/server";
import { defaultModel, parseAiJsonResponse } from "@/lib/ai/gemini";
import { ApiResponse } from "@/types/api-response";
import { NextResponse } from "next/server";
import { z } from "zod";

const requestBodySchema = z.object({
  nodeId: z.string().uuid("Invalid node ID format"),
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

    const { nodeId } = validationResult.data;

    const { data: nodeData, error: fetchError } = await supabaseServer
      .from("nodes")
      .select("content")
      .eq("id", nodeId)
      .single();

    if (fetchError || !nodeData) {
      console.error("Error fetching node for concept extraction:", fetchError);
      const statusNumber = fetchError?.code === "PGRST116" ? 404 : 500; // PGRST116: row not found
      const statusText =
        statusNumber === 404
          ? "Node not found."
          : "Error fetching node content.";
      return respondError(statusText, 404, fetchError?.message || statusText);
    }

    const contentToAnalyze = nodeData.content;

    if (!contentToAnalyze || contentToAnalyze.trim().length === 0) {
      return respondSuccess(
        { concepts: ["Node has no content to analyze."] },
        200,
        "Node has no content to analyze.",
      );
    }

    const aiPrompt = `Extract the key concepts, terms, or subtopics from the following text.
    Return the result as a JSON array of strings.
    Example format: ["Concept 1", "Concept 2", "Concept 3"]
    Ensure the output is ONLY the JSON array, nothing else.\n\n${contentToAnalyze}`;

    const result = await defaultModel.generateContent(aiPrompt);
    const rawText = result.response.text();
    let concepts: string[] = [];

    const parsedResponse = parseAiJsonResponse<string[]>(rawText);

    if (
      parsedResponse &&
      Array.isArray(parsedResponse) &&
      parsedResponse.every((item) => typeof item === "string")
    ) {
      concepts = parsedResponse;
    } else {
      console.error("Failed to parse AI response as JSON array");
      console.error("AI Response Text:", rawText);
      concepts = [rawText.trim()]; // Fallback
    }

    return respondSuccess(
      { concepts: concepts },
      200,
      "Concepts extracted successfully.",
    );
  } catch (error) {
    console.error("Error extracting concepts:", error);
    return respondError(
      "Internal server error during concept extraction.",
      500,
      error instanceof Error ? error.message : "Internal Server Error",
    );
  }
}

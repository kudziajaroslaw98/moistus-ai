import { createClient } from "@/helpers/supabase/server";
import { ApiResponse } from "@/types/api-response"; // <-- Import ApiResponse
import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { z } from "zod";

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  throw new Error("Missing GEMINI_API_KEY environment variable");
}

const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

const requestBodySchema = z.object({
  mapId: z.string().uuid("Invalid map ID format"),
});

const aiConnectionSuggestionSchema = z.object({
  sourceNodeId: z.string(),
  targetNodeId: z.string(),
  reason: z.string().optional(),
});

const aiResponseSchema = z.array(aiConnectionSuggestionSchema);

type ConnectionSuggestion = z.infer<typeof aiConnectionSuggestionSchema>;

interface SuggestConnectionsData {
  suggestions: ConnectionSuggestion[];
}

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
      console.error(
        "Error fetching nodes for connection suggestion:",
        fetchError,
      );
      return NextResponse.json<ApiResponse<unknown>>(
        {
          error: "Error fetching map nodes for connection suggestion.",
          status: "error",
          statusNumber: 500,
          statusText: fetchError.message,
        },
        { status: 500 },
      );
    }

    if (!nodesData || nodesData.length < 2) {
      return NextResponse.json<ApiResponse<SuggestConnectionsData>>(
        {
          data: { suggestions: [] },
          status: "success",
          statusNumber: 200,
          statusText:
            "Not enough nodes in map to suggest connections (minimum 2 required).",
        },
        { status: 200 },
      );
    }

    const nodeContentList = nodesData
      .map((node) => `${node.id}: ${node.content}`)
      .join("\n");

    const aiPrompt = `Given the following list of mind map nodes (ID: Content), identify potential conceptual connections between pairs of nodes.
    Suggest connections that represent relationships like "related to", "leads to", "is an example of", etc.
    Return the result as a JSON array of objects. Each object should have "sourceNodeId" and "targetNodeId" fields, containing the IDs of the nodes to connect. Optionally include a "reason" field explaining the connection.
    Only suggest connections between nodes that are NOT already directly connected (i.e., targetNodeId's parent_id is not sourceNodeId). You don't have the parent information, so focus on conceptual similarity or logical flow based on content.
    Example format:
    [
      { "sourceNodeId": "node-id-1", "targetNodeId": "node-id-abc", "reason": "Both discuss X" },
      { "sourceNodeId": "another-id", "targetNodeId": "node-id-1", "reason": "Y is a prerequisite for Z" }
    ]
    Ensure the output is ONLY the JSON array, nothing else.

    Nodes:
    ${nodeContentList}`;

    const result = await model.generateContent(aiPrompt);
    const response = result.response;
    const text = response.text();

    let suggestions: ConnectionSuggestion[] = [];
    try {
      const jsonString = text
        .replace(/^```json\n/, "")
        .replace(/\n```$/, "")
        .trim();
      const parsed = JSON.parse(jsonString);
      suggestions = aiResponseSchema.parse(parsed);
    } catch (parseError) {
      console.error(
        "Failed to parse AI connection suggestions as JSON array:",
        parseError,
      );
      console.error("AI Response Text:", text);
      // Consider if this should be an error response or just empty suggestions
      return NextResponse.json<ApiResponse<unknown>>(
        {
          error: "Failed to parse AI connection suggestions.",
          status: "error",
          statusNumber: 500,
          statusText:
            parseError instanceof Error
              ? parseError.message
              : "AI response parsing failed.",
        },
        { status: 500 },
      );
    }

    const validNodeIds = new Set(nodesData.map((node) => node.id));
    const validSuggestions = suggestions.filter(
      (suggestion) =>
        validNodeIds.has(suggestion.sourceNodeId) &&
        validNodeIds.has(suggestion.targetNodeId) &&
        suggestion.sourceNodeId !== suggestion.targetNodeId,
    );

    return NextResponse.json<ApiResponse<SuggestConnectionsData>>(
      {
        data: { suggestions: validSuggestions },
        status: "success",
        statusNumber: 200,
        statusText: "Connection suggestions generated successfully.",
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error during AI connection suggestion:", error);
    return NextResponse.json<ApiResponse<unknown>>(
      {
        error: "Internal server error during AI connection suggestion.",
        status: "error",
        statusNumber: 500,
        statusText:
          error instanceof Error ? error.message : "Internal Server Error",
      },
      { status: 500 },
    );
  }
}

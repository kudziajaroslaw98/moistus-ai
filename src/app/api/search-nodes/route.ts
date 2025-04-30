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
  query: z.string().min(1, "Search query cannot be empty"),
});

interface SearchNodesData {
  relevantNodeIds: string[];
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

    const { mapId, query } = validationResult.data;

    const { data: nodesData, error: fetchError } = await supabaseServer
      .from("nodes")
      .select("id, content")
      .eq("map_id", mapId);

    if (fetchError) {
      console.error("Error fetching nodes for search:", fetchError);
      return NextResponse.json<ApiResponse<unknown>>(
        {
          error: "Error fetching map nodes for search.",
          status: "error",
          statusNumber: 500,
          statusText: fetchError.message,
        },
        { status: 500 },
      );
    }

    if (!nodesData || nodesData.length === 0) {
      return NextResponse.json<ApiResponse<SearchNodesData>>(
        {
          data: { relevantNodeIds: [] },
          status: "success",
          statusNumber: 200,
          statusText: "No nodes found in map to search.",
        },
        { status: 200 },
      );
    }

    const nodeContentList = nodesData
      .map((node) => `${node.id}: ${node.content}`)
      .join("\n");

    const aiPrompt = `Given the following list of mind map nodes (ID: Content) and a search query, identify the IDs of the nodes that are most relevant to the query.
    Return the result as a JSON array of the relevant node IDs (strings).
    Example format: ["node-id-1", "node-id-abc", "another-id"]
    Ensure the output is ONLY the JSON array, nothing else.

    Search Query: "${query}"

    Nodes:
    ${nodeContentList}`;

    const result = await model.generateContent(aiPrompt);
    const response = result.response;
    const text = response.text();

    let relevantNodeIds: string[] = [];
    try {
      const jsonString = text
        .replace(/^```json\n/, "")
        .replace(/\n```$/, "")
        .trim();
      const parsed = JSON.parse(jsonString);
      if (
        Array.isArray(parsed) &&
        parsed.every((item) => typeof item === "string")
      ) {
        relevantNodeIds = parsed;
      } else {
        console.error(
          "AI search response is not a valid JSON array of strings:",
          text,
        );
        relevantNodeIds = []; // Fallback
      }
    } catch (parseError) {
      console.error(
        "Failed to parse AI search response as JSON array:",
        parseError,
      );
      console.error("AI Response Text:", text);
      relevantNodeIds = []; // Fallback
    }

    const validNodeIdsSet = new Set(nodesData.map((node) => node.id));
    const validRelevantNodeIds = relevantNodeIds.filter((id) =>
      validNodeIdsSet.has(id),
    );

    return NextResponse.json<ApiResponse<SearchNodesData>>(
      {
        data: { relevantNodeIds: validRelevantNodeIds },
        status: "success",
        statusNumber: 200,
        statusText: "Node search completed successfully.",
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error during AI search:", error);
    return NextResponse.json<ApiResponse<unknown>>(
      {
        error: "Internal server error during AI search.",
        status: "error",
        statusNumber: 500,
        statusText:
          error instanceof Error ? error.message : "Internal Server Error",
      },
      { status: 500 },
    );
  }
}

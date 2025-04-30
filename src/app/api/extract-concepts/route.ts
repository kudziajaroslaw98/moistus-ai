import { createClient } from "@/helpers/supabase/server";
import { ApiResponse } from "@/types/api-response"; // <-- Import ApiResponse
import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { z } from "zod";

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  // Throwing an error during startup is acceptable here
  throw new Error("Missing GEMINI_API_KEY environment variable");
}

const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

const requestBodySchema = z.object({
  nodeId: z.string().uuid("Invalid node ID format"),
});

interface ExtractConceptsData {
  concepts: string[];
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
      return NextResponse.json<ApiResponse<unknown>>(
        {
          error: statusText,
          status: "error",
          statusNumber: statusNumber,
          statusText: fetchError?.message || statusText,
        },
        { status: statusNumber },
      );
    }

    const contentToAnalyze = nodeData.content;

    if (!contentToAnalyze || contentToAnalyze.trim().length === 0) {
      // Still a success, but with a specific message
      return NextResponse.json<ApiResponse<ExtractConceptsData>>(
        {
          data: { concepts: ["Node has no content to analyze."] },
          status: "success",
          statusNumber: 200,
          statusText: "Node has no content.",
        },
        { status: 200 },
      );
    }

    const aiPrompt = `Extract the key concepts, terms, or subtopics from the following text.
    Return the result as a JSON array of strings.
    Example format: ["Concept 1", "Concept 2", "Concept 3"]
    Ensure the output is ONLY the JSON array, nothing else.\n\n${contentToAnalyze}`;

    const result = await model.generateContent(aiPrompt);
    const response = result.response;
    const text = response.text();

    let concepts: string[] = [];
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
        concepts = parsed;
      } else {
        console.error(
          "AI response is not a valid JSON array of strings:",
          text,
        );
        concepts = [text.trim()]; // Fallback
      }
    } catch (parseError) {
      console.error("Failed to parse AI response as JSON array:", parseError);
      console.error("AI Response Text:", text);
      concepts = [text.trim()]; // Fallback
    }

    return NextResponse.json<ApiResponse<ExtractConceptsData>>(
      {
        data: { concepts: concepts },
        status: "success",
        statusNumber: 200,
        statusText: "Concepts extracted successfully.",
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error extracting concepts:", error);
    return NextResponse.json<ApiResponse<unknown>>(
      {
        error: "Internal server error during concept extraction.",
        status: "error",
        statusNumber: 500,
        statusText:
          error instanceof Error ? error.message : "Internal Server Error",
      },
      { status: 500 },
    );
  }
}

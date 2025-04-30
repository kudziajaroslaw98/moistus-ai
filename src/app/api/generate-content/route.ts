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
  nodeId: z.string().uuid("Invalid node ID format"),
  additionalPrompt: z.string().optional(),
});

interface GenerateContentData {
  generatedContent: string;
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

    const { nodeId, additionalPrompt } = validationResult.data;

    const { data: nodeData, error: fetchError } = await supabaseServer
      .from("nodes")
      .select("content")
      .eq("id", nodeId)
      .single();

    if (fetchError || !nodeData) {
      console.error("Error fetching node for content generation:", fetchError);
      const statusNumber = fetchError?.code === "PGRST116" ? 404 : 500;
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

    const baseContent = nodeData.content;

    if (!baseContent || baseContent.trim().length === 0) {
      return NextResponse.json<ApiResponse<GenerateContentData>>(
        {
          data: { generatedContent: "Node has no content to expand on." },
          status: "success",
          statusNumber: 200,
          statusText: "Node has no base content.",
        },
        { status: 200 },
      );
    }

    let aiPrompt = `Expand on the following topic or idea:\n\n${baseContent}`;
    if (additionalPrompt && additionalPrompt.trim().length > 0) {
      aiPrompt = `Using the following topic or idea as a base:\n\n${baseContent}\n\n${additionalPrompt.trim()}`;
    }

    const result = await model.generateContent(aiPrompt);
    const response = result.response;
    const generatedContent = response.text();

    return NextResponse.json<ApiResponse<GenerateContentData>>(
      {
        data: { generatedContent: generatedContent },
        status: "success",
        statusNumber: 200,
        statusText: "Content generated successfully.",
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error generating node content:", error);
    return NextResponse.json<ApiResponse<unknown>>(
      {
        error: "Internal server error during content generation.",
        status: "error",
        statusNumber: 500,
        statusText:
          error instanceof Error ? error.message : "Internal Server Error",
      },
      { status: 500 },
    );
  }
}
